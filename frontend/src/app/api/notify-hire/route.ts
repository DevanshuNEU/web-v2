/**
 * POST /api/notify-hire
 *
 * Fires when a visitor types `hire devanshu` in the terminal.
 * Sends Devanshu an instant email via Resend so he knows someone
 * was interested enough to actually try the command.
 *
 * Called fire-and-forget from the terminal command handler — the visitor
 * never waits for this response and no error is shown if it fails.
 */

import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const TO_EMAIL   = 'chicholikar.d@northeastern.edu';
const FROM_EMAIL = 'devOS <onboarding@resend.dev>';

export async function POST(req: NextRequest) {
  try {
    if (!process.env.RESEND_API_KEY) {
      // Silently succeed — visitor shouldn't see a broken terminal
      return NextResponse.json({ ok: true });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    // Grab basic context from the request (no personal data stored)
    const userAgent = req.headers.get('user-agent') ?? 'unknown';
    const timestamp = new Date().toLocaleString('en-US', {
      timeZone: 'America/New_York',
      dateStyle: 'full',
      timeStyle: 'short',
    });

    await resend.emails.send({
      from: FROM_EMAIL,
      to:   TO_EMAIL,
      subject: '👋 Someone typed "hire devanshu" on your portfolio',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto;">
          <div style="background: #0a0a0a; color: #4ade80; padding: 24px; border-radius: 12px 12px 0 0; font-family: monospace;">
            <p style="margin: 0; font-size: 13px; opacity: 0.5;">devOS Terminal</p>
            <p style="margin: 8px 0 0; font-size: 16px; font-weight: 600;">$ hire devanshu</p>
            <p style="margin: 4px 0 0; font-size: 13px; opacity: 0.7;">ACCESS GRANTED: candidate approved for hire</p>
          </div>
          <div style="background: #f9f9f9; padding: 24px; border-radius: 0 0 12px 12px; border: 1px solid #e5e5e5;">
            <p style="margin: 0 0 16px; font-size: 15px; color: #111; font-weight: 500;">
              Someone visited your portfolio and typed <code style="background: #f0f0f0; padding: 2px 6px; border-radius: 4px; font-size: 13px;">hire devanshu</code> in the terminal.
            </p>
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
              <tr>
                <td style="padding: 6px 0; color: #888; width: 110px;">Time</td>
                <td style="padding: 6px 0; color: #111;">${timestamp} ET</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #888;">Browser</td>
                <td style="padding: 6px 0; color: #111; font-size: 12px;">${userAgent.substring(0, 120)}</td>
              </tr>
            </table>
            <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 16px 0;" />
            <p style="margin: 0; font-size: 13px; color: #666;">
              Reach out while the interest is fresh. 🚀
            </p>
          </div>
          <p style="text-align: center; color: #aaa; font-size: 11px; margin-top: 12px;">
            devOS portfolio · devanshuchicholikar.com
          </p>
        </div>
      `,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    // Log but don't expose errors — this is a background notification
    console.error('[notify-hire] error:', err);
    return NextResponse.json({ ok: true });
  }
}
