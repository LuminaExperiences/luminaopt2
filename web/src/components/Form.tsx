'use client';

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
// removed next/image to avoid validation issues

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.35, delayChildren: 0.4 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8 } },
};

const fieldClass =
  'w-full bg-[var(--input)] border border-transparent rounded-xl px-4 py-3 text-black placeholder:text-black/60 focus:outline-none focus:ring-2 focus:ring-[#FFCD7B]/30';

const labelClass = 'text-sm text-[var(--muted)] mb-2';

export default function BookingForm() {
  const [showTerms, setShowTerms] = useState(false);
  const [overlayStep, setOverlayStep] = useState<0 | 1 | null>(null);

  // Form state
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [countInput, setCountInput] = useState('1');
  const count = Math.max(1, Math.min(10, Number(countInput) || 0));
  const [attendees, setAttendees] = useState<string[]>(['']);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const emailLower = email.trim().toLowerCase();
  const emailHasUW = emailLower.includes('@uw');

  const canSubmit = useMemo(() => {
    const nameOk = fullName.trim().length > 1;
    const phoneOk = /\+?\d[\d\s-]{6,}/.test(phone.trim());
    const emailOk = /.+@.+\..+/.test(emailLower) && !emailLower.includes('@uw');
    const countOk = count >= 1 && count <= 10;
    const attendeesOk = attendees.slice(0, count).every((a) => a.trim().length > 1);
    return nameOk && phoneOk && emailOk && countOk && attendeesOk && agreeTerms && !submitting;
  }, [fullName, phone, emailLower, count, attendees, agreeTerms, submitting]);

  const normalizeCountAndAttendees = (v: number) => {
    const clamped = Math.max(1, Math.min(10, v || 1));
    setCountInput(String(clamped));
    setAttendees((prev) => {
      const arr = [...prev];
      if (clamped > arr.length) return [...arr, ...Array(clamped - arr.length).fill('')];
      return arr.slice(0, clamped);
    });
  };

  const lastAutoFill = useRef<string>('');
  const userEditedFirstAttendee = useRef<boolean>(false);

  useEffect(() => {
    if (count === 1 && !userEditedFirstAttendee.current) {
      setAttendees((prev) => {
        const arr = [...prev];
        arr[0] = fullName;
        lastAutoFill.current = fullName;
        return arr;
      });
    }
  }, [count, fullName]);

  useEffect(() => {
    if (count !== 1) {
      userEditedFirstAttendee.current = false;
      lastAutoFill.current = '';
    }
  }, [count]);

  const questions = [
    {
      key: 'fullName',
      label: 'Full Name',
      input: (
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className={fieldClass}
          autoFocus
        />
      ),
    },
    {
      key: 'phone',
      label: 'Phone Number (Zelle number)',
      input: (
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className={fieldClass}
        />
      ),
    },
    {
      key: 'email',
      label: 'Non-UW Email',
      input: (
        <div className="w-full">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={fieldClass + (emailHasUW ? ' border-red-500 focus:ring-red-500/40' : '')}
          />
          {emailHasUW && (
            <div className="mt-1 text-xs text-red-500" role="alert" aria-live="polite">
              UW email addresses are not allowed. Please use a non-UW email.
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'count',
      label: 'How many people are you booking for?',
      input: (
        <input
          type="number"
          min={1}
          max={10}
          value={countInput}
          onChange={(e) => setCountInput(e.target.value)}
          onBlur={(e) => normalizeCountAndAttendees(Number(e.target.value))}
          className={fieldClass}
        />
      ),
    },
  ] as const;

  const attendeeList = (
    <div className="w-full">
      <div className="mb-2 text-sm text-[var(--muted)]">Attendee Names</div>
      <div className="space-y-3">
        <AnimatePresence initial={false}>
          {Array.from({ length: count }).map((_, i) => (
            <motion.div key={i} variants={itemVariants}>
              <input
                value={attendees[i] ?? ''}
                onChange={(e) => {
                  const arr = attendees.slice();
                  arr[i] = e.target.value;
                  setAttendees(arr);
                  if (i === 0) {
                    if (e.target.value !== lastAutoFill.current) {
                      userEditedFirstAttendee.current = true;
                    }
                  }
                }}
                className={fieldClass}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );

  const consentSection = (
    <div className="w-full space-y-4">
      <label className="flex items-start gap-2.5">
        <input
          type="checkbox"
          checked={agreeTerms}
          onChange={(e) => setAgreeTerms(e.target.checked)}
          className="mt-1.5 accent-[#A60046]"
        />
        <span className="text-sm text-[var(--muted)]">
          I agree to all the{' '}
          <button type="button" onClick={() => setShowTerms(true)} className="underline hover:text-[#A60046] hover:[text-shadow:0_0_8px_rgba(166,0,70,0.65)] transition-all duration-200">
            terms and conditions
          </button>.
          .
        </span>
      </label>
    </div>
  );

  return (
    <>
      <div className="w-full text-center mb-6 px-4">
        <h1 className="font-['Times_New_Roman',_Times,_serif] whitespace-nowrap tracking-wide font-light leading-tight text-2xl sm:text-3xl md:text-4xl lg:text-5xl">The Big Fake Indian Wedding</h1>
      </div>
      <motion.div initial="hidden" animate="visible" variants={containerVariants} className="max-w-xl mx-auto p-6">
        <motion.div variants={itemVariants} className="text-center mb-8">
          {/* heading moved above for full-width centering */}
          {/* Removed placeholder description paragraph */}
          <div className="mt-6 bg-[var(--card)] rounded-2xl p-4 text-sm text-black">
            {/* Removed "Payment" heading */}
            <div className="space-y-3 text-left">
              <p>
                Lumina presents: A Big Fake Indian Wedding. The biggest night UW has ever seen — packed dance floors, jaw-dropping décor, and nonstop music. No vows, no rules — just color, chaos, and memories you’ll talk about for years. Don’t just attend. Be part of the legend.
              </p>
              <p>💍 Your ticket will reveal your side — bride or groom — with a matching dress code to bring the shaadi to life.</p>
              <p>
                <span className="font-semibold">Venue:</span> Walker Ames Room, Kane Hall<br/>
                <span className="font-semibold">Time:</span> 8:30 PM<br/>
                <span className="font-semibold">Doors:</span> 9:15PM<br/>
                <span className="font-semibold">Payment:</span> Zelle to +1 (912)-777-0981, if not already done. Please text our Instagram @lumina.wa if you’d like to Venmo!
              </p>
              <p>
                Please bring a valid form of identification to verify your identity. Brownie points for an Aadhar card. None for “Tu jaanta hai mera baap kaun hai?” We accept Husky cards.
              </p>
              <p>Shaadi mein milte hai!</p>
            </div>
            <img src="/zelle-qr.png" alt="Zelle QR" width={180} height={180} className="mx-auto mt-4 rounded-md" />
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="bg-[var(--card)] rounded-2xl p-6 text-black">
          <motion.div variants={containerVariants} className="flex flex-col items-center text-center space-y-6">
            {questions.map((q) => (
              <motion.div key={q.key} variants={itemVariants} className="w-full max-w-md">
                <div className={labelClass}>{q.label}</div>
                {q.input}
              </motion.div>
            ))}

            <motion.div variants={itemVariants} className="w-full max-w-md">
              {attendeeList}
            </motion.div>

            <motion.div variants={itemVariants} className="w-full max-w-md">
              {consentSection}
            </motion.div>

            <motion.div variants={itemVariants} className="pt-2">
              <button
                className="px-5 py-2.5 rounded-lg bg-[#A60046] text-[#FFCD7B] disabled:opacity-50 hover:brightness-110 transition"
                disabled={!canSubmit}
                onClick={async () => {
                  if (!canSubmit) return;
                  setSubmitting(true);
                  try {
                    normalizeCountAndAttendees(Number(countInput));

                    const res = await fetch('/api/submit', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        fullName,
                        phone,
                        email,
                        count,
                        attendees,
                        agreeTerms,
                      }),
                    });
                    const data = await res.json().catch(() => null);
                    if (!res.ok || !data?.ok) {
                      alert('Submission failed. Please try again.');
                      return;
                    }
                    setOverlayStep(0);
                    setTimeout(() => setOverlayStep(1), 1800);
                  } finally {
                    setSubmitting(false);
                  }
                }}
              >
                Submit
              </button>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* overlay unchanged ... */}

      </motion.div>

      {/* Terms & Conditions modal */}
      <AnimatePresence>
        {showTerms && (
          <motion.div
            key="terms-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
            onClick={() => setShowTerms(false)}
          >
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 10, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-xl sm:max-w-2xl bg-[var(--card)] rounded-2xl p-6 text-left flex flex-col max-h-[80vh] sm:max-h-[85vh] text-black"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="terms-title"
            >
              <div className="flex items-start justify-between gap-4">
                <h2 id="terms-title" className="text-2xl font-light tracking-widest text-[#A60046]">Terms & Conditions</h2>
                <button className="text-[#A60046] hover:opacity-80" onClick={() => setShowTerms(false)} aria-label="Close">
                  ✕
                </button>
              </div>
              <div className="mt-4 space-y-3 text-sm leading-relaxed overflow-y-auto flex-1 pr-2">
                <p>Welcome to <strong>Lumina</strong>, a high-energy nightlife experience built for chaos, clarity, and connection.</p>
                <p>By purchasing a ticket and/or attending, you agree to the following terms:</p>
                <p className="font-semibold">1. Substance-Free Environment</p>
                <p>Lumina is a strictly alcohol-, drug-, cigarette-, and e-cigarette-free event.</p>
                <p>• Possession or use of intoxicating substances, cigarettes, or e-cigarettes is not permitted on the premises.</p>
                <p>• Violation of this policy will result in immediate removal without refund and may incur a fine at the discretion of the organizers.</p>
                <p className="font-semibold">2. Respect and Consent</p>
                <p>• This is a shared space built on mutual respect and freedom of expression.</p>
                <p>• Consent is non-negotiable. Any form of harassment, unwanted physical contact, or disrespectful behavior will result in immediate ejection without refund.</p>
                <p>• Be responsible for your words, actions, and energy.</p>
                <p className="font-semibold">3. Entry Requirements</p>
                <p>• Valid government-issued ID or University of Washington Husky ID is required for entry.</p>
                <p>• Attendees must be capable of walking without support. Individuals exhibiting signs of intoxication or physical impairment will not be admitted.</p>
                <p>• Entry is permitted until 12:00 AM midnight. After that, the gates will close.</p>
                <p>• Re-entry is allowed only if you originally checked in before 12:00 AM.</p>
                <p className="font-semibold">4. Puking Policy</p>
                <p>• Any instance of vomiting inside the venue will trigger a cleaning fee, which will be determined by the organizers based on the impact and extent of cleanup required.</p>
                <p className="font-semibold">5. No Refunds or Transfers</p>
                <p>• All tickets are non-refundable and non-transferable.</p>
                <p>• In the case of event cancellation, only the base ticket price will be refunded.</p>
                <p className="font-semibold">6. Photography &amp; Media Consent</p>
                <p>• By entering, you consent to being photographed or recorded for promotional purposes.</p>
                <p>• If you prefer not to be captured, please inform staff at check-in.</p>
                <p className="font-semibold">7. Liability Waiver</p>
                <p>• Attendees are responsible for their own behavior, belongings, and physical condition.</p>
                <p>• Lumina organizers, staff, and venue partners are not liable for any personal injury, loss, or damage.</p>
                <p className="font-semibold">🔁 Updates</p>
                <p>These terms may be modified prior to the event. Attendance implies agreement to any updates.</p>
                <p className="font-semibold">⚡Bring the Chaos — Keep It Clean</p>
                <p>Lumina is a space to let go without substances — to dance harder, laugh louder, and connect more deeply. Keep it wild, keep it respectful, and let the magic unfold.</p>
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  className="px-5 py-2.5 rounded-lg bg-[#A60046] text-[#FFCD7B] hover:brightness-110"
                  onClick={() => {
                    setAgreeTerms(true);
                    setShowTerms(false);
                  }}
                >
                  I agree
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}