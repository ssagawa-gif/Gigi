// Supabase Edge Function: sends an e-mail for every new row in `notifications`.
// Called by the trigger in supabase/updates/2026-10-29_email_trigger.sql with { id }.
// Deployed automatically by .github/workflows/supabase.yml (with --no-verify-jwt: safe,
// because the function only e-mails rows that really exist and only once).
// Secrets: RESEND_API_KEY, EMAIL_FROM, APP_URL (SUPABASE_URL + SERVICE_ROLE_KEY are automatic).
import { createClient } from 'npm:@supabase/supabase-js@2';

const MARKERS: Record<string, Record<string, string>> = {
  ferritin: { en: 'ferritin', pt: 'ferritina', es: 'ferritina' },
  haemoglobin: { en: 'haemoglobin', pt: 'hemoglobina', es: 'hemoglobina' },
  vitamin_d: { en: 'vitamin D', pt: 'vitamina D', es: 'vitamina D' },
  tsh: { en: 'TSH', pt: 'TSH', es: 'TSH' },
};

type Mail = { subject: string; title: string; body: string[]; cta: string };
const T: Record<string, Record<string, (d: any) => Mail>> = {
  welcome: {
    en: (d) => ({ subject: `Welcome to GiGi, ${d.name}`, title: `Welcome to GiGi, ${d.name}!`,
      body: ['Thank you for joining GiGi — your women’s health history, in one place.',
        'Start by adding your latest lab results: upload a PDF or photo, or type in the values. GiGi shows what is in range and tells you when a doctor should take a look.',
        'Your data is stored in the EU, and no one sees it unless you choose to share it.'],
      cta: 'Add my first results' }),
    pt: (d) => ({ subject: `Boas-vindas ao GiGi, ${d.name}`, title: `Boas-vindas ao GiGi, ${d.name}!`,
      body: ['Obrigada por entrar no GiGi — seu histórico de saúde da mulher, em um só lugar.',
        'Comece adicionando seus últimos exames: envie um PDF ou foto, ou digite os valores. O GiGi mostra o que está dentro da faixa e avisa quando um médico deve avaliar.',
        'Seus dados ficam guardados na UE, e ninguém os vê sem que você decida compartilhar.'],
      cta: 'Adicionar meus primeiros exames' }),
    es: (d) => ({ subject: `Te damos la bienvenida a GiGi, ${d.name}`, title: `¡Te damos la bienvenida a GiGi, ${d.name}!`,
      body: ['Gracias por unirte a GiGi — tu historial de salud femenina, en un solo lugar.',
        'Empieza añadiendo tus últimos análisis: sube un PDF o una foto, o escribe los valores. GiGi te muestra qué está en rango y te avisa cuando un médico debería revisarlo.',
        'Tus datos se guardan en la UE y nadie los ve salvo que decidas compartirlos.'],
      cta: 'Añadir mis primeros análisis' }),
  },
  welcome_doctor: {
    en: (d) => ({ subject: `Welcome to GiGi, ${d.name}`, title: `Welcome to GiGi, ${d.name}`,
      body: ['Thank you for joining GiGi as a clinician.', 'We are verifying your profile. Meanwhile, complete your profile (specialty, languages, fees) and open your first free times in the Agenda.'],
      cta: 'Complete my profile' }),
    pt: (d) => ({ subject: `Boas-vindas ao GiGi, ${d.name}`, title: `Boas-vindas ao GiGi, ${d.name}`,
      body: ['Obrigada por entrar no GiGi como médico(a).', 'Estamos verificando seu perfil. Enquanto isso, complete seu perfil (especialidade, idiomas, valores) e abra seus primeiros horários na Agenda.'],
      cta: 'Completar meu perfil' }),
    es: (d) => ({ subject: `Te damos la bienvenida a GiGi, ${d.name}`, title: `Te damos la bienvenida a GiGi, ${d.name}`,
      body: ['Gracias por unirte a GiGi como médico/a.', 'Estamos verificando tu perfil. Mientras tanto, completa tu perfil (especialidad, idiomas, tarifas) y abre tus primeras horas en la Agenda.'],
      cta: 'Completar mi perfil' }),
  },
  review_requested: {
    en: (d) => ({ subject: `New review request from ${d.patient_name}`, title: 'New review request', body: [`${d.patient_name} asked you to review a ${d.marker} result on GiGi.`], cta: 'Open the review queue' }),
    pt: (d) => ({ subject: `Novo pedido de revisão de ${d.patient_name}`, title: 'Novo pedido de revisão', body: [`${d.patient_name} pediu sua revisão de um resultado de ${d.marker} no GiGi.`], cta: 'Abrir a fila de revisões' }),
    es: (d) => ({ subject: `Nueva solicitud de revisión de ${d.patient_name}`, title: 'Nueva solicitud de revisión', body: [`${d.patient_name} te pidió revisar un resultado de ${d.marker} en GiGi.`], cta: 'Abrir revisiones' }),
  },
  appointment_booked: {
    en: (d) => ({ subject: `New appointment: ${d.patient_name}, ${d.when}`, title: 'New appointment', body: [`${d.patient_name} booked a visit with you for ${d.when}.`], cta: 'Open my agenda' }),
    pt: (d) => ({ subject: `Nova consulta: ${d.patient_name}, ${d.when}`, title: 'Nova consulta', body: [`${d.patient_name} marcou uma consulta com você para ${d.when}.`], cta: 'Abrir minha agenda' }),
    es: (d) => ({ subject: `Nueva cita: ${d.patient_name}, ${d.when}`, title: 'Nueva cita', body: [`${d.patient_name} reservó una cita contigo para el ${d.when}.`], cta: 'Abrir mi agenda' }),
  },
  appointment_cancelled: {
    en: (d) => ({ subject: `Appointment cancelled: ${d.when}`, title: 'Appointment cancelled', body: [`${d.name} cancelled the appointment on ${d.when}.`], cta: 'Open GiGi' }),
    pt: (d) => ({ subject: `Consulta cancelada: ${d.when}`, title: 'Consulta cancelada', body: [`${d.name} cancelou a consulta de ${d.when}.`], cta: 'Abrir o GiGi' }),
    es: (d) => ({ subject: `Cita cancelada: ${d.when}`, title: 'Cita cancelada', body: [`${d.name} canceló la cita del ${d.when}.`], cta: 'Abrir GiGi' }),
  },
  review_answered: {
    en: (d) => ({ subject: `${d.doctor_name} reviewed your result`, title: 'Your result was reviewed', body: [`${d.doctor_name} replied about your ${d.marker} result.`], cta: 'Read the review' }),
    pt: (d) => ({ subject: `${d.doctor_name} revisou seu resultado`, title: 'Seu resultado foi revisado', body: [`${d.doctor_name} respondeu sobre seu resultado de ${d.marker}.`], cta: 'Ler a revisão' }),
    es: (d) => ({ subject: `${d.doctor_name} revisó tu resultado`, title: 'Tu resultado fue revisado', body: [`${d.doctor_name} respondió sobre tu resultado de ${d.marker}.`], cta: 'Leer la revisión' }),
  },
};

const esc = (s: string) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

// Same brand as the app: Instrument Serif logo with three Persimmon dots, DM Sans text
// (e-mail apps that block web fonts fall back to Georgia / Arial).
function html(m: Mail, link: string) {
  return `<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600&family=Instrument+Serif&display=swap" rel="stylesheet">
  <div style="background:#F5EEE8;padding:32px 16px;font-family:'DM Sans',Arial,sans-serif;color:#2A1A1C">
    <div style="max-width:520px;margin:0 auto;background:#FBF9F5;border:1px solid #E6DAD0;border-radius:20px;padding:32px">
      <div style="font-family:'Instrument Serif',Georgia,serif;font-size:44px;line-height:1;color:#561821;display:inline-block;position:relative;padding:6px 16px 0 0">GiGi<span style="position:absolute;top:0;right:0;font-family:Arial,sans-serif;font-size:9px;letter-spacing:2px;line-height:1;color:#E2683C">&#9679;&#9679;&#9679;</span></div>
      <h1 style="font-family:'Instrument Serif',Georgia,serif;font-weight:400;font-size:28px;margin:24px 0 12px">${esc(m.title)}</h1>
      ${m.body.map((p) => `<p style="font-size:15px;line-height:1.5;margin:0 0 12px">${esc(p)}</p>`).join('')}
      <a href="${link}" style="display:inline-block;margin-top:12px;background:#561821;color:#fff;padding:13px 22px;border-radius:999px;text-decoration:none;font-weight:600">${esc(m.cta)}</a>
    </div>
  </div>`;
}

Deno.serve(async (req) => {
  const payload = await req.json().catch(() => ({}));
  const id = payload?.id || payload?.record?.id;
  if (!id) return new Response('no id', { status: 400 });

  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  // Read the notification from the database (never trust the request body) and send it once.
  const { data: record } = await sb.from('notifications').select('*').eq('id', id).maybeSingle();
  if (!record) return new Response('unknown notification', { status: 404 });
  if (record.emailed_at) return new Response('already sent');
  await sb.from('notifications').update({ emailed_at: new Date().toISOString() }).eq('id', id).is('emailed_at', null);
  const { data: u } = await sb.auth.admin.getUserById(record.user_id);
  const { data: p } = await sb.from('profiles').select('language, full_name').eq('id', record.user_id).single();
  const lang = (p?.language as string) || 'en';
  const tpl = T[record.type]?.[lang] || T[record.type]?.en;
  if (!u?.user?.email || !tpl) return new Response('skip');

  const d = record.data || {};
  const when = d.starts_at ? new Date(d.starts_at).toLocaleString(lang === 'en' ? 'en-GB' : lang, { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Madrid' }) : '';
  const mail = tpl({ ...d, name: d.name || p?.full_name || '', when, marker: MARKERS[d.marker_code]?.[lang] || d.marker_code || '' });
  const link = `${Deno.env.get('APP_URL') || ''}#${record.link || ''}`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: Deno.env.get('EMAIL_FROM') || 'GiGi <onboarding@resend.dev>',
      to: u.user.email,
      subject: mail.subject,
      html: html(mail, link),
    }),
  });
  return new Response(await res.text(), { status: res.status });
});
