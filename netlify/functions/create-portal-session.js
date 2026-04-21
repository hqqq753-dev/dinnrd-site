const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return respond(405, { error: 'Method not allowed' });

  const token = (event.headers.authorization || '').replace('Bearer ', '');
  if (!token) return respond(401, { error: 'Unauthorized' });

  const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !user) return respond(401, { error: 'Invalid token' });

  const { data: record } = await supabase
    .from('stripe_customers')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!record?.stripe_customer_id) {
    return respond(404, { error: 'No Stripe customer found for this user' });
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer:   record.stripe_customer_id,
      return_url: 'https://dinnrd.com/account',
    });
    return respond(200, { url: session.url });
  } catch (err) {
    console.error('create-portal-session error:', err);
    return respond(500, { error: err.message });
  }
};

function respond(statusCode, body) {
  return { statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}
