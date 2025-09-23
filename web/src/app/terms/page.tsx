export const metadata = {
  title: 'Terms & Conditions — Lumina',
};

export default function TermsPage() {
  return (
    <main className="min-h-screen flex items-start justify-center pt-16 pb-24">
      <div className="w-full max-w-2xl px-6">
        <h1 className="text-3xl sm:text-4xl font-light tracking-widest">Terms & Conditions</h1>
        
        <div className="mt-6 bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 space-y-4 leading-relaxed text-sm">
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
      </div>
    </main>
  );
}