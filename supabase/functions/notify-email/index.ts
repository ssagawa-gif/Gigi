// Supabase Edge Function: sends an e-mail for every new row in `notifications`.
// Triggered by a Database Webhook (Database > Webhooks > INSERT on public.notifications).
// Secrets needed: RESEND_API_KEY, EMAIL_FROM, APP_URL  (SUPABASE_URL + SERVICE_ROLE_KEY are automatic)
import { createClient } from 'npm:@supabase/supabase-js@2';

const MARKERS: Record<string, Record<string, string>> = {
  ferritin: { en: 'ferritin', pt: 'ferritina', es: 'ferritina' },
  haemoglobin: { en: 'haemoglobin', pt: 'hemoglobina', es: 'hemoglobina' },
  vitamin_d: { en: 'vitamin D', pt: 'vitamina D', es: 'vitamina D' },
  tsh: { en: 'TSH', pt: 'TSH', es: 'TSH' },
};

const T: Record<string, Record<string, (d: any) => [string, string]>> = {
  review_requested: {
    en: (d) => [`New review request from ${d.patient_name}`, `${d.patient_name} asked you to review a ${d.marker} result on GiGi.`],
    pt: (d) => [`Novo pedido de revisão de ${d.patient_name}`, `${d.patient_name} pediu sua revisão de um resultado de ${d.marker} no GiGi.`],
    es: (d) => [`Nueva solicitud de revisión de ${d.patient_name}`, `${d.patient_name} te pidió revisar un resultado de ${d.marker} en GiGi.`],
  },
  appointment_booked: {
    en: (d) => [`New appointment: ${d.patient_name}, ${d.when}`, `${d.patient_name} booked a visit with you for ${d.when}.`],
    pt: (d) => [`Nova consulta: ${d.patient_name}, ${d.when}`, `${d.patient_name} marcou uma consulta com você para ${d.when}.`],
    es: (d) => [`Nueva cita: ${d.patient_name}, ${d.when}`, `${d.patient_name} reservó una cita contigo para el ${d.when}.`],
  },
  appointment_cancelled: {
    en: (d) => [`Appointment cancelled: ${d.when}`, `${d.name} cancelled the appointment on ${d.when}.`],
    pt: (d) => [`Consulta cancelada: ${d.when}`, `${d.name} cancelou a consulta de ${d.when}.`],
    es: (d) => [`Cita cancelada: ${d.when}`, `${d.name} canceló la cita del ${d.when}.`],
  },
  review_answered: {
    en: (d) => [`${d.doctor_name} reviewed your result`, `${d.doctor_name} replied about your ${d.marker} result. Open GiGi to read it.`],
    pt: (d) => [`${d.doctor_name} revisou seu resultado`, `${d.doctor_name} respondeu sobre seu resultado de ${d.marker}. Abra o GiGi para ler.`],
    es: (d) => [`${d.doctor_name} revisó tu resultado`, `${d.doctor_name} respondió sobre tu resultado de ${d.marker}. Abre GiGi para leerlo.`],
  },
};

Deno.serve(async (req) => {
  const { record } = await req.json();
  if (!record?.user_id) return new Response('no record', { status: 400 });

  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: u } = await sb.auth.admin.getUserById(record.user_id);
  const { data: p } = await sb.from('profiles').select('language').eq('id', record.user_id).single();
  const lang = (p?.language as string) || 'en';
  const tpl = T[record.type]?.[lang] || T[record.type]?.en;
  if (!u?.user?.email || !tpl) return new Response('skip');

  const d = record.data || {};
  const when = d.starts_at ? new Date(d.starts_at).toLocaleString(lang === 'en' ? 'en-GB' : lang, { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Madrid' }) : '';
  const [subject, body] = tpl({ ...d, when, marker: MARKERS[d.marker_code]?.[lang] || d.marker_code || '' });
  const link = `${Deno.env.get('APP_URL') || ''}#${record.link || ''}`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: Deno.env.get('EMAIL_FROM') || 'GiGi <onboarding@resend.dev>',
      to: u.user.email,
      subject,
      // Same brand as the app: Instrument Serif logo with three Persimmon dots, DM Sans text
      // (e-mail apps that block web fonts fall back to Georgia / Arial).
      html: `<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600&family=Instrument+Serif&display=swap" rel="stylesheet">
      <div style="font-family:'DM Sans',Arial,sans-serif;background:#F5EEE8;padding:24px;color:#2A1A1C">
        <div style="font-family:'Instrument Serif',Georgia,serif;font-size:40px;line-height:1;color:#561821;display:inline-block;position:relative;padding-right:10px">GiGi<span style="position:absolute;top:0;right:0;letter-spacing:1px;font-family:Arial,sans-serif;font-size:10px;line-height:1;color:#E2683C">&#9679;&#9679;&#9679;</span></div>
        <p style="font-size:15px">${body}</p>
        <a href="${link}" style="display:inline-block;background:#561821;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none">GiGi →</a>
      </div>`,
    }),
  });
  return new Response(await res.text(), { status: res.status });
});
