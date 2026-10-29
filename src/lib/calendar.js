// "Add to calendar" helpers for an online visit (Google, Outlook, and an .ics file for Apple and others).
const utc = (d) => new Date(d).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

export function visitEvent(appt, title) {
  const start = new Date(appt.starts_at);
  const end = new Date(start.getTime() + (Number(appt.minutes) || 30) * 60000);
  return { title, start, end, link: appt.meeting_url, id: appt.id };
}

export function googleCalendarUrl(e) {
  return 'https://calendar.google.com/calendar/render?action=TEMPLATE'
    + `&text=${encodeURIComponent(e.title)}&dates=${utc(e.start)}/${utc(e.end)}`
    + `&details=${encodeURIComponent(e.link)}&location=${encodeURIComponent(e.link)}`;
}

export function outlookCalendarUrl(e) {
  return 'https://outlook.live.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent'
    + `&subject=${encodeURIComponent(e.title)}&startdt=${encodeURIComponent(e.start.toISOString())}`
    + `&enddt=${encodeURIComponent(e.end.toISOString())}&body=${encodeURIComponent(e.link)}&location=${encodeURIComponent(e.link)}`;
}

export function downloadIcs(e, filename = 'gigi-visit.ics') {
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//GiGi//EN', 'METHOD:PUBLISH', 'BEGIN:VEVENT',
    `UID:${e.id}@gigihealth.app`, `DTSTAMP:${utc(new Date())}`, `DTSTART:${utc(e.start)}`, `DTEND:${utc(e.end)}`,
    `SUMMARY:${e.title}`, `DESCRIPTION:${e.link}`, `LOCATION:${e.link}`, `URL:${e.link}`,
    'BEGIN:VALARM', 'TRIGGER:-PT15M', 'ACTION:DISPLAY', `DESCRIPTION:${e.title}`, 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
  a.download = filename; a.click();
}
