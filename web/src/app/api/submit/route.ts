import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      fullName,
      phone,
      email,
      count,
      attendees,
      consentPhoto,
      agreeTerms,
    } = body || {};

    if (!fullName || !email || !count || !Array.isArray(attendees)) {
      return NextResponse.json({ ok: false, error: 'Invalid payload' }, { status: 400 });
    }

    // Basic server-side validation
    if (typeof count !== 'number' || count < 1 || count > 10) {
      return NextResponse.json({ ok: false, error: 'Invalid ticket count' }, { status: 400 });
    }

    const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL;
    const APPS_SCRIPT_API_KEY = process.env.APPS_SCRIPT_API_KEY;

    // If Apps Script URL is not configured yet, simulate success for local UI testing
    if (!APPS_SCRIPT_URL) {
      return NextResponse.json({ ok: true, simulated: true });
    }

    const payload = {
      fullName,
      phone,
      payerEmail: email,
      numTickets: count,
      attendeeNames: attendees,
      consentPhoto: !!consentPhoto,
      agreeTerms: !!agreeTerms,
    };

    const res = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(APPS_SCRIPT_API_KEY ? { 'X-API-Key': APPS_SCRIPT_API_KEY } : {}),
      },
      body: JSON.stringify(payload),
      // Avoid cache issues
      cache: 'no-store',
    });

    const text = await res.text();

    if (!res.ok) {
      return NextResponse.json({ ok: false, error: 'Upstream error', status: res.status, body: text }, { status: 502 });
    }

    // Try to parse upstream JSON; fall back to text
    try {
      const data = JSON.parse(text);
      return NextResponse.json({ ok: true, upstream: data });
    } catch {
      return NextResponse.json({ ok: true, upstream: text });
    }
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? 'Unknown error' }, { status: 500 });
  }
}