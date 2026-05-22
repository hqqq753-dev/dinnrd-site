exports.handler = async () => {
  const { BREVO_API_KEY, BREVO_LIST_ID } = process.env;

  if (!BREVO_API_KEY || !BREVO_LIST_ID) {
    return { statusCode: 200, body: JSON.stringify({ count: 0 }) };
  }

  try {
    const res = await fetch(`https://api.brevo.com/v3/contacts/lists/${BREVO_LIST_ID}`, {
      headers: { 'api-key': BREVO_API_KEY, 'Accept': 'application/json' },
    });

    if (!res.ok) return { statusCode: 200, body: JSON.stringify({ count: 0 }) };

    const data = await res.json();
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300',
      },
      body: JSON.stringify({ count: data.totalSubscribers || 0 }),
    };
  } catch {
    return { statusCode: 200, body: JSON.stringify({ count: 0 }) };
  }
};
