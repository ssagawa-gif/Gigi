// Stripe webhook: confirms a booking once Checkout is paid, frees the slot if it expires.
// Never trusts the request body: it reads the event back from Stripe with the secret key,
// so no signing secret is needed. Deployed with --no-verify-jwt (Stripe has no Supabase session).
import { createClient } from 'npm:@supabase/supabase-js@2';
import { stripe, stripeConfigured } from '../_shared/stripe.ts';

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

Deno.serve(async (req) => {
  if (!stripeConfigured()) return new Response('payments off', { status: 503 });
  const body = await req.json().catch(() => ({}));
  if (!body?.id || !/^evt_/.test(body.id)) return new Response('no event', { status: 400 });
  const event = await stripe('GET', `/events/${body.id}`);   // authentic copy from Stripe
  const s = event.data?.object || {};
  const id = s.metadata?.appointment_id;
  if (!id) return new Response('ignored');

  if (event.type === 'checkout.session.completed' && s.payment_status === 'paid') {
    const pi = await stripe('GET', `/payment_intents/${s.payment_intent}`);
    const { data: appt } = await db.from('appointments').select('*').eq('id', id).maybeSingle();
    if (!appt) return new Response('unknown appointment');
    if (appt.status === 'pending_payment') {
      await db.from('appointments').update({
        status: 'booked', payment_status: 'paid', paid_at: new Date().toISOString(),
        stripe_payment_intent: pi.id, stripe_charge: pi.latest_charge,
      }).eq('id', id);
    } else if (appt.payment_status !== 'paid' && appt.payment_status !== 'refunded') {
      // paid after the hold was released (slot may be gone): give the money back
      await stripe('POST', '/refunds', { payment_intent: pi.id, metadata: { appointment_id: id, reason: 'hold_expired' } }, `refund-late-${id}`);
      await db.from('appointments').update({ payment_status: 'refunded', refunded_at: new Date().toISOString(), stripe_payment_intent: pi.id }).eq('id', id);
    }
  }
  if (event.type === 'checkout.session.expired') {
    const { data: appt } = await db.from('appointments').select('*').eq('id', id).maybeSingle();
    if (appt?.status === 'pending_payment') {
      await db.from('appointments').update({ status: 'cancelled', payment_status: 'expired' }).eq('id', id);
      await db.from('slots').update({ booked: false }).eq('id', appt.slot_id);
    }
  }
  return new Response('ok');
});
