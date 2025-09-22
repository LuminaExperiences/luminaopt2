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
      agreeTerms,
    } = body || {};

    if (!fullName || !email || !count || !Array.isArray(attendees)) {
      return NextResponse.json({ ok: false, error: 'Invalid payload' }, { status: 400 });
    }

    // Basic server-side validation
    if (typeof count !== 'number' || count < 1 || count > 10) {
      return NextResponse.json({ ok: false, error: 'Invalid ticket count' }, { status: 400 });
    }

    // Reject UW domain emails for safety (mirrors frontend restriction)
    if (typeof email === 'string' && email.trim().toLowerCase().endsWith('@uw.edu')) {
      return NextResponse.json({ ok: false, error: 'UW email addresses are not allowed. Please use a non-UW email.' }, { status: 400 });
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
      agreeTerms: !!agreeTerms,
    };

    const url = APPS_SCRIPT_API_KEY
      ? `${APPS_SCRIPT_URL}${APPS_SCRIPT_URL.includes('?') ? '&' : '?'}key=${encodeURIComponent(APPS_SCRIPT_API_KEY)}`
      : APPS_SCRIPT_URL;

    const res = await fetch(url, {
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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}