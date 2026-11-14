// Payments with Stripe Connect (14 Nov 2026).
//  - connect_onboard / connect_status: a doctor opens her Stripe account to receive payments
//  - checkout: the patient pays when booking; the slot is held while she pays (30 min)
//  - cancel: cancels a paid visit; full refund when the patient cancels > 24 h before, or the doctor cancels
// The doctor is paid after the visit by the `payouts` function (price minus GiGi's 10 %).
// Deployed with --no-verify-jwt: the function checks the caller's session itself.
// Secrets: STRIPE_SECRET_KEY, APP_URL (SUPABASE_URL + SERVICE_ROLE_KEY are automatic).
import { createClient } from 'npm:@supabase/supabase-js@2';
import { stripe, stripeConfigured, GIGI_FEE, HOLD_MINUTES, REFUND_HOURS, cors, json } from '../_shared/stripe.ts';

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const APP = () => Deno.env.get('APP_URL') || '';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  const { data: auth } = await db.auth.getUser(token);
  const user = auth?.user;
  if (!user) return json({ error: 'not signed in' }, 401);
  if (!stripeConfigured()) return json({ error: 'payments.off' }, 503);
  const { action, ...a } = await req.json().catch(() => ({}));
  try {
    if (action === 'connect_onboard') return json(await connectOnboard(user));
    if (action === 'connect_status') return json(await connectStatus(user.id));
    if (action === 'checkout') return json(await checkout(user, a));
    if (action === 'cancel') return json(await cancel(user.id, a.appointment_id));
    return json({ error: 'unknown action' }, 400);
  } catch (e) {
    const msg = (e as Error).message;
    return json({ error: msg }, /^(book\.|payments\.|cancel\.)/.test(msg) ? 409 : 500);
  }
});

async function connectOnboard(user: { id: string; email?: string }) {
  const { data: doc } = await db.from('doctors').select('id').eq('id', user.id).maybeSingle();
  if (!doc) throw new Error('payments.notDoctor');
  let { data: row } = await db.from('doctor_payouts').select('*').eq('doctor_id', user.id).maybeSingle();
  if (!row) {
    const { data: prof } = await db.from('profiles').select('country').eq('id', user.id).single();
    const acct = await stripe('POST', '/accounts', {
      type: 'express', country: (prof?.country || 'ES').toUpperCase(), email: user.email,
      capabilities: { transfers: { requested: true } }, metadata: { doctor_id: user.id },
    }, `acct-${user.id}`);
    ({ data: row } = await db.from('doctor_payouts').insert({ doctor_id: user.id, stripe_account_id: acct.id }).select().single());
  }
  const link = await stripe('POST', '/account_links', {
    account: row!.stripe_account_id, type: 'account_onboarding',
    refresh_url: `${APP()}#/doctor/profile?stripe=refresh`, return_url: `${APP()}#/doctor/profile?stripe=return`,
  });
  return { url: link.url };
}

async function connectStatus(doctorId: string) {
  const { data: row } = await db.from('doctor_payouts').select('*').eq('doctor_id', doctorId).maybeSingle();
  if (!row) return { ready: false, started: false };
  const acct = await stripe('GET', `/accounts/${row.stripe_account_id}`);
  const ready = !!acct.details_submitted && acct.capabilities?.transfers === 'active' && !!acct.payouts_enabled;
  await db.from('doctor_payouts').update({ ready, updated_at: new Date().toISOString() }).eq('doctor_id', doctorId);
  await db.from('doctors').update({ payments_ready: ready }).eq('id', doctorId);
  let dashboard: string | null = null;
  if (ready) dashboard = (await stripe('POST', `/accounts/${row.stripe_account_id}/login_links`, {})).url;
  return { ready, started: true, dashboard };
}

async function checkout(user: { id: string; email?: string }, a: { slot_id?: string; type?: string; note?: string; lang?: string }) {
  const { data: slot } = await db.from('slots').select('*').eq('id', a.slot_id).maybeSingle();
  if (!slot || slot.booked || new Date(slot.starts_at) < new Date()) throw new Error('book.taken');
  const { data: doc } = await db.from('doctors').select('*').eq('id', slot.doctor_id).single();
  const { data: pay } = await db.from('doctor_payouts').select('*').eq('doctor_id', slot.doctor_id).maybeSingle();
  if (!pay?.ready) throw new Error('payments.doctorNotReady');
  const price = a.type === 'results' ? (doc.results_visit_fee ?? doc.first_visit_fee) : doc.first_visit_fee;
  if (!price || Number(price) <= 0) throw new Error('payments.noPrice');
  const cents = Math.round(Number(price) * 100);
  const fee = Math.round(cents * GIGI_FEE);

  // hold the slot (only if still free), then create the waiting appointment
  const { data: held } = await db.from('slots').update({ booked: true }).eq('id', slot.id).eq('booked', false).select();
  if (!held?.length) throw new Error('book.taken');
  const link = (doc.meeting_url || '').trim() || `https://meet.jit.si/GiGi-${crypto.randomUUID().replace(/-/g, '')}`;
  const holdUntil = new Date(Date.now() + HOLD_MINUTES * 60000);
  const { data: appt, error } = await db.from('appointments').insert({
    slot_id: slot.id, doctor_id: slot.doctor_id, patient_id: user.id, starts_at: slot.starts_at, minutes: slot.minutes,
    type: a.type || 'first', note: a.note || null, meeting_url: link, status: 'pending_payment',
    price_cents: cents, fee_cents: fee, currency: 'eur', payment_status: 'pending', hold_until: holdUntil.toISOString(),
  }).select().single();
  if (error) { await db.from('slots').update({ booked: false }).eq('id', slot.id); throw new Error(error.message); }

  try {
    const { data: prof } = await db.from('profiles').select('full_name').eq('id', slot.doctor_id).single();
    const session = await stripe('POST', '/checkout/sessions', {
      mode: 'payment',
      customer_email: user.email,
      locale: ['en', 'pt', 'es'].includes(a.lang || '') ? (a.lang === 'pt' ? 'pt-BR' : a.lang) : 'auto',
      line_items: [{ quantity: 1, price_data: { currency: 'eur', unit_amount: cents,
        product_data: { name: `GiGi · ${prof?.full_name || 'Online visit'}`, description: new Date(slot.starts_at).toISOString().slice(0, 16).replace('T', ' ') + ' UTC' } } }],
      payment_intent_data: { transfer_group: appt.id, metadata: { appointment_id: appt.id } },
      metadata: { appointment_id: appt.id },
      expires_at: Math.floor(holdUntil.getTime() / 1000),
      success_url: `${APP()}#/booked/${appt.id}?paid=1`,
      cancel_url: `${APP()}#/doctors/${slot.doctor_id}?payment=cancelled`,
    }, `checkout-${appt.id}`);
    await db.from('appointments').update({ stripe_session: session.id }).eq('id', appt.id);
    return { url: session.url, appointment_id: appt.id };
  } catch (e) {
    await db.from('appointments').update({ status: 'cancelled', payment_status: 'failed' }).eq('id', appt.id);
    await db.from('slots').update({ booked: false }).eq('id', slot.id);
    throw e;
  }
}

async function cancel(userId: string, id?: string) {
  const { data: appt } = await db.from('appointments').select('*').eq('id', id).maybeSingle();
  if (!appt || (appt.patient_id !== userId && appt.doctor_id !== userId)) throw new Error('cancel.notAllowed');
  if (appt.status !== 'booked') throw new Error('cancel.notBooked');
  const byDoctor = appt.doctor_id === userId;
  const early = new Date(appt.starts_at).getTime() - Date.now() > REFUND_HOURS * 3600000;
  const refund = appt.payment_status === 'paid' && !appt.transferred_at && (byDoctor || early);
  if (refund) {
    await stripe('POST', '/refunds', { payment_intent: appt.stripe_payment_intent, metadata: { appointment_id: appt.id } }, `refund-${appt.id}`);
  }
  await db.from('appointments').update({ status: 'cancelled', ...(refund ? { payment_status: 'refunded', refunded_at: new Date().toISOString() } : {}) }).eq('id', appt.id);
  await db.from('slots').update({ booked: false }).eq('id', appt.slot_id);
  const { data: me } = await db.from('profiles').select('full_name').eq('id', userId).single();
  await db.from('notifications').insert({
    user_id: byDoctor ? appt.patient_id : appt.doctor_id, type: 'appointment_cancelled',
    data: { name: me?.full_name, starts_at: appt.starts_at, refunded: refund, price_cents: appt.price_cents },
    link: byDoctor ? '/home' : '/doctor/agenda',
  });
  return { refunded: refund };
}
