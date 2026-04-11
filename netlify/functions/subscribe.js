/**
 * Netlify serverless function — /.netlify/functions/subscribe
 *
 * Accepts:  POST { "email": "user@example.com" }
 * 1. Adds the contact to your Brevo list
 * 2. Sends a confirmation email to the new subscriber
 *
 * Required environment variables (Netlify → Site → Environment variables):
 *   BREVO_API_KEY   — your Brevo API key (Brevo dashboard → top-right → API Keys)
 *   BREVO_LIST_ID   — numeric ID of the Brevo list (Contacts → Lists → click list → check URL)
 *
 * Before going live: verify hello@dinnrd.com as a sender in Brevo
 *   (Brevo dashboard → Senders & IP → Senders → Add a sender)
 */

const BREVO_BASE = 'https://api.brevo.com/v3';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return respond(405, { error: 'Method not allowed' });
  }

  let email;
  try {
    ({ email } = JSON.parse(event.body || '{}'));
  } catch {
    return respond(400, { error: 'Invalid request body' });
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return respond(400, { error: 'A valid email address is required' });
  }

  const apiKey = process.env.BREVO_API_KEY;
  const listId = parseInt(process.env.BREVO_LIST_ID, 10);

  if (!apiKey || !listId) {
    console.error('Missing BREVO_API_KEY or BREVO_LIST_ID environment variable');
    return respond(500, { error: 'Server configuration error' });
  }

  const headers = {
    'accept': 'application/json',
    'content-type': 'application/json',
    'api-key': apiKey,
  };

  // ── 1. Add contact to list ──────────────────────────────────────────────────
  let contactRes;
  try {
    contactRes = await fetch(`${BREVO_BASE}/contacts`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        email,
        listIds: [listId],
        updateEnabled: true,
      }),
    });
  } catch (err) {
    console.error('Brevo contacts fetch failed:', err);
    return respond(502, { error: 'Could not reach email service' });
  }

  // 201 = created, 204 = already exists (updated)
  if (contactRes.status !== 201 && contactRes.status !== 204) {
    const detail = await contactRes.text().catch(() => '(no body)');
    console.error(`Brevo contacts error ${contactRes.status}:`, detail);
    return respond(contactRes.status >= 500 ? 502 : 400, { error: 'Could not add contact' });
  }

  // ── 2. Send confirmation email ──────────────────────────────────────────────
  try {
    const emailRes = await fetch(`${BREVO_BASE}/smtp/email`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        sender: { name: 'Dinnrd', email: 'hello@dinnrd.com' },
        to: [{ email }],
        subject: "You're on the Dinnrd waitlist 🎉",
        htmlContent: CONFIRMATION_HTML,
        textContent: CONFIRMATION_TEXT,
      }),
    });

    if (!emailRes.ok) {
      // Log but don't fail the request — contact was added successfully
      const detail = await emailRes.text().catch(() => '(no body)');
      console.error(`Brevo send email error ${emailRes.status}:`, detail);
    }
  } catch (err) {
    console.error('Brevo send email fetch failed:', err);
    // Same — don't fail the request
  }

  return respond(200, { success: true });
};

// ── Email content ─────────────────────────────────────────────────────────────

const CONFIRMATION_TEXT = `Hey — you're in.

We're building Dinnrd for families who are done with the 5pm panic, and you'll be first to know when we launch.

Waitlist members get their first month free.

The Dinnrd Team`;

const CONFIRMATION_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#F9F4ED;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#F9F4ED;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:520px;">

          <!-- Header -->
          <tr>
            <td align="center" style="background:#1e3829;border-radius:12px 12px 0 0;padding:32px 40px 28px;">
              <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:32px;font-weight:700;color:#F9F4ED;letter-spacing:-1px;">Dinnrd</p>
              <p style="margin:10px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:16px;font-style:italic;color:#C8DFD0;">Stop staring at the fridge.</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#ffffff;padding:40px 40px 32px;border-left:1px solid #E8E0D5;border-right:1px solid #E8E0D5;">
              <p style="margin:0 0 20px;font-size:22px;font-weight:700;color:#1e3829;letter-spacing:-0.4px;">Hey&nbsp;— you're in.</p>
              <p style="margin:0 0 16px;font-size:16px;line-height:1.7;color:#3a4e42;">
                We're building Dinnrd for families who are done with the 5pm panic, and you'll be first to know when we launch.
              </p>
              <p style="margin:0;font-size:16px;line-height:1.7;color:#3a4e42;">
                Waitlist members get their <strong style="color:#1e3829;">first month free</strong>.
              </p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="background:#ffffff;padding:0 40px;border-left:1px solid #E8E0D5;border-right:1px solid #E8E0D5;">
              <div style="height:1px;background:#E8E0D5;"></div>
            </td>
          </tr>

          <!-- Sign-off -->
          <tr>
            <td style="background:#ffffff;padding:24px 40px 40px;border-left:1px solid #E8E0D5;border-right:1px solid #E8E0D5;border-radius:0 0 12px 12px;">
              <p style="margin:0;font-size:15px;color:#5c7060;line-height:1.6;">
                The Dinnrd Team<br>
                <a href="https://dinnrd.com" style="color:#C95C28;text-decoration:none;">dinnrd.com</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding:24px 0 0;">
              <p style="margin:0;font-size:12px;color:#9a9088;">© 2025 Dinnrd. Made for families who are done with the 5pm panic.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

// ── Helpers ───────────────────────────────────────────────────────────────────

function respond(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}
