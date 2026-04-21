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

  // Cancel Stripe subscription first (don't fail if it errors)
  const { data: record } = await supabase
    .from('stripe_customers')
    .select('stripe_subscription_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (record?.stripe_subscription_id) {
    try {
      await stripe.subscriptions.cancel(record.stripe_subscription_id);
    } catch (err) {
      console.warn('Stripe cancel error (non-fatal):', err.message);
    }
  }

  // Delete Supabase user — cascades to profiles and stripe_customers
  const { error: deleteErr } = await supabase.auth.admin.deleteUser(user.id);
  if (deleteErr) {
    console.error('deleteUser error:', deleteErr);
    return respond(500, { error: deleteErr.message });
  }

  return respond(200, { success: true });
};

function respond(statusCode, body) {
  return { statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}
