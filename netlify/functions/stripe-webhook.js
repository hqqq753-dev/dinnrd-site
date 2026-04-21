const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async (event) => {
  const sig = event.headers['stripe-signature'];
  if (!sig) return { statusCode: 400, body: 'Missing stripe-signature header' };

  let stripeEvent;
  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return { statusCode: 400, body: 'Webhook error: ' + err.message };
  }

  const obj = stripeEvent.data.object;
  const now = new Date().toISOString();

  try {
    switch (stripeEvent.type) {

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = obj;
        await supabase
          .from('stripe_customers')
          .update({
            stripe_subscription_id: sub.id,
            subscription_status:    sub.status === 'canceled' ? 'canceled' : sub.status,
            trial_end:              sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
            current_period_end:     new Date(sub.current_period_end * 1000).toISOString(),
            updated_at:             now,
          })
          .eq('stripe_customer_id', sub.customer);
        break;
      }

      case 'invoice.payment_failed': {
        await supabase
          .from('stripe_customers')
          .update({ subscription_status: 'past_due', updated_at: now })
          .eq('stripe_customer_id', obj.customer);
        break;
      }

      case 'invoice.payment_succeeded': {
        if (obj.subscription) {
          const sub = await stripe.subscriptions.retrieve(obj.subscription);
          await supabase
            .from('stripe_customers')
            .update({
              subscription_status: sub.status,
              current_period_end:  new Date(sub.current_period_end * 1000).toISOString(),
              updated_at:          now,
            })
            .eq('stripe_customer_id', obj.customer);
        }
        break;
      }

      case 'checkout.session.completed': {
        if (obj.subscription) {
          const sub = await stripe.subscriptions.retrieve(obj.subscription);
          await supabase
            .from('stripe_customers')
            .update({
              stripe_subscription_id: sub.id,
              subscription_status:    sub.status,
              current_period_end:     new Date(sub.current_period_end * 1000).toISOString(),
              updated_at:             now,
            })
            .eq('stripe_customer_id', obj.customer);
        }
        break;
      }

      default:
        // Unhandled event type — ignore
        break;
    }
  } catch (err) {
    console.error('Webhook handler error:', err);
    return { statusCode: 500, body: 'Internal error' };
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
