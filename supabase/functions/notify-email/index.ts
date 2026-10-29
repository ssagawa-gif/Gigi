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

type Mail = { subject: string; title: string; body: string[]; cta: string; extra?: string };
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
  admin_added: {
    en: (d) => ({ subject: 'You joined the GiGi team', title: `Welcome to the team, ${d.name}!`, body: ['You were added as a GiGi administrator. You can now approve the doctors who sign up and manage the team.'], cta: 'Open the admin page' }),
    pt: (d) => ({ subject: 'Você entrou na equipe GiGi', title: `Boas-vindas à equipe, ${d.name}!`, body: ['Você foi adicionada(o) como administradora do GiGi. Agora pode aprovar os médicos que se cadastram e gerenciar a equipe.'], cta: 'Abrir a página de admin' }),
    es: (d) => ({ subject: 'Te uniste al equipo GiGi', title: `¡Bienvenida al equipo, ${d.name}!`, body: ['Te añadieron como administradora de GiGi. Ya puedes aprobar a los médicos que se registran y gestionar el equipo.'], cta: 'Abrir la página de administración' }),
  },
  doctor_signup: {
    en: (d) => ({ subject: `New doctor waiting for approval: ${d.name}`, title: 'New doctor to approve', body: [`${d.name} signed up as a doctor on GiGi.`, 'Check their professional registration, then approve or decline them in the admin page.'], cta: 'Open doctor approvals' }),
    pt: (d) => ({ subject: `Novo médico aguardando aprovação: ${d.name}`, title: 'Novo médico para aprovar', body: [`${d.name} se cadastrou como médico(a) no GiGi.`, 'Confira o registro profissional e depois aprove ou recuse na página de admin.'], cta: 'Abrir aprovação de médicos' }),
    es: (d) => ({ subject: `Nuevo médico pendiente de aprobación: ${d.name}`, title: 'Nuevo médico por aprobar', body: [`${d.name} se registró como médico/a en GiGi.`, 'Revisa su número de colegiado y luego apruébalo o recházalo en la página de administración.'], cta: 'Abrir aprobaciones' }),
  },
  doctor_approved: {
    en: (d) => ({ subject: 'Your GiGi profile is approved', title: `You're in, ${d.name}!`, body: ['Your profile is approved. Patients can now find you on GiGi and book the free times in your agenda.', 'Open your agenda to add more times.'], cta: 'Open my agenda' }),
    pt: (d) => ({ subject: 'Seu perfil no GiGi foi aprovado', title: `Tudo pronto, ${d.name}!`, body: ['Seu perfil foi aprovado. As pacientes já podem te encontrar no GiGi e reservar os horários livres da sua agenda.', 'Abra sua agenda para adicionar mais horários.'], cta: 'Abrir minha agenda' }),
    es: (d) => ({ subject: 'Tu perfil en GiGi está aprobado', title: `¡Ya estás dentro, ${d.name}!`, body: ['Tu perfil está aprobado. Las pacientes ya pueden encontrarte en GiGi y reservar las horas libres de tu agenda.', 'Abre tu agenda para añadir más horas.'], cta: 'Abrir mi agenda' }),
  },
  doctor_rejected: {
    en: (d) => ({ subject: 'About your GiGi profile', title: `Hello, ${d.name}`, body: ['Thank you for your interest in GiGi. We could not approve your profile at this time.', 'If you think this is a mistake, reply to the GiGi team and we will take another look.'], cta: 'Open GiGi' }),
    pt: (d) => ({ subject: 'Sobre o seu perfil no GiGi', title: `Olá, ${d.name}`, body: ['Obrigada pelo interesse no GiGi. Não conseguimos aprovar o seu perfil neste momento.', 'Se achar que houve um engano, fale com a equipe GiGi e vamos olhar de novo.'], cta: 'Abrir o GiGi' }),
    es: (d) => ({ subject: 'Sobre tu perfil en GiGi', title: `Hola, ${d.name}`, body: ['Gracias por tu interés en GiGi. No hemos podido aprobar tu perfil por ahora.', 'Si crees que es un error, escribe al equipo de GiGi y lo revisaremos de nuevo.'], cta: 'Abrir GiGi' }),
  },
  review_requested: {
    en: (d) => ({ subject: `New review request from ${d.patient_name}`, title: 'New review request', body: [`${d.patient_name} asked you to review a ${d.marker} result on GiGi.`], cta: 'Open the review queue' }),
    pt: (d) => ({ subject: `Novo pedido de revisão de ${d.patient_name}`, title: 'Novo pedido de revisão', body: [`${d.patient_name} pediu sua revisão de um resultado de ${d.marker} no GiGi.`], cta: 'Abrir a fila de revisões' }),
    es: (d) => ({ subject: `Nueva solicitud de revisión de ${d.patient_name}`, title: 'Nueva solicitud de revisión', body: [`${d.patient_name} te pidió revisar un resultado de ${d.marker} en GiGi.`], cta: 'Abrir revisiones' }),
  },
  appointment_booked: {
    en: (d) => ({ subject: `New online visit: ${d.patient_name}, ${d.when}`, title: 'New online visit', body: [`${d.patient_name} booked an online visit with you for ${d.when}.`], cta: 'Open my agenda' }),
    pt: (d) => ({ subject: `Nova consulta online: ${d.patient_name}, ${d.when}`, title: 'Nova consulta online', body: [`${d.patient_name} marcou uma consulta online com você para ${d.when}.`], cta: 'Abrir minha agenda' }),
    es: (d) => ({ subject: `Nueva cita online: ${d.patient_name}, ${d.when}`, title: 'Nueva cita online', body: [`${d.patient_name} reservó una cita online contigo para el ${d.when}.`], cta: 'Abrir mi agenda' }),
  },
  appointment_confirmed: {
    en: (d) => ({ subject: `Your online visit with ${d.doctor_name} is confirmed`, title: 'Your visit is confirmed', body: [`Online visit with ${d.doctor_name} on ${d.when}.`, 'At the time of the visit, use the button below to join the video call from your phone or computer.'], cta: 'See my visit in GiGi' }),
    pt: (d) => ({ subject: `Sua consulta online com ${d.doctor_name} está confirmada`, title: 'Consulta confirmada', body: [`Consulta online com ${d.doctor_name} em ${d.when}.`, 'Na hora da consulta, use o botão abaixo para entrar na videochamada pelo celular ou computador.'], cta: 'Ver minha consulta no GiGi' }),
    es: (d) => ({ subject: `Tu cita online con ${d.doctor_name} está confirmada`, title: 'Cita confirmada', body: [`Cita online con ${d.doctor_name} el ${d.when}.`, 'A la hora de la cita, usa el botón de abajo para entrar en la videollamada desde el móvil o el ordenador.'], cta: 'Ver mi cita en GiGi' }),
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


const L: Record<string, Record<string, string>> = {
  join: { en: 'Join the video call', pt: 'Entrar na videochamada', es: 'Entrar en la videollamada' },
  addCal: { en: 'Add to your calendar', pt: 'Adicionar à sua agenda', es: 'Añadir a tu calendario' },
  ics: { en: 'Apple Calendar and others: open the attached file (gigi-visit.ics).', pt: 'Apple Calendar e outros: abra o arquivo anexo (gigi-consulta.ics).', es: 'Apple Calendar y otros: abre el archivo adjunto (gigi-cita.ics).' },
  title: { en: 'GiGi · Online visit with', pt: 'GiGi · Consulta online com', es: 'GiGi · Cita online con' },
  link: { en: 'Video call link', pt: 'Link da videochamada', es: 'Enlace de la videollamada' },
};
const icsName: Record<string, string> = { en: 'gigi-visit.ics', pt: 'gigi-consulta.ics', es: 'gigi-cita.ics' };
const utc = (dt: Date) => dt.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

function visitBlock(d: any, lang: string, who: string) {
  if (!d.starts_at || !d.meeting_url) return { html: '', ics: null as string | null };
  const start = new Date(d.starts_at), end = new Date(start.getTime() + (Number(d.minutes) || 30) * 60000);
  const title = `${L.title[lang]} ${who}`;
  const details = `${L.link[lang]}: ${d.meeting_url}`;
  const g = 'https://calendar.google.com/calendar/render?action=TEMPLATE'
    + `&text=${encodeURIComponent(title)}&dates=${utc(start)}/${utc(end)}`
    + `&details=${encodeURIComponent(details)}&location=${encodeURIComponent(d.meeting_url)}`;
  const o = 'https://outlook.live.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent'
    + `&subject=${encodeURIComponent(title)}&startdt=${encodeURIComponent(start.toISOString())}&enddt=${encodeURIComponent(end.toISOString())}`
    + `&body=${encodeURIComponent(details)}&location=${encodeURIComponent(d.meeting_url)}`;
  const btn = 'display:inline-block;margin:6px 6px 0 0;border:1px solid #E6DAD0;background:#fff;color:#561821;padding:9px 14px;border-radius:999px;text-decoration:none;font-weight:600;font-size:13px';
  const html = `
    <a href="${esc(d.meeting_url)}" style="display:inline-block;margin:8px 0 4px;background:#E2683C;color:#fff;padding:13px 22px;border-radius:999px;text-decoration:none;font-weight:600">${L.join[lang]}</a>
    <p style="font-size:12px;color:#7D6E6B;margin:4px 0 16px;word-break:break-all">${esc(d.meeting_url)}</p>
    <p style="font-size:14px;font-weight:600;margin:12px 0 2px">${L.addCal[lang]}</p>
    <a href="${g}" style="${btn}">Google Calendar</a><a href="${o}" style="${btn}">Outlook</a>
    <p style="font-size:12px;color:#7D6E6B;margin:8px 0 0">${L.ics[lang]}</p>`;
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//GiGi//EN', 'METHOD:PUBLISH', 'BEGIN:VEVENT',
    `UID:${d.appointment_id || crypto.randomUUID()}@gigihealth.app`, `DTSTAMP:${utc(new Date())}`,
    `DTSTART:${utc(start)}`, `DTEND:${utc(end)}`, `SUMMARY:${title}`, `DESCRIPTION:${details}`,
    `LOCATION:${d.meeting_url}`, `URL:${d.meeting_url}`,
    'BEGIN:VALARM', 'TRIGGER:-PT15M', 'ACTION:DISPLAY', `DESCRIPTION:${title}`, 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  return { html, ics };
}

// Same brand as the app. The logo is an image (public/email-logo.png, published with the site)
// because Gmail strips the CSS that places the three dots above the last "i".
function html(m: Mail, link: string, appUrl: string) {
  return `<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600&family=Instrument+Serif&display=swap" rel="stylesheet">
  <div style="background:#F5EEE8;padding:32px 16px;font-family:'DM Sans',Arial,sans-serif;color:#2A1A1C">
    <div style="max-width:520px;margin:0 auto;background:#FBF9F5;border:1px solid #E6DAD0;border-radius:20px;padding:32px">
      <img src="${appUrl}email-logo.png" width="120" height="72" alt="GiGi" style="display:block;border:0;outline:none;width:120px;height:auto">
      <h1 style="font-family:'Instrument Serif',Georgia,serif;font-weight:400;font-size:28px;margin:24px 0 12px">${esc(m.title)}</h1>
      ${m.body.map((p) => `<p style="font-size:15px;line-height:1.5;margin:0 0 12px">${esc(p)}</p>`).join('')}
      ${m.extra || ''}
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
  const when = d.starts_at ? new Date(d.starts_at).toLocaleString(lang === 'en' ? 'en-GB' : lang === 'pt' ? 'pt-BR' : 'es-ES',
    { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid', timeZoneName: 'short' }) : '';
  const mail = tpl({ ...d, name: d.name || p?.full_name || '', when, marker: MARKERS[d.marker_code]?.[lang] || d.marker_code || '' });
  const link = `${Deno.env.get('APP_URL') || ''}#${record.link || ''}`;

  // Visit e-mails: video link + add-to-calendar buttons + .ics attachment
  const isVisit = record.type === 'appointment_confirmed' || record.type === 'appointment_booked';
  const visit = isVisit ? visitBlock(d, lang, record.type === 'appointment_confirmed' ? d.doctor_name : d.patient_name) : { html: '', ics: null };
  mail.extra = visit.html;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: Deno.env.get('EMAIL_FROM') || 'GiGi <onboarding@resend.dev>',
      to: u.user.email,
      subject: mail.subject,
      html: html(mail, link, Deno.env.get('APP_URL') || ''),
      ...(visit.ics ? { attachments: [{ filename: icsName[lang] || icsName.en, content: btoa(unescape(encodeURIComponent(visit.ics))), content_type: 'text/calendar' }] } : {}),
    }),
  });
  return new Response(await res.text(), { status: res.status });
});
