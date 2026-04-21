const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return respond(405, { error: 'Method not allowed' });
  }

  const token = (event.headers.authorization || '').replace('Bearer ', '');
  if (!token) return respond(401, { error: 'Unauthorized' });

  const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !user) return respond(401, { error: 'Invalid token' });

  let referralCode = '';
  try { ({ referralCode = '' } = JSON.parse(event.body || '{}')); } catch {}

  // Idempotent — return early if customer already exists
  const { data: existing } = await supabase
    .from('stripe_customers')
    .select('stripe_customer_id, subscription_status')
    .eq('user_id', user.id)
    .maybeSingle();

  if (existing?.stripe_customer_id) {
    return respond(200, { already_exists: true, subscription_status: existing.subscription_status });
  }

  try {
    // Create profile first (upsert is safe here)
    await supabase.from('profiles').upsert({
      id:         user.id,
      email:      user.email,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id', ignoreDuplicates: true });

    // Handle referral
    if (referralCode) {
      const { data: referrer } = await supabase
        .from('profiles')
        .select('id, referral_count')
        .eq('referral_code', referralCode)
        .maybeSingle();
      if (referrer && referrer.id !== user.id) {
        await supabase
          .from('profiles')
          .update({ referral_count: (referrer.referral_count || 0) + 1, updated_at: new Date().toISOString() })
          .eq('id', referrer.id);
      }
    }

    // Create Stripe customer
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { supabase_uid: user.id },
    });

    // Create subscription with 7-day trial
    // payment_behavior: 'default_incomplete' means no charge until trial ends
    const subscription = await stripe.subscriptions.create({
      customer:         customer.id,
      items:            [{ price: process.env.STRIPE_PRICE_ID }],
      trial_period_days: 7,
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
    });

    await supabase.from('stripe_customers').insert({
      user_id:              user.id,
      stripe_customer_id:   customer.id,
      stripe_subscription_id: subscription.id,
      subscription_status:  'trialing',
      trial_end:            new Date(subscription.trial_end * 1000).toISOString(),
      current_period_end:   new Date(subscription.current_period_end * 1000).toISOString(),
      created_at:           new Date().toISOString(),
      updated_at:           new Date().toISOString(),
    });

    return respond(200, {
      success:             true,
      subscription_status: 'trialing',
      trial_end:           new Date(subscription.trial_end * 1000).toISOString(),
    });
  } catch (err) {
    console.error('create-subscription error:', err);
    return respond(500, { error: err.message });
  }
};

function respond(statusCode, body) {
  return { statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}
