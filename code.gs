// =============================================================================
// === CONFIGURATION (BOUND SCRIPT) ============================================
// =============================================================================

// --- Sheet Names ---
const RESPONSES_SHEET_NAME = 'Form Responses 1'; // <<< CONFIRM/EDIT This matches your Form Response sheet tab name EXACTLY
const CONFIG_SHEET_NAME = 'Config';           // <<< CONFIRM/EDIT This matches your Configuration sheet tab name EXACTLY

// --- Zelle Email Monitoring Configuration ---
// <<< --- !!! VERY IMPORTANT: SET THESE ACCURATELY !!! --- >>>
const BANK_SENDER_EMAIL = "no.reply.alerts@chase.com";        // <<< CONFIRM/EDIT Your Bank's Zelle Sender Email
const ZELLE_SUBJECT_LINE = "You received money with Zelle®"; // <<< CONFIRM/EDIT Exact Zelle Subject Line
const ZELLE_SEARCH_WINDOW_BEFORE_HOURS = 12;  // <<< How many hours BEFORE form submission to search for payment
const ZELLE_SEARCH_WINDOW_AFTER_MINUTES = 30; // <<< How many minutes AFTER form submission to search for payment
// const PROCESSED_ZELLE_LABEL = "TicketSystem-Processed"; // <<< REMOVED Label functionality

// --- Column Configuration (Verify against your 'Form Responses 1' sheet) ---
// (Assumes default Form->Sheet columns A-G, Custom columns H-L)
const COL_TIMESTAMP = 1;       // A
const COL_FULL_NAME = 2;       // B <<< CHANGED from COL_PAYER_NAME
const COL_PAYER_EMAIL = 3;     // C
// const COL_PHONE = 4;        // D (Optional - not used heavily)
const COL_NUM_TICKETS = 5;     // E
const COL_ATTENDEE_NAMES = 6;  // F - Corresponds to the question about attendee names
const COL_SCREENSHOT = 7;      // G (Link to uploaded file)
// --- Custom Columns ---
const COL_EXPECTED_AMOUNT = 8; // H
const COL_STATUS = 9;          // I
const COL_TICKET_IDS = 10;     // J
const COL_ADMIN_NOTES = 11;    // K
const COL_PROCESSED_TS = 12;   // L
const COL_GROUP_ASSIGNMENT = 13; // M - Bride/Groom group assignment

// --- Group Assignment Configuration ---
const GROUP_BRIDE = 'Bride';
const GROUP_GROOM = 'Groom';

// Config sheet cells for group counters (B1=price, B2=admin email, so using B3/B4)
const CONFIG_BRIDE_COUNT_CELL = 'B3';  // Track total Bride group assignments
const CONFIG_GROOM_COUNT_CELL = 'B4';  // Track total Groom group assignments

// --- Status Values ---
const STATUS_PENDING = 'Pending Verification';
const STATUS_APPROVED = 'Payment Approved'; // Manual approval status
const STATUS_SENT = 'Tickets Sent';
const STATUS_FLAGGED_TIMEOUT = 'Flagged - Timeout';
const STATUS_FLAGGED_AMOUNT = 'Flagged - Amount Mismatch';
const STATUS_FLAGGED_NAME = 'Flagged - Name Mismatch';
const STATUS_FLAGGED_AMBIGUOUS = 'Flagged - Ambiguous Zelle Match';
const STATUS_FLAGGED_PARSE_ERROR = 'Flagged - Zelle Email Parse Error';
const STATUS_FLAGGED_MANUAL = 'Flagged - Manual'; // Used for errors during ticket sending etc.
const STATUS_CHECKED_IN_PREFIX = 'Checked In: ';

// --- Timing Configuration ---
const PENDING_TIMEOUT_MINUTES = 30; // Timeout for flagging entries still Pending Verification
const ZELLE_CHECK_INTERVAL_MINUTES = 5; // How often the time-driven trigger runs (minimum 1)


// =============================================================================
// === CORE FUNCTIONS ==========================================================
// =============================================================================

/**
 * Wrapper function to prevent concurrent execution using LockService
 */
function withLock_(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try { return fn(); }
  finally { lock.releaseLock(); }
}

/**
 * Assigns a group (Bride or Groom) based on balanced distribution
 * Updates counters in Config sheet and returns the assigned group
 */
function assignGroup_(configSheet) {
  try {
    // Get current counts from Config sheet
    let brideCount = parseInt(configSheet.getRange(CONFIG_BRIDE_COUNT_CELL).getValue()) || 0;
    let groomCount = parseInt(configSheet.getRange(CONFIG_GROOM_COUNT_CELL).getValue()) || 0;
    
    // Assign to the group with fewer members (balanced distribution)
    let assignedGroup;
    if (brideCount <= groomCount) {
      assignedGroup = GROUP_BRIDE;
      brideCount++;
      configSheet.getRange(CONFIG_BRIDE_COUNT_CELL).setValue(brideCount);
    } else {
      assignedGroup = GROUP_GROOM;
      groomCount++;
      configSheet.getRange(CONFIG_GROOM_COUNT_CELL).setValue(groomCount);
    }
    
    Logger.log(`Assigned group: ${assignedGroup}. New counts - Bride: ${brideCount}, Groom: ${groomCount}`);
    return assignedGroup;
  } catch (error) {
    Logger.log(`ERROR in assignGroup_: ${error}`);
    return GROUP_BRIDE; // Default fallback
  }
}

/**
 * Returns group-specific email subject and message templates
 */

/**
 * [TRIGGER] Runs when the Google Form is submitted.
 * Populates sheet, calculates amount, sets initial status, sends pending email.
 */
function onFormSubmit(e) {
  return withLock_(() => {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(RESPONSES_SHEET_NAME);
    const configSheet = ss.getSheetByName(CONFIG_SHEET_NAME);
    if (!sheet || !configSheet) { Logger.log(`ERROR: Missing required sheets: '${RESPONSES_SHEET_NAME}' or '${CONFIG_SHEET_NAME}'`); return; }

    const range = e.range; const row = range.getRow(); const values = e.namedValues;
    const timestamp = values['Timestamp'] ? new Date(values['Timestamp'][0]) : new Date();
    // <<< Use "Full Name" for form lookup and variable name >>>
    const fullName = values['Full Name'] ? values['Full Name'][0].trim() : 'Unknown Name'; // Assumes form question is now "Full Name"
    const payerEmail = values['Email Address (Non-UW only)'] ? values['Email Address (Non-UW only)'][0].trim().toLowerCase() : '';
    const numTicketsStr = values['How many people are you booking for?'] ? values['How many people are you booking for?'][0] : '1';
    let numTickets = parseInt(numTicketsStr, 10);
    let adminNotes = sheet.getRange(row, COL_ADMIN_NOTES).getValue() || ''; // Preserve existing notes if any
    if (isNaN(numTickets) || numTickets < 1) {
      numTickets = 1;
      Logger.log(`Warning: Row ${row} - Invalid ticket count '${numTicketsStr}'. Defaulting to 1.`);
      adminNotes += ` Invalid ticket count ('${numTicketsStr}'). Used 1.`;
    }
    const ticketPrice = getTicketPrice(configSheet);
    const expectedAmount = numTickets * ticketPrice;
    sheet.getRange(row, COL_EXPECTED_AMOUNT).setValue(expectedAmount.toFixed(2));

      // —— ADD THIS UW‑EMAIL FILTER ——  
  if (payerEmail.endsWith('@uw.edu')) {  
    // flag the row as needing manual email correction  
    sheet.getRange(row, COL_STATUS).setValue('UW email entered');  
    sheet.getRange(row, COL_ADMIN_NOTES).setValue('Flagged: UW email entered');  
    // notify the admin  
    const adminEmail = getAdminEmail(configSheet);  
    if (adminEmail) {  
      MailApp.sendEmail(  
        adminEmail,  
        `⚠️ UW Email Used on Row ${row}`,  
        `Form row ${row} submitted with a UW address (${payerEmail}).\n` +  
        `Please update to a non‑UW email, then change status to Pending Verification.`  
      );  
    }  
    return;  
  }  
  // ——————————————————————

    //const numTicketsStr = values['How many people are you booking for?'] ? values['How many people are you booking for?'][0] : '1';

    // <<< Make sure this matches your Column F header EXACTLY! >>>
    const attendeeNamesLookupKey = 'If you are booking just for yourself, kindly enter your name. If you are booking tickets for other people as well, kindly enter their names, separated by commas.'; // Replace if your header text is different
    // <<< Default to fullName variable >>>
    const attendeeNamesStr = values[attendeeNamesLookupKey]
                           ? values[attendeeNamesLookupKey][0]
                           : fullName; // Default to the fullName if attendee list is empty/missing
    // <<< End header check >>>

    if (!payerEmail) {
        Logger.log(`ERROR: Row ${row} - Missing Email Address.`);
        sheet.getRange(row, COL_STATUS).setValue(STATUS_FLAGGED_MANUAL);
        sheet.getRange(row, COL_ADMIN_NOTES).setValue('Flagged: Missing email address.');
        return;
    }

    //let numTickets = parseInt(numTicketsStr, 10);
    //let adminNotes = sheet.getRange(row, COL_ADMIN_NOTES).getValue() || ''; // Preserve existing notes if any
    //if (isNaN(numTickets) || numTickets < 1) {
     // numTickets = 1;
     // Logger.log(`Warning: Row ${row} - Invalid ticket count '${numTicketsStr}'. Defaulting to 1.`);
     // adminNotes += ` Invalid ticket count ('${numTicketsStr}'). Used 1.`;
   // }

    // Process attendee names based on what was retrieved (or defaulted to fullName)
    let attendeeNames = attendeeNamesStr.split(',').map(name => name.trim()).filter(name => name.length > 0);
     // <<< Use fullName variable for default >>>
    if (attendeeNames.length === 0 && numTickets === 1 && fullName !== 'Unknown Name') { attendeeNames.push(fullName); }
    const namePlaceholders = [];
    while (attendeeNames.length < numTickets) {
      const guestNum = namePlaceholders.length + attendeeNames.length + 1; // Adjust guest numbering
       // <<< Use fullName variable for placeholder base >>>
      const placeholder = `${fullName} - Guest ${guestNum}`;
      attendeeNames.push(placeholder); namePlaceholders.push(placeholder);
    }
    const finalAttendeeNames = attendeeNames.slice(0, numTickets); // Ensure correct final length
    if (namePlaceholders.length > 0) { adminNotes += ` Added ${namePlaceholders.length} placeholder guests.`; Logger.log(`Warning: Row ${row} - Added placeholders.`); }
    if (attendeeNames.length > numTickets) { adminNotes += ` Trimmed excess names.`; Logger.log(`Warning: Row ${row} - Trimmed excess names.`); }

    //const ticketPrice = getTicketPrice(configSheet);
    //const expectedAmount = numTickets * ticketPrice;

    // Populate the sheet row
    sheet.getRange(row, COL_TIMESTAMP).setValue(timestamp);
    // <<< Use COL_FULL_NAME constant and fullName variable >>>
    sheet.getRange(row, COL_FULL_NAME).setValue(fullName);
    sheet.getRange(row, COL_PAYER_EMAIL).setValue(payerEmail);
    sheet.getRange(row, COL_NUM_TICKETS).setValue(numTickets);
    sheet.getRange(row, COL_ATTENDEE_NAMES).setValue(finalAttendeeNames.join(', ')); // Write potentially fixed names
    // COL_SCREENSHOT is auto-filled by form
    //sheet.getRange(row, COL_EXPECTED_AMOUNT).setValue(expectedAmount.toFixed(2));
    sheet.getRange(row, COL_STATUS).setValue(STATUS_PENDING);
    sheet.getRange(row, COL_TICKET_IDS).setValue('');
    sheet.getRange(row, COL_ADMIN_NOTES).setValue(adminNotes.trim()); // Write accumulated notes
    sheet.getRange(row, COL_PROCESSED_TS).setValue('');

    sendPendingEmail(payerEmail, fullName, numTickets, expectedAmount); // <<< Pass fullName
    Logger.log(`Processed form submission row ${row} for ${payerEmail}, Expected: $${expectedAmount.toFixed(2)}`);

  } catch (error) {
    Logger.log(`ERROR in onFormSubmit: ${error} \nEvent: ${JSON.stringify(e)} \nStack: ${error.stack}`);
    try {
        const adminEmail = getAdminEmail();
        if (adminEmail) { MailApp.sendEmail(adminEmail, 'URGENT: Script Error in onFormSubmit', `Error: ${error}\nStack: ${error.stack}`); }
    } catch (adminNotifyError) { Logger.log(`Failed to send admin error notification: ${adminNotifyError}`); }
   }
  });
}

/**
 * [Manual/Trigger] Processes rows MANUALLY marked as 'Payment Approved'.
 * Calls the helper function to generate/send tickets.
 */
function processApprovedPayments() {
   const ss = SpreadsheetApp.getActiveSpreadsheet();
   const sheet = ss.getSheetByName(RESPONSES_SHEET_NAME);
   const configSheet = ss.getSheetByName(CONFIG_SHEET_NAME);
   if (!sheet || !configSheet) { Logger.log(`ERROR: Missing required sheets.`); SpreadsheetApp.getUi()?.alert("Error: Cannot find required Sheets."); return; }

   const dataRange = sheet.getDataRange(); const values = dataRange.getValues();
   Logger.log('Starting processApprovedPayments run (checks for MANUAL Approval)...');
   let processedCount = 0; let errorCount = 0;

   for (let i = 1; i < values.length; i++) { // Start row 2 (index 1)
     const row = i + 1;
     const currentStatus = values[i][COL_STATUS - 1];
     const ticketIdsCell = values[i][COL_TICKET_IDS - 1];

     // --- Only check for STATUS_APPROVED (manual) ---
     if (currentStatus === STATUS_APPROVED && !ticketIdsCell) {
         processedCount++; // Count attempt
         Logger.log(`Found manual approval for row ${row}. Attempting ticket generation...`);
         const success = generateAndSendTickets(row); // Call the helper function
         if (!success) {
             errorCount++;
             // Error already logged by helper function, status updated to Flagged there.
         }
         Utilities.sleep(1500); // Pause between processing rows
     }
   }

   Logger.log(`processApprovedPayments finished. Attempted: ${processedCount}, Errors: ${errorCount}.`);
   // Use try-catch for UI interaction as it might fail if run automatically
   try {
        const ui = SpreadsheetApp.getUi();
        if (processedCount > 0) { ui.alert(`Manual Approval Processing Complete\n\nAttempted to send tickets for ${processedCount} entries.\nCheck sheet/logs for errors (${errorCount} encountered).`); }
        else { ui.alert('Processing Complete\n\nNo entries with status "Payment Approved" found to process.'); }
   } catch(uiError) {
        Logger.log(`Could not display UI alert in processApprovedPayments (likely run automatically): ${uiError}`);
   }
}

/**
 * [TRIGGER] Checks for 'Pending Verification' entries older than timeout. Flags them.
 */
function flagStalePendingEntries() {
   const ss = SpreadsheetApp.getActiveSpreadsheet(); const sheet = ss.getSheetByName(RESPONSES_SHEET_NAME); const configSheet = ss.getSheetByName(CONFIG_SHEET_NAME);
   if (!sheet || !configSheet) { Logger.log(`ERROR: Missing required sheets.`); return; }
   const adminEmail = getAdminEmail(configSheet); const dataRange = sheet.getDataRange(); const values = dataRange.getDisplayValues(); const rawValues = dataRange.getValues();
   const now = new Date(); const timeoutMillis = PENDING_TIMEOUT_MINUTES * 60 * 1000;
   Logger.log('Starting flagStalePendingEntries run...'); let flaggedCount = 0;
   for (let i = 1; i < rawValues.length; i++) { // Iterate based on rawValues length
     const row = i + 1; const currentStatus = (values[i] && values[i][COL_STATUS - 1]) ? values[i][COL_STATUS - 1] : ''; const timestampVal = rawValues[i][COL_TIMESTAMP - 1];
     if (currentStatus === STATUS_PENDING) {
       try {
         if (timestampVal instanceof Date && !isNaN(timestampVal.getTime())) {
           const submissionTime = timestampVal;
           // Check if it's past the PENDING timeout (different from Zelle search window)
           if (now.getTime() - submissionTime.getTime() > timeoutMillis) {
             sheet.getRange(row, COL_STATUS).setValue(STATUS_FLAGGED_TIMEOUT); const note = `Auto-flagged: No approval >${PENDING_TIMEOUT_MINUTES}min past submission (${submissionTime.toLocaleString()}).`;
             sheet.getRange(row, COL_ADMIN_NOTES).setValue(note); flaggedCount++; Logger.log(`Flagged timeout row ${row}.`);
             const payerEmailForRow = (values[i] && values[i][COL_PAYER_EMAIL - 1]) ? values[i][COL_PAYER_EMAIL - 1] : 'Unknown Email';
             if (adminEmail) { MailApp.sendEmail(adminEmail, `Flagged Timeout Entry - ${payerEmailForRow}`, `Row ${row} auto-flagged. Review.`); Utilities.sleep(500); }
           }
         } else { Logger.log(`Warning: Invalid timestamp row ${row}. Value: ${timestampVal}`); }
       } catch (error) { Logger.log(`Error checking timeout row ${row}: ${error}`); }
     }
   }
   Logger.log(`flagStalePendingEntries finished. Flagged ${flaggedCount}.`);
}

/**
 * [TRIGGER] Checks Zelle emails against pending entries, including emails received BEFORE submission.
 * If unique match found, calls helper to generate/send tickets immediately. NO Gmail Labeling.
 */
function checkZelleEmailsAndVerify() {
  // <<< NO LABELING version >>>
  Logger.log("Starting checkZelleEmailsAndVerify run (No Labeling)...");
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(RESPONSES_SHEET_NAME);
  const configSheet = ss.getSheetByName(CONFIG_SHEET_NAME);
  if (!sheet || !configSheet) { Logger.log(`ERROR: Missing required sheets.`); return; }

  const adminEmail = getAdminEmail(configSheet);

  // --- Collect Pending Entries ---
  const dataRange = sheet.getDataRange();
  const allValues = dataRange.getValues();
  const pendingEntries = [];
  Logger.log("Scanning sheet for pending entries...");
  for (let i = 1; i < allValues.length; i++) { // Start from 1 to skip header
    if (allValues[i][COL_STATUS - 1] === STATUS_PENDING) {
      const timestampVal = allValues[i][COL_TIMESTAMP - 1];
      const submissionTimestamp = (timestampVal instanceof Date && !isNaN(timestampVal.getTime())) ? timestampVal : null;
      if (!submissionTimestamp) {
          Logger.log(`Warning: Row ${i+1} is Pending but has invalid timestamp. Skipping.`);
          continue;
      }
      pendingEntries.push({
        row: i + 1,
        timestamp: submissionTimestamp,
        // <<< Read from COL_FULL_NAME, store as fullName >>>
        fullName: (allValues[i][COL_FULL_NAME - 1] || '').toLowerCase().trim(),
        payerEmail: (allValues[i][COL_PAYER_EMAIL - 1] || '').toLowerCase().trim(),
        expectedAmount: parseFloat(allValues[i][COL_EXPECTED_AMOUNT - 1] || 0),
        processedThisRun: false
      });
    }
  }

  if (pendingEntries.length === 0) {
    Logger.log("No pending entries found. Exiting Zelle check.");
    return;
  }
  Logger.log(`Found ${pendingEntries.length} pending entries to check.`);

  let processedEmailCount = 0;
  let ticketsSentCount = 0;

  // --- Iterate through each Pending Entry and Search for Matching Emails ---
  pendingEntries.forEach(entry => {
    if (entry.processedThisRun) return;

    const searchStartTime = new Date(entry.timestamp.getTime() - (ZELLE_SEARCH_WINDOW_BEFORE_HOURS * 60 * 60 * 1000));
    const searchEndTime = new Date(entry.timestamp.getTime() + (ZELLE_SEARCH_WINDOW_AFTER_MINUTES * 60 * 1000));
    const searchStartStr = Utilities.formatDate(searchStartTime, Session.getScriptTimeZone(), "yyyy/MM/dd");
    const dayAfterSearchEndTime = new Date(searchEndTime.getTime() + (24 * 60 * 60 * 1000));
    const searchEndStr = Utilities.formatDate(dayAfterSearchEndTime, Session.getScriptTimeZone(), "yyyy/MM/dd");

    const searchQuery = `from:(${BANK_SENDER_EMAIL}) subject:("${ZELLE_SUBJECT_LINE}") after:${searchStartStr} before:${searchEndStr}`;
    Logger.log(`Searching for entry Row ${entry.row} (Submitted: ${entry.timestamp.toLocaleString()}): Query: ${searchQuery}`);

    let threads;
    try {
      threads = GmailApp.search(searchQuery, 0, 25);
    } catch (e) {
      Logger.log(`ERROR searching Gmail for row ${entry.row}: ${e}`);
      if (adminEmail) MailApp.sendEmail(adminEmail, "Script Error - Gmail Search", `Failed Gmail search for row ${entry.row}: ${e}`);
      return;
    }

    if (!threads || threads.length === 0) {
      return;
    }

    Logger.log(`Found ${threads.length} potential email thread(s) for row ${entry.row}. Evaluating emails within...`);
    let potentialMatchesForThisEntry = [];

    threads.forEach(thread => {
      const messages = thread.getMessages();
      messages.forEach(message => {
            const emailDate = message.getDate();
            if (emailDate.getTime() < searchStartTime.getTime() || emailDate.getTime() > searchEndTime.getTime()) {
                return;
            }

            const emailSubject = message.getSubject();
            if (emailSubject !== ZELLE_SUBJECT_LINE) {
                return;
            }

            let emailBody;
            try {
                emailBody = message.getPlainBody();
                const nameMatch = emailBody.match(/^(.+?)\s+sent you money/im);
                const amountMatch = emailBody.match(/^Amount\s+\$?([\d,]+\.\d{2})/im);

                if (!amountMatch || !nameMatch) {
                    return;
                }

                const paymentAmount = parseFloat(amountMatch[1].replace(/,/g, ''));
                const zelleSenderName = nameMatch[1].trim().toLowerCase();

                if (isNaN(paymentAmount) || !zelleSenderName) {
                    Logger.log(`Invalid parsed values msg. Amt: ${paymentAmount}, Name: '${zelleSenderName}'. Subj: ${emailSubject}. Skip msg.`);
                    return;
                }
                Logger.log(`Parsed msg (Subj: ${emailSubject}, Date: ${emailDate.toLocaleString()}): Amount=$${paymentAmount.toFixed(2)}, Sender='${zelleSenderName}'`);

                if (Math.abs(paymentAmount - entry.expectedAmount) <= 0.01) {
                  // <<< Use entry.fullName for matching >>>
                  const formFirstName = entry.fullName.split(' ')[0];
                  const zelleFirstName = zelleSenderName.split(' ')[0];
                  if (entry.fullName.includes(zelleSenderName) || zelleSenderName.includes(entry.fullName) || formFirstName === zelleFirstName) {
                      Logger.log(`Potential match: Email (Sender: ${nameMatch[1].trim()}, Amt: $${paymentAmount.toFixed(2)}, Date: ${emailDate.toLocaleString()}) matches Row ${entry.row} criteria.`);
                      potentialMatchesForThisEntry.push({
                          entry: entry,
                          message: message,
                          emailSender: nameMatch[1].trim(),
                          emailAmount: paymentAmount,
                          emailDate: emailDate
                      });
                  } else {
                      // <<< Log using entry.fullName >>>
                      Logger.log(`Amt match row ${entry.row}, but name mismatch ('${entry.fullName}' vs '${zelleSenderName}')`);
                  }
                }
            } catch (parseError) {
                Logger.log(`ERROR parsing/matching message (Subj: ${emailSubject}, Date: ${emailDate.toLocaleString()}) for row ${entry.row}: ${parseError}`);
            }
      }); // End forEach message
    }); // End forEach thread

    // --- Process potential matches found for THIS entry ---
    if (potentialMatchesForThisEntry.length === 1) {
      const uniqueMatch = potentialMatchesForThisEntry[0];
      Logger.log(`Unique Zelle match found for row ${uniqueMatch.entry.row}. Checking sheet status again...`);
      processedEmailCount++;

      const currentRowStatus = sheet.getRange(uniqueMatch.entry.row, COL_STATUS).getValue();
      if (currentRowStatus !== STATUS_PENDING) {
          Logger.log(`Skipping ticket generation for row ${uniqueMatch.entry.row}. Status is no longer '${STATUS_PENDING}', it is '${currentRowStatus}'.`);
          uniqueMatch.entry.processedThisRun = true;
          return;
      }

      Logger.log(`Status confirmed Pending. Attempting ticket generation for row ${uniqueMatch.entry.row}...`);
      const success = generateAndSendTickets(uniqueMatch.entry.row);

      if (success) {
        Logger.log(`Tickets sent successfully for row ${uniqueMatch.entry.row}.`);
        uniqueMatch.entry.processedThisRun = true;
        ticketsSentCount++;
        // Optional: Mark message read here if desired, but no label
      } else {
        Logger.log(`Ticket generation/sending failed for row ${uniqueMatch.entry.row}.`);
        uniqueMatch.entry.processedThisRun = true;
      }

    } else if (potentialMatchesForThisEntry.length > 1) {
      const matchedEmailsInfo = potentialMatchesForThisEntry.map(m => `Sender: ${m.emailSender}, Amt: $${m.emailAmount.toFixed(2)}, Date: ${m.emailDate.toLocaleString()}`).join('; ');
      Logger.log(`Ambiguous match: Multiple emails (${potentialMatchesForThisEntry.length}) found potentially matching Row ${entry.row}. Emails: ${matchedEmailsInfo}. Flagging row.`);
      const note = `Flagged: Ambiguous Zelle match. Multiple possible emails found. Manual review required. Potential emails: ${matchedEmailsInfo}`;
      sheet.getRange(entry.row, COL_STATUS).setValue(STATUS_FLAGGED_AMBIGUOUS);
      sheet.getRange(entry.row, COL_ADMIN_NOTES).setValue(note);
      entry.processedThisRun = true;
      if(adminEmail) { MailApp.sendEmail(adminEmail, `Ambiguous Zelle Match - Row ${entry.row}`, `Multiple emails potentially match Row ${entry.row}. Review manually. Emails: ${matchedEmailsInfo}`); }

    } else {
      Logger.log(`No suitable Zelle emails found for row ${entry.row}.`);
    }

    Utilities.sleep(300);

  }); // End forEach pending entry

  Logger.log(`checkZelleEmailsAndVerify finished (No Labeling). Emails processed: ${processedEmailCount}. Tickets sent via Zelle auto-verify: ${ticketsSentCount}.`);
}


// =============================================================================
// === HELPER FUNCTIONS ========================================================
// =============================================================================

/**
 * [HELPER] Generates unique IDs, QR codes, sends ticket email for a specific row.
 * Updates sheet status based on success/failure.
 * @param {number} rowNumber The 1-based row index in the response sheet.
 * @return {boolean} True if tickets were sent successfully, False otherwise.
 */
function generateAndSendTickets(rowNumber) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(RESPONSES_SHEET_NAME);
  const configSheet = ss.getSheetByName(CONFIG_SHEET_NAME);
  const adminEmail = getAdminEmail(configSheet);

  Logger.log(`Starting ticket generation for row ${rowNumber}...`);

  try {
    const rowData = sheet.getRange(rowNumber, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    // Processed guard: Check if tickets already generated
    const currentTicketIds = rowData[COL_TICKET_IDS - 1];
    if (currentTicketIds && currentTicketIds.toString().trim()) {
      Logger.log(`Row ${rowNumber} already has ticket IDs: ${currentTicketIds}. Skipping.`);
      return true; // Already processed
    }
    
    // Assign group (Bride/Groom) with balanced distribution - ONLY AFTER payment verification
    const assignedGroup = assignGroup_(configSheet);
    
    const payerEmail = rowData[COL_PAYER_EMAIL - 1];
     // <<< Read from COL_FULL_NAME, use fullName variable >>>
    const fullName = rowData[COL_FULL_NAME - 1];
    const numTickets = parseInt(rowData[COL_NUM_TICKETS - 1], 10);
    const attendeeNamesStr = rowData[COL_ATTENDEE_NAMES - 1];
    const attendeeNames = attendeeNamesStr.split(',').map(n => n.trim()).filter(n => n);

    // <<< Check fullName variable >>>
    if (!payerEmail || !fullName || isNaN(numTickets) || numTickets < 1 || attendeeNames.length !== numTickets) {
        throw new Error(`Data inconsistency found. Email: ${payerEmail}, Full Name: ${fullName}, Tickets: ${numTickets}, Attendee Names: ${attendeeNames.length}`);
    }

    Logger.log(`Data loaded for row ${rowNumber}. Generating ${numTickets} tickets for ${payerEmail} (${fullName}).`); // <<< Log fullName

    const uniqueTicketIds = [];
    const qrCodeUrls = [];
    // <<< Update Ticket ID Prefix >>>
    const baseId = `SHAADI${rowNumber}${Date.now().toString().slice(-5)}`; // Unique base ID

    for (let j = 0; j < numTickets; j++) {
      const ticketId = `${baseId}-${j + 1}`;
      uniqueTicketIds.push(ticketId);
      qrCodeUrls.push(generateQrCodeUrl(ticketId)); // <<< Calls the function below
    }

    // <<< Pass fullName and assignedGroup to sendTicketEmail >>>
    sendTicketEmail(payerEmail, fullName, attendeeNames, qrCodeUrls, uniqueTicketIds, assignedGroup);

    // --- Update sheet on SUCCESS ---
    const now = new Date();
    sheet.getRange(rowNumber, COL_TICKET_IDS).setValue(uniqueTicketIds.join(', '));
    sheet.getRange(rowNumber, COL_STATUS).setValue(STATUS_SENT);
    sheet.getRange(rowNumber, COL_PROCESSED_TS).setValue(now);
    sheet.getRange(rowNumber, COL_GROUP_ASSIGNMENT).setValue(assignedGroup);
    let currentNotes = sheet.getRange(rowNumber, COL_ADMIN_NOTES).getValue() || '';
    let newNote = `Tickets sent ${now.toLocaleString()}. Assigned to ${assignedGroup} group.`;
    sheet.getRange(rowNumber, COL_ADMIN_NOTES).setValue(`${currentNotes} ${newNote}`.trim());


    Logger.log(`Tickets successfully generated and sent for row ${rowNumber}.`);
    return true; // Indicate success

  } catch (error) {
    // --- Update sheet on FAILURE ---
    Logger.log(`ERROR in generateAndSendTickets for row ${rowNumber}: ${error}\nStack: ${error.stack}`);
    try {
        sheet.getRange(rowNumber, COL_STATUS).setValue(STATUS_FLAGGED_MANUAL);
        let currentNotes = sheet.getRange(rowNumber, COL_ADMIN_NOTES).getValue() || '';
        sheet.getRange(rowNumber, COL_ADMIN_NOTES).setValue(`${currentNotes} Ticket Send Error: ${error}`.trim());
        if (adminEmail) { MailApp.sendEmail(adminEmail, `URGENT: Ticket Send Failure (Row ${rowNumber})`, `Failed to generate/send tickets for ${sheet.getRange(rowNumber, COL_PAYER_EMAIL).getValue()} (Row ${rowNumber}). Error: ${error}. Please review manually.`); }
    } catch (sheetError) {
        Logger.log(`CRITICAL: Failed to even update sheet status after error for row ${rowNumber}: ${sheetError}`);
    }
    return false; // Indicate failure
  }
}

/** Gets ticket price from Config sheet */
function getTicketPrice(configSheet) {
  try {
    if (!configSheet) configSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG_SHEET_NAME);
    if (!configSheet) throw new Error(`Sheet "${CONFIG_SHEET_NAME}" not found.`);
    const price = parseFloat(configSheet.getRange('B1').getValue());
    if (isNaN(price) || price < 0) { Logger.log(`Warning: Invalid price in ${CONFIG_SHEET_NAME}!B1. Using 0.`); return 0; }
    return price;
  } catch (error) { Logger.log(`ERROR getting ticket price: ${error}. Using 0.`); return 0; }
}

/** Gets admin email from Config sheet */
function getAdminEmail(configSheet) {
  try {
    if (!configSheet) configSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG_SHEET_NAME);
    if (!configSheet) throw new Error(`Sheet "${CONFIG_SHEET_NAME}" not found.`);
    const email = configSheet.getRange('B2').getValue().toString().trim();
    if (!email || !/\S+@\S+\.\S+/.test(email)) { Logger.log(`Warning: Invalid admin email in ${CONFIG_SHEET_NAME}!B2.`); return null; }
    return email;
  } catch (error) { Logger.log(`ERROR getting admin email: ${error}.`); return null; }
}

/** Generates QR Code URL using qrserver.com API <<<--- MODIFIED */
function generateQrCodeUrl(data) {
  // Documentation: http://goqr.me/api/doc/create-qr-code/
  const encodedData = encodeURIComponent(data);
  // Use qrserver.com API - adjust size (e.g., size=200x200) and error correction (e.g., ecc=M) as needed
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodedData}&ecc=M`; // <<<--- THIS LINE USES QRSERVER.COM
}

/** Sends initial "pending verification" email */
// <<< Rename parameter from name to fullName >>>
function sendPendingEmail(toEmail, fullName, numTickets, expectedAmount) {
  if (!toEmail) { Logger.log("ERROR: Cannot send pending email - 'toEmail' is empty."); return; }
  
  const subject = '💍 Your Fake Shaadi Ticket Request is In!';
  
  const body = `Hi ${fullName},

Thank you for requesting ${numTickets} ticket(s) for Lumina's Big Fake Shaadi! 🎉

Expected payment: $${expectedAmount.toFixed(2)}.

We'll verify your payment and send you another email with your QR code ticket(s). That's your golden invite to the wedding dance floor. 💃🕺

If you haven't sent the payment yet, here's how:
Zelle: +1 912 (777)-0981
Amount: $${expectedAmount.toFixed(2)}

✨ Pro tip: Please include your email (${toEmail}) in the payment memo if possible, so we can match it quickly!

Got questions? Contact us at luminaexperiences@gmail.com or @lumina.wa.

Can't wait to see you at the "wedding" — no vows, no in-laws, just nonstop color, chaos, and dance floor magic. 🥳

Cheers,
Lumina 💛`;

  try { MailApp.sendEmail(toEmail, subject, body); Logger.log(`Pending email sent to ${toEmail}`); }
  catch (error) { Logger.log(`ERROR sending pending email to ${toEmail}: ${error}`); const admin = getAdminEmail(); if(admin) MailApp.sendEmail(admin, 'Error Sending Pending Email', `Failed for ${toEmail}: ${error}`);}
}

/** Sends final ticket email with QR codes (HTML) using GmailApp */
function sendTicketEmail(toEmail, fullName, attendeeNames, qrCodeUrls, uniqueTicketIds, assignedGroup) {
   if (!toEmail) { Logger.log("ERROR: Cannot send ticket email - 'toEmail' is empty."); throw new Error("Missing recipient email."); }
   if (!(attendeeNames.length === qrCodeUrls.length && attendeeNames.length === uniqueTicketIds.length && attendeeNames.length > 0)) {
       Logger.log(`ERROR: Ticket data mismatch for ${toEmail}. Names:${attendeeNames.length}, URLs:${qrCodeUrls.length}, IDs:${uniqueTicketIds.length}.`);
       const admin = getAdminEmail(); if (admin) GmailApp.sendEmail(admin, 'CRITICAL ERROR Sending Tickets', '', { htmlBody: `Data mismatch for ${toEmail}. Email NOT sent.` });
       throw new Error(`Data mismatch prevented sending tickets to ${toEmail}.`);
   }
   
   const subject = '🎊 Your Ticket to Lumina\'s Big Fake Shaadi is Confirmed!';
   
   // Determine side and dress code based on group
   const side = assignedGroup === GROUP_BRIDE ? "Bride's Side" : "Groom's Side";
   const dressCode = assignedGroup === GROUP_BRIDE ? "Warm tones" : "Cool tones";
   
   let htmlBody = `
<html><head><style> 
body { font-family: sans-serif; line-height: 1.5; } 
.ticket { border: 1px solid #ccc; padding: 15px; margin-bottom: 20px; page-break-inside: avoid; background-color: #f9f9f9; border-radius: 8px; } 
.ticket h3 { margin-top: 0; color: #333; } 
.ticket p { margin-bottom: 10px; } 
.qr-code { display: block; margin-top: 10px; } 
hr { border: 0; border-top: 1px solid #eee; margin: 20px 0; } 
</style></head><body>

<p>Hi ${fullName},</p>

<p>Great news — your payment has been confirmed! ✅ Please find your ${attendeeNames.length} ticket(s) for Lumina's Big Fake Shaadi below.</p>

<p><strong>Important:</strong> Each QR code below represents one entry. Please have them ready for scanning at the door on your phone, along with a valid ID (we accept Husky Cards too 🎓).</p>

<p>Got questions? Contact us at luminaexperiences@gmail.com or @lumina.wa.</p>

<hr>`;

  for (let i = 0; i < attendeeNames.length; i++) {
    const attendeeName = attendeeNames[i] || `Guest ${i + 1}`;
    const ticketId = uniqueTicketIds[i] || 'N/A';
    const qrUrl = qrCodeUrls[i];
    
    htmlBody += `
<div class="ticket">
<h3>Ticket for: ${attendeeName}</h3>
<p>Ticket ID: <strong>${ticketId}</strong></p>
<p>Side: <strong>${side}</strong></p>
<p>Dress Code: <strong>${dressCode}</strong> ✨</p>
<p>Scan this QR code at the entrance:</p>
<img src="${qrUrl}" alt="QR Code for ${attendeeName}" class="qr-code" style="width:180px; height:180px;">
</div>`;
  }

  htmlBody += `
<hr>
<p><strong>Event Details Recap:</strong></p>
<p>💍 Event: Lumina's Big Fake Shaadi<br>
📅 Date: October 4th, 2025<br>
🕚 Time: 8:30 PM onwards<br>
🚪 Doors Close: 9:15 PM<br>
📍 Venue: Walker Ames Room, Kane Hall, U District<br>
Don't forget to bring a valid photo ID!</p>

<p>Shaadi mein zaroor aana. 🪩 No vows, no rules — just music, masti, and memories you'll talk about for years.</p>

<p>See you on the "wedding" dance floor!</p>

<p>Cheers,<br>Lumina 💛</p>

</body></html>`;

  try {
    GmailApp.sendEmail(toEmail, subject, '', { htmlBody: htmlBody });
    Logger.log(`Ticket email sent to ${toEmail} via GmailApp with ${attendeeNames.length} tickets.`);
   }
  catch (error) {
    Logger.log(`ERROR sending ticket email via GmailApp to ${toEmail}: ${error}`);
    throw new Error(`Failed ticket email via GmailApp: ${error.message}`);
  }
}


// =============================================================================
// === ADMIN UI & WEB APP (SCANNER) ============================================
// =============================================================================

/** [UI] Creates the 'Ticketing Actions' menu in the Sheet */
function onOpen() {
  SpreadsheetApp.getUi()
      .createMenu('Ticketing Actions')
      .addItem('Process MANUALLY Approved Payments', 'processApprovedPayments')
      .addSeparator()
      .addItem('Check Zelle Emails Now', 'checkZelleEmailsAndVerify')
      .addItem('Flag Stale Pending Entries Now', 'flagStalePendingEntries')
      .addSeparator()
      .addItem('Open Check-In Scanner Link', 'openScannerWebapp')
      .addToUi();
}

/** [UI] Shows a dialog with the link to the deployed scanner Web App */
function openScannerWebapp() {
  try {
        const webAppUrl = ScriptApp.getService().getUrl();
        if (!webAppUrl) { SpreadsheetApp.getUi().alert('Scanner Not Deployed Yet', 'Please deploy this script as a Web App first (Deploy > New deployment...).', SpreadsheetApp.getUi().ButtonSet.OK); return; }
        // <<< Update Link Text in HTML Dialog >>>
        const html = HtmlService.createHtmlOutput(`<p>Click link to open scanner:</p><p><a href="${webAppUrl}" target="_blank" rel="noopener noreferrer">Open Khalbali Ticket Scanner</a></p><p><small>Allow camera permissions.</small></p><input type="text" value="${webAppUrl}" readonly style="width: 90%; margin-top: 10px;" onclick="this.select();">`).setWidth(450).setHeight(200);
        // <<< Update Dialog Title >>>
        SpreadsheetApp.getUi().showModalDialog(html, 'Khalbali Scanner Link');
    } catch (error) { Logger.log(`Error getting web app URL: ${error}`); SpreadsheetApp.getUi().alert(`Error: Could not get Scanner URL. (${error.message})`); }
}

/** [WEB APP] Serves the HTML for the Scanner Web App */
function doGet(e) {
  Logger.log(`Web App GET: ${JSON.stringify(e.parameter)}`);
  try {
      // <<< Update HTML Title >>>
      return HtmlService.createHtmlOutputFromFile('Scanner.html') // Assumes Scanner.html file exists
          .setTitle('Khalbali Ticket Scanner - UW Lumina')
          .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  } catch (htmlError){
      Logger.log(`ERROR serving Scanner.html: ${htmlError}`);
      return HtmlService.createHtmlOutput("<p>Error loading scanner interface. Please check script logs.</p>");
  }
}

/**
 * Helper function to find recent duplicate submissions within a time window
 */
function findRecentDuplicate_(sheet, payerEmail, expectedAmount, minutes=5) {
  const now = new Date();
  const values = sheet.getDataRange().getValues();
  for (let i = values.length - 1; i >= 1; i--) {
    const ts = values[i][COL_TIMESTAMP-1];
    const email = (values[i][COL_PAYER_EMAIL-1] || '').toLowerCase().trim();
    const amt = parseFloat(values[i][COL_EXPECTED_AMOUNT-1] || 0);
    const status = values[i][COL_STATUS-1];
    if (ts instanceof Date && email === payerEmail && Math.abs(amt-expectedAmount) < 0.01) {
      const ageMin = (now - ts) / 60000;
      if (ageMin <= minutes && (status === STATUS_PENDING || status === 'UW email entered')) {
        return i + 1; // row number
      }
    }
  }
  return null;
}

/** [WEB APP] Receives JSON submissions from the Next.js site */
function doPost(e) {
  return withLock_(() => {
  try {
    // Security: validate API key if configured in Script Properties (name: API_KEY)
    try {
      const props = PropertiesService.getScriptProperties();
      const expectedKey = props ? props.getProperty('API_KEY') : null;
      const providedKey = (e && e.parameter && e.parameter.key) ? String(e.parameter.key) : '';
      if (expectedKey && expectedKey !== providedKey) {
        return ContentService.createTextOutput(JSON.stringify({ ok: false, error: 'Unauthorized' })).setMimeType(ContentService.MimeType.JSON);
      }
    } catch (secErr) {
      Logger.log(`Security check error: ${secErr}`);
    }

    const raw = e && e.postData && e.postData.contents ? e.postData.contents : '{}';
    const data = JSON.parse(raw);

    let fullName = (data.fullName || '').toString().trim();
    const payerEmail = (data.payerEmail || '').toString().trim().toLowerCase();
    let numTickets = parseInt(data.numTickets, 10);
    if (isNaN(numTickets) || numTickets < 1) numTickets = 1;
    const attendeeNamesInput = Array.isArray(data.attendeeNames) ? data.attendeeNames.map(String) : [];

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(RESPONSES_SHEET_NAME);
    const configSheet = ss.getSheetByName(CONFIG_SHEET_NAME);
    if (!sheet || !configSheet) {
      return ContentService.createTextOutput(JSON.stringify({ ok: false, error: 'Missing required sheets' })).setMimeType(ContentService.MimeType.JSON);
    }

    // Validate required fields
    if (!fullName || !payerEmail) {
      return ContentService.createTextOutput(JSON.stringify({ ok: false, error: 'Missing fullName or payerEmail' })).setMimeType(ContentService.MimeType.JSON);
    }

    // Reject UW domain emails (mirrors onFormSubmit and frontend)
    if (payerEmail.endsWith('@uw.edu')) {
      return ContentService.createTextOutput(JSON.stringify({ ok: false, error: 'UW email addresses are not allowed. Please use a non-UW email.' })).setMimeType(ContentService.MimeType.JSON);
    }

    const ticketPrice = getTicketPrice(configSheet);
    const expectedAmount = numTickets * ticketPrice;

    // Build attendee list and placeholders similar to onFormSubmit
    let attendees = attendeeNamesInput.map((n) => n.trim()).filter((n) => n.length > 0);
    if (attendees.length === 0 && numTickets === 1 && fullName !== 'Unknown Name') {
      attendees.push(fullName);
    }
    const namePlaceholders = [];
    while (attendees.length < numTickets) {
      const guestNum = namePlaceholders.length + attendees.length + 1;
      const placeholder = `${fullName} - Guest ${guestNum}`;
      attendees.push(placeholder);
      namePlaceholders.push(placeholder);
    }
    const finalAttendeeNames = attendees.slice(0, numTickets);

    // Check for recent duplicates (5-minute window)
    const dupRow = findRecentDuplicate_(sheet, payerEmail, expectedAmount, 5);
    if (dupRow) {
      // Update existing row instead of creating new one
      sheet.getRange(dupRow, COL_NUM_TICKETS).setValue(numTickets);
      sheet.getRange(dupRow, COL_ATTENDEE_NAMES).setValue(finalAttendeeNames.join(', '));
      Logger.log(`Duplicate detected: Updated existing row ${dupRow} for ${payerEmail}`);
      return ContentService
        .createTextOutput(JSON.stringify({ ok: true, expectedAmount, dedupedRow: dupRow }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Append a new row at the bottom; assume Form default columns A-G, custom H-L
    const timestamp = new Date();
    const newRow = [
      timestamp,                 // A Timestamp
      fullName,                  // B Full Name
      payerEmail,                // C Payer Email
      '',                        // D (Phone optional / not used)
      numTickets,                // E Num Tickets
      finalAttendeeNames.join(', '), // F Attendee Names
      '',                        // G Screenshot (left empty)
      expectedAmount.toFixed(2), // H Expected Amount
      STATUS_PENDING,            // I Status
      '',                        // J Ticket IDs
      (namePlaceholders.length > 0 ? `Added ${namePlaceholders.length} placeholder guests.` : '').trim(), // K Admin Notes
      ''                         // L Processed TS
    ];

    sheet.appendRow(newRow);

    // Send pending email
    try { sendPendingEmail(payerEmail, fullName, numTickets, expectedAmount); } catch (mailErr) { Logger.log(`Pending email send error: ${mailErr}`); }

    return ContentService.createTextOutput(JSON.stringify({ ok: true, expectedAmount })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    const message = (err && err.message) ? err.message : String(err);
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: message })).setMimeType(ContentService.MimeType.JSON);
  }
  });
}

/** [WEB APP] Called by the scanner to check in an attendee */
function checkInAttendee(scannedId) {
   if (!scannedId || typeof scannedId !== 'string' || scannedId.trim() === '') { return { status: 'error', message: 'Invalid Scanned ID.' }; }
   scannedId = scannedId.trim(); Logger.log(`Check-in attempt: "${scannedId}"`);
   try {
     const ss = SpreadsheetApp.getActiveSpreadsheet(); const sheet = ss.getSheetByName(RESPONSES_SHEET_NAME);
     if (!sheet) { return { status: 'error', message: `Server Error: Sheet not found.` }; }
     const dataRange = sheet.getDataRange(); const values = dataRange.getValues(); const now = new Date(); const checkInTimestamp = now.toLocaleString();
     for (let i = 1; i < values.length; i++) { // Iterate rows
       const row = i + 1; const ticketIdsStr = values[i][COL_TICKET_IDS - 1]; const currentStatus = values[i][COL_STATUS - 1];
       if (ticketIdsStr && typeof ticketIdsStr === 'string' && ticketIdsStr.includes(scannedId)) {
           const ticketIds = ticketIdsStr.split(',').map(id => id.trim());
           const ticketIndex = ticketIds.indexOf(scannedId);
           if (ticketIndex === -1) continue;

           const attendeeNames = (values[i][COL_ATTENDEE_NAMES - 1] || '').split(',').map(n => n.trim());
           const attendeeName = (attendeeNames[ticketIndex]) ? attendeeNames[ticketIndex] : `Guest (Row ${row})`;

           if (currentStatus !== STATUS_SENT && !currentStatus.startsWith(STATUS_CHECKED_IN_PREFIX)) { return { status: 'invalid_status', message: `❌ Invalid Status: ${attendeeName}'s ticket is '${currentStatus}'.` }; }

           const adminNotes = values[i][COL_ADMIN_NOTES - 1] || ''; const checkInMarker = `Checked In: ${scannedId}`;
           if (adminNotes.includes(checkInMarker)) { const timeMatch = adminNotes.match(new RegExp(checkInMarker + ".*? at (.*?)\\.")); const timeInfo = timeMatch ? ` at ${timeMatch[1]}` : ''; return { status: 'already_checked_in', message: `⚠️ Already In: ${attendeeName} scanned${timeInfo}.` }; }

           const newNote = `${adminNotes} ${checkInMarker} (${attendeeName}) at ${checkInTimestamp}.`.trim(); sheet.getRange(row, COL_ADMIN_NOTES).setValue(newNote); sheet.getRange(row, COL_STATUS).setValue(`${STATUS_CHECKED_IN_PREFIX}${attendeeName}`);
           Logger.log(`Check-in SUCCESS: ${scannedId} (${attendeeName}, Row ${row})`); return { status: 'success', message: `✅ Success: Checked in ${attendeeName} at ${checkInTimestamp}` };
       }
     } // End row loop

     Logger.log(`Check-in FAIL: "${scannedId}" not found.`); return { status: 'not_found', message: `❌ Not Found: ID "${scannedId}" not found.` };
   } catch (error) { Logger.log(`CRITICAL checkInAttendee error: ${error}\nStack: ${error.stack}`); return { status: 'error', message: `Server Error: Check-in failed. (${error.message})` }; }
}

// =============================================================================
// === SETUP (Run Once) ========================================================
// =============================================================================

/**
 * [Manual] Sets up/Resets triggers: onFormSubmit, flagStalePending, checkZelleEmails.
 * Run this manually ONCE from the script editor after saving changes.
 */
function setupTriggers() {
  // Delete existing triggers first
  const currentTriggers = ScriptApp.getProjectTriggers();
  let deletedCount = 0;
  Logger.log(`Found ${currentTriggers.length} existing triggers. Deleting relevant ones...`);
  for (const trigger of currentTriggers) {
    const funcName = trigger.getHandlerFunction();
    const managedFunctions = ['onFormSubmit', 'flagStalePendingEntries', 'processApprovedPayments', 'checkZelleEmailsAndVerify'];
    if (managedFunctions.includes(funcName)) {
      try { ScriptApp.deleteTrigger(trigger); deletedCount++; Logger.log(`Deleted trigger for ${funcName}.`); }
      catch (err) { Logger.log(`Could not delete trigger ${funcName}: ${err}`); }
    }
  }
   Logger.log(`Deleted ${deletedCount} old trigger(s). Creating new ones...`);

  let errorOccurred = false;
  // NOTE: onFormSubmit uses simple trigger (function name), no installable trigger needed

  // Create Stale Check Trigger
  try {
       ScriptApp.newTrigger('flagStalePendingEntries')
         .timeBased()
         .everyMinutes(30) // Check every 30 minutes
         .create();
       Logger.log(`✅ flagStalePendingEntries trigger created (every 30 mins).`);
   } catch (e) {
       Logger.log(`❌ ERROR creating flagStalePendingEntries trigger: ${e}`);
       errorOccurred = true;
   }

  // Create Zelle Check Trigger (uses checkZelleEmailsAndVerify)
  try { ScriptApp.newTrigger('checkZelleEmailsAndVerify').timeBased().everyMinutes(ZELLE_CHECK_INTERVAL_MINUTES).create(); Logger.log(`✅ checkZelleEmailsAndVerify trigger created (every ${ZELLE_CHECK_INTERVAL_MINUTES} mins).`); }
  catch (e) { Logger.log(`❌ ERROR creating checkZelleEmailsAndVerify trigger: ${e}`); errorOccurred = true; }

  // Optional: Auto-process MANUALLY Approved Payments Trigger (commented out by default)
  /*
  try {
      ScriptApp.newTrigger('processApprovedPayments')
        .timeBased()
        .everyMinutes(10) // Process every 10 minutes
        .create();
      Logger.log('✅ processApprovedPayments time-driven trigger created (every 10 minutes).');
  } catch (e) {
      Logger.log(`❌ ERROR creating processApprovedPayments trigger: ${e}`);
      errorOccurred = true;
  }
  */

   Logger.log(`Trigger setup finished.`);
   // We check if the UI context is available before trying to use it to prevent errors when run automatically
   try {
     const ui = SpreadsheetApp.getUi(); // Attempt to get UI
     if (errorOccurred) { ui.alert('Trigger Setup Warning', 'One or more triggers failed to create. Please check the script execution logs for details.', ui.ButtonSet.OK); }
     else { ui.alert('Trigger Setup Complete', 'All necessary triggers configured. Check logs for details.', ui.ButtonSet.OK); }
   } catch (uiError) {
        Logger.log(`Could not display UI alert (likely run automatically): ${uiError}`);
        // No need to throw an error, the triggers were likely still set up.
   }
}