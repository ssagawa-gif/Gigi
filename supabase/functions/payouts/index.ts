// Pays doctors after the visit: for every paid, not refunded appointment whose time is over,
// transfers the price minus GiGi's 10 % to the doctor's Stripe account, once (idempotency key).
// Called every hour by pg_cron (supabase/updates/2026-11-14_payments.sql). Safe to call any time:
// it only pays what is due. Deployed with --no-verify-jwt.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { stripe, stripeConfigured } from '../_shared/stripe.ts';

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

Deno.serve(async () => {
  if (!stripeConfigured()) return new Response('payments off', { status: 503 });
  const { data: due } = await db.from('appointments').select('*')
    .eq('payment_status', 'paid').is('transferred_at', null).is('refunded_at', null)
    .lt('starts_at', new Date().toISOString()).limit(100);
  let paid = 0;
  for (const a of due || []) {
    if (new Date(a.starts_at).getTime() + (a.minutes || 30) * 60000 > Date.now()) continue;   // not over yet
    const { data: acct } = await db.from('doctor_payouts').select('*').eq('doctor_id', a.doctor_id).maybeSingle();
    if (!acct?.ready) continue;
    try {
      const tr = await stripe('POST', '/transfers', {
        amount: a.price_cents - a.fee_cents, currency: a.currency || 'eur', destination: acct.stripe_account_id,
        transfer_group: a.id, source_transaction: a.stripe_charge || undefined, metadata: { appointment_id: a.id },
      }, `transfer-${a.id}`);
      await db.from('appointments').update({ payment_status: 'transferred', transferred_at: new Date().toISOString(), stripe_transfer: tr.id }).eq('id', a.id);
      paid += 1;
    } catch (e) { console.error('transfer failed', a.id, (e as Error).message); }
  }
  return new Response(JSON.stringify({ paid }), { headers: { 'Content-Type': 'application/json' } });
});
