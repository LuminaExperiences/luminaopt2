'use client';

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

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
  'w-full rounded-xl px-4 py-3 text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-black/20';

const labelClass = 'text-sm mb-2 text-left' + ' ' + 'text-black';

const TICKET_PRICE = 10; // Price per ticket in dollars

// Decorative Border Component
const DecorativeBorder = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="relative p-4 sm:p-6 m-2 sm:m-6">
      {/* Full height background - responsive */}
      <div 
        className="fixed inset-y-0 left-4 right-4 sm:left-20 sm:right-20 rounded-lg"
        style={{ 
          backgroundColor: '#870039',
          zIndex: -1
        }}
      />
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

export default function BookingForm() {

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
  const [showTermsModal, setShowTermsModal] = useState(false);

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
      <div className="mb-2 text-sm text-left text-black">Attendee Names</div>
      <div className="space-y-3">
        <AnimatePresence initial={false}>
          {Array.from({ length: count }).map((_, i) => (
            <motion.div key={i} variants={itemVariants}>
              <div style={{ backgroundColor: '#E3C18B' }} className="rounded-xl">
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
                  style={{ backgroundColor: '#E3C18B' }}
                />
              </div>
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
          className="mt-1.5 w-4 h-4 rounded border-2 border-gray-400 focus:ring-2 focus:ring-offset-0"
          style={{
            accentColor: '#A60046',
            backgroundColor: agreeTerms ? '#A60046' : 'transparent',
            borderColor: agreeTerms ? '#A60046' : '#9CA3AF'
          }}
        />
        <span className="text-sm text-black">
          I agree to all the{' '}
          <button 
            type="button"
            onClick={() => setShowTermsModal(true)}
            className="underline hover:text-gray-700 cursor-pointer"
          >
            terms and conditions
          </button>
          .
        </span>
      </label>
    </div>
  );

  return (
    <>
      <DecorativeBorder>
        <motion.div initial="hidden" animate="visible" variants={containerVariants} className="max-w-lg mx-auto p-3 sm:p-6 pt-2">
        <motion.div variants={itemVariants} className="text-center mb-6">
          <h1 className="font-normal text-center leading-tight" style={{ 
            fontFamily: 'var(--font-inria-serif)', 
            fontSize: 'clamp(24px, 8vw, 48px)', 
            color: '#FFCD7B'
          }}>The Big Fake Indian Wedding</h1>
          <div className="mt-10 space-y-2 leading-relaxed" style={{ fontFamily: 'var(--font-inria-serif)', fontSize: '16px', color: '#FFCD7B' }}>
            <p><strong>Lumina</strong> presents: A Big Fake Indian Wedding. Don&apos;t just attend. Be part of the legend.</p>
            
            <p>💍 Your ticket will reveal your side - bride or groom - with a matching dress code to bring the shaadi to life.</p>
            
            <div className="space-y-1">
              <p><strong>Venue:</strong> Walker Ames Room, Kane Hall</p>
              <p><strong>Time:</strong> 8:30 PM</p>
              <p><strong>Doors:</strong> 9:15PM</p>
            </div>
            
            <p>Please bring a valid form of identification to verify your identity. Brownie points for an Aadhar card. None for &quot;Tu jaanta hai mera baap kaun hai?&quot; We accept Husky cards.</p>
            
            <p className="font-medium">Shaadi mein milte hai!</p>
          </div>
          <div className="mt-6 rounded-2xl p-4" style={{ backgroundColor: '#FAD59C' }}>
            <div className="rounded-xl px-6 pt-6 pb-1 text-center" style={{ backgroundColor: '#E3C18B', fontFamily: 'var(--font-inria-serif)', fontSize: '16px', color: '#000000' }}>
              <div className="mb-1">
                <div className="font-normal">Ticket price: ${TICKET_PRICE * count}</div>
                <div className="font-normal">Zelle at: (912)-777-0981</div>
              </div>
              <div className="leading-tight">
                Please contact us at luminaexperiences@gmail.com to set up a Venmo payment. However, this may result in delays in receiving tickets.
              </div>
              <div className="flex justify-center">
                <Image src="/paymentqrnew.png" alt="Zelle QR" width={560} height={560} className="rounded" />
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="rounded-2xl p-6 flex flex-col items-center text-center space-y-6" style={{ backgroundColor: '#FAD59C', fontFamily: 'var(--font-inria-serif)' }}>
            {questions.map((q) => (
              <motion.div key={q.key} variants={itemVariants} className="w-full max-w-md">
                <div className={labelClass}>{q.label}</div>
                <div style={{ backgroundColor: '#E3C18B' }} className="rounded-xl">
                  {q.input}
                </div>
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
                className="px-5 py-2.5 rounded-lg text-white disabled:opacity-50"
                style={{ backgroundColor: canSubmit ? '#A60046' : 'rgba(166, 0, 70, 0.4)' }}
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
              {submitting ? 'Submitting...' : 'Submit'}
            </button>
          </motion.div>
        </motion.div>
      </motion.div>
      </DecorativeBorder>

      {/* Post-submission overlay sequence */}
      <AnimatePresence>
        {overlayStep !== null && (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
            style={{ backgroundColor: '#A60046' }}
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
                  <div className="text-4xl sm:text-5xl font-light tracking-wider" style={{ fontFamily: 'var(--font-inria-serif)', color: '#FFCD7B' }}>Shaadi me milte hai.</div>
                </motion.div>
              )}

              {overlayStep === 1 && (
                <motion.div
                  key="thanks"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.6 }}
                  className="max-w-lg w-full rounded-2xl p-4 text-center"
                  style={{ backgroundColor: '#A60046' }}
                >
                  <div className="rounded-xl p-6" style={{ backgroundColor: '#E3C18B' }}>
                    <div className="text-2xl font-light text-black" style={{ fontFamily: 'var(--font-inria-serif)' }}>Thank you!</div>
                    <div className="mt-4 text-left space-y-3 text-sm" style={{ fontFamily: 'var(--font-inria-serif)' }}>
                      <p className="text-black">
                        Thank you for booking your ticket for <span className="font-medium">The Big Fake Indian Wedding</span>, UW Lumina&apos;s most chaotic, colorful celebration! We&apos;ll get back to you with your scannable tickets shortly. Please check your spam folder if you don&apos;t see them within 30 minutes.
                      </p>
                      
                      <div className="space-y-2">
                        <div className="font-medium text-black">Payment Details:</div>
                        <p className="text-black">
                          <span className="font-medium">Zelle to:</span> +1 (912) 777-0981<br/>
                          <span className="font-medium">Ticket Price:</span> ${TICKET_PRICE * count}<br/>
                          <span className="font-medium">Include your Full Name in the memo</span>
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <p className="text-black">
                          For questions, reach us at <span className="font-medium">luminaexperiences@gmail.com</span>
                        </p>
                        <p className="text-black">
                          Follow the madness on Instagram <span className="font-medium">@lumina.wa</span> for party updates!
                        </p>
                      </div>
                    </div>
                    <div className="mt-6">
                      <button className="px-5 py-2.5 rounded-lg text-white" style={{ backgroundColor: '#A60046', fontFamily: 'var(--font-inria-serif)' }} onClick={() => {
                        setOverlayStep(null);
                        setFullName('');
                        setPhone('');
                        setEmail('');
                        setCountInput('1');
                        setAttendees(['']);
                        setAgreeTerms(false);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}>
                        Done
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Terms & Conditions Modal */}
      <AnimatePresence>
        {showTermsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            onClick={() => setShowTermsModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col p-4"
              style={{ backgroundColor: '#FAD59C' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="rounded-xl flex flex-col h-full min-h-0" style={{ backgroundColor: '#E3C18B' }}>
                {/* Header with close button */}
                <div className="flex items-center justify-between p-6">
                  <h2 className="text-2xl font-light tracking-widest text-black" style={{ fontFamily: 'var(--font-inria-serif)' }}>Terms & Conditions</h2>
                  <button
                    onClick={() => setShowTermsModal(false)}
                    className="text-black hover:text-gray-700 transition-colors p-1"
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Scrollable content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 leading-relaxed text-sm text-black min-h-0" style={{ fontFamily: 'var(--font-inria-serif)' }}>
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

                {/* Footer with I Agree button */}
                <div className="p-6">
                  <button
                    onClick={() => {
                      setAgreeTerms(true);
                      setShowTermsModal(false);
                    }}
                    className="w-full text-white py-3 rounded-xl font-medium transition-colors"
                    style={{ backgroundColor: '#A60046', fontFamily: 'var(--font-inria-serif)' }}
                  >
                    I Agree
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </>
  );
}