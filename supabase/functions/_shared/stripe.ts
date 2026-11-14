// Minimal Stripe REST client (no SDK): form-encoded requests with the secret key from the function secrets.
export const stripeConfigured = () => !!Deno.env.get('STRIPE_SECRET_KEY');

function encode(obj: Record<string, unknown>, prefix = '', out = new URLSearchParams()): URLSearchParams {
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (Array.isArray(v)) {
      v.forEach((x, i) => (typeof x === 'object' && x !== null ? encode(x as Record<string, unknown>, `${key}[${i}]`, out) : out.append(`${key}[${i}]`, String(x))));
    } else if (typeof v === 'object') encode(v as Record<string, unknown>, key, out);
    else out.append(key, String(v));
  }
  return out;
}

export async function stripe(method: 'GET' | 'POST', path: string, body?: Record<string, unknown>, idempotencyKey?: string) {
  const res = await fetch('https://api.stripe.com/v1' + path, {
    method,
    headers: {
      Authorization: `Bearer ${Deno.env.get('STRIPE_SECRET_KEY')}`,
      ...(body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
      ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
    },
    body: body ? encode(body).toString() : undefined,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message || `Stripe ${res.status}`);
  return json;
}

export const GIGI_FEE = 0.10;   // Ste, 14 Nov: GiGi keeps 10 % of each paid visit
export const HOLD_MINUTES = 31;  // Stripe Checkout needs at least 30 minutes before it expires
export const REFUND_HOURS = 24;  // full refund when the patient cancels more than 24 h before

export const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
export const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
