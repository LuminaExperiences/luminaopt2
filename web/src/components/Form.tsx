'use client';

import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Staggered entrance: heading first, then questions, then submit
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
  'w-full bg-[var(--input)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--foreground)] placeholder-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--foreground)]/20';

const labelClass = 'text-sm text-[var(--muted)] mb-2';

export default function BookingForm() {
  // Post-submit overlay sequence state: 0 = "Shaadi me milte hai.", 1 = Thank you card
  const [overlayStep, setOverlayStep] = useState<0 | 1 | null>(null);

  // Form state
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  // Use a string state for number input to allow free typing; convert later
  const [countInput, setCountInput] = useState('1');
  const count = Math.max(1, Math.min(10, Number(countInput) || 0));
  const [attendees, setAttendees] = useState<string[]>(['']);
  const [consentPhoto, setConsentPhoto] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  const canSubmit = useMemo(() => {
    const nameOk = fullName.trim().length > 1;
    const phoneOk = /\+?\d[\d\s-]{6,}/.test(phone.trim());
    const emailOk = /.+@.+\..+/.test(email.trim());
    const countOk = count >= 1 && count <= 10;
    const attendeesOk = attendees.slice(0, count).every((a) => a.trim().length > 1);
    const consentsOk = consentPhoto && agreeTerms;
    return nameOk && phoneOk && emailOk && countOk && attendeesOk && consentsOk;
  }, [fullName, phone, email, count, attendees, consentPhoto, agreeTerms]);

  const normalizeCountAndAttendees = (v: number) => {
    const clamped = Math.max(1, Math.min(10, v || 1));
    setCountInput(String(clamped));
    setAttendees((prev) => {
      const arr = [...prev];
      if (clamped > arr.length) return [...arr, ...Array(clamped - arr.length).fill('')];
      return arr.slice(0, clamped);
    });
  };

  // Questions config (for consistent rendering)
  const questions = [
    {
      key: 'fullName',
      label: 'Full Name',
      input: (
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Your full name"
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
          placeholder="e.g. +1 555 555 5555"
          className={fieldClass}
        />
      ),
    },
    {
      key: 'email',
      label: 'Non-UW Email',
      input: (
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@example.com"
          className={fieldClass}
        />
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
          onChange={(e) => setCountInput(e.target.value)} // allow free typing
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
                }}
                placeholder={`Attendee ${i + 1} full name`}
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
          checked={consentPhoto}
          onChange={(e) => setConsentPhoto(e.target.checked)}
          className="mt-1.5"
        />
        <span className="text-sm text-[var(--muted)]">
          I consent to being photographed and videographed, and acknowledge it is solely Lumina&apos;s discretion where those images may be shared.
        </span>
      </label>
      <label className="flex items-start gap-2.5">
        <input
          type="checkbox"
          checked={agreeTerms}
          onChange={(e) => setAgreeTerms(e.target.checked)}
          className="mt-1.5"
        />
        <span className="text-sm text-[var(--muted)]">I agree to all the terms and conditions.</span>
      </label>
    </div>
  );

  return (
    <>
      <motion.div initial="hidden" animate="visible" variants={containerVariants} className="max-w-xl mx-auto p-6">
        {/* Heading block first */}
        <motion.div variants={itemVariants} className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-light tracking-widest">The Big Fake Indian Wedding</h1>
          <p className="text-[var(--muted)] mt-2">[Add your event description here...]</p>
          <div className="mt-6 bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 text-sm">
            <div className="font-medium mb-2">Payment</div>
            <p className="text-[var(--muted)]">
              Please Zelle the total amount to: +1 (912) 777-0981. Include your Full Name in the memo.
            </p>
            <div className="mt-3 h-28 rounded-lg bg-[var(--secondary)] flex items-center justify-center text-[var(--muted)]">
              QR CODE PLACEHOLDER
            </div>
          </div>
        </motion.div>

        {/* Questionnaire container: grey card on black background */}
        <motion.div variants={itemVariants} className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6">
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
                className="px-5 py-2.5 rounded-lg bg-white text-black disabled:opacity-50"
                disabled={!canSubmit}
                onClick={async () => {
                  if (!canSubmit) return;
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
                      consentPhoto,
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
                }}
              >
                Submit
              </button>
            </motion.div>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Post-submission overlay sequence */}
      <AnimatePresence>
        {overlayStep !== null && (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-6"
          >
            <AnimatePresence mode="wait">
              {overlayStep === 0 && (
                <motion.div
                  key="shaadi"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.6 }}
                  className="text-center"
                >
                  <div className="text-4xl sm:text-5xl font-light tracking-wider text-white">Shaadi me milte hai.</div>
                </motion.div>
              )}

              {overlayStep === 1 && (
                <motion.div
                  key="thanks"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.6 }}
                  className="max-w-lg w-full bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 text-center"
                >
                  <div className="text-2xl font-light">Thank you!</div>
                  <p className="text-[var(--muted)] mt-2">We’ve received your request.</p>
                  <div className="mt-5 text-left space-y-2">
                    <div className="font-medium">Payment Reminder</div>
                    <p className="text-[var(--muted)]">
                      If you haven’t paid yet, please Zelle the total amount to
                      <span className="text-white font-medium"> +1 (912) 777-0981</span>. Include your Full Name in the memo.
                    </p>
                    <p className="text-[var(--muted)]">Please wait patiently — you’ll receive your tickets by email once payment is verified.</p>
                  </div>
                  <div className="mt-6">
                    <button className="px-5 py-2.5 rounded-lg bg-white text-black" onClick={() => setOverlayStep(null)}>
                      Done
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}