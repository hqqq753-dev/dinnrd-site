/**
 * Netlify serverless function â€” /api/subscribe
 *
 * Accepts:  POST { "email": "user@example.com" }
 * Adds the contact to your Brevo list and returns { success: true }.
 *
 * Required environment variables (set in Netlify â†’ Site â†’ Environment variables):
 *   BREVO_API_KEY   â€” your Brevo API key
 *   BREVO_LIST_ID   â€” the numeric ID of the Brevo list to add contacts to
 *                     (Brevo dashboard â†’ Contacts â†’ Lists â†’ click your list â†’ ID in the URL)
 */

const BREVO_CONTACTS_URL = 'https://api.brevo.com/v3/contacts';

exports.handler = async (event) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return respond(405, { error: 'Method not allowed' });
  }

  // Parse body
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

  // Call Brevo API
  let brevoRes;
  try {
    brevoRes = await fetch(BREVO_CONTACTS_URL, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({
        email,
        listIds: [listId],
        updateEnabled: true, // silently update if contact already exists
      }),
    });
  } catch (err) {
    console.error('Brevo fetch failed:', err);
    return respond(502, { error: 'Could not reach email service' });
  }

  // Brevo returns 201 (created) or 204 (updated/already exists) on success
  if (brevoRes.status === 201 || brevoRes.status === 204) {
    return respond(200, { success: true });
  }

  // Surface Brevo error detail in logs, return a generic message to the client
  const detail = await brevoRes.text().catch(() => '(no body)');
  console.error(`Brevo error ${brevoRes.status}:`, detail);
  return respond(brevoRes.status >= 500 ? 502 : 400, { error: 'Could not add contact' });
};

function respond(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}
