const isoDaysAgo = (n) => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);
// Sample data from the GiGi MVP App Flow doc (Laura, 31 · Dr Marta Puig). Fictional.
import { buildResult } from './markers.js';

const LAB = 'Synlab Barcelona';
const ES = 'ES';

export const LAURA = 'u-laura';
export const MARTA = 'u-marta';
export const MARC = 'u-marc';
export const LAIA = 'u-laia';

function r(code, value, unit, low, high, date) {
  return { id: `res-${code}-${date}`, patient_id: LAURA, report_id: null, created_at: date + 'T09:00:00Z',
    ...buildResult({ code, value, unit, low, high, date, lab: LAB, country: ES }) };
}

export function seed() {
  const now = new Date().toISOString();
  return {
    users: [
      { id: LAURA, email: 'laura@demo.gigi', password: 'demo' },
      { id: MARTA, email: 'marta@demo.gigi', password: 'demo' },
      { id: MARC, email: 'marc@demo.gigi', password: 'demo' },
      { id: LAIA, email: 'laia@demo.gigi', password: 'demo' },
    ],
    profiles: [
      { id: LAURA, role: 'patient', full_name: 'Laura', language: 'en', city: 'Gràcia, Barcelona', country: ES,
        reasons: ['understand', 'fertility'], insurer: 'Sanitas', consent_at: now,
        history_note: 'Laura, 31. Stopped the combined pill in June 2026. Would like children in the next few years. Insured with Sanitas.',
        birth_date: '1995-03-14', plan: 'free',
        medical_history: { cycle: 'regular', cycle_length: 28, contraception: 'none', contraception_detail: '',
          allergies: { has: false, detail: '' }, medications: { has: false, detail: '' }, conditions: { has: false, detail: '' },
          surgeries: { has: false, detail: '' }, cancer: { has: false, detail: '' }, family: { has: false, detail: '' },
          supplements: { has: false, items: [] }, symptoms: { has: false, detail: '' }, last_illness: { date: '', what: '' } },
        // two logged periods, relative to today, so the demo cycle card has something to show
        period_starts: [isoDaysAgo(9), isoDaysAgo(37)] },
      { id: MARTA, role: 'doctor', full_name: 'Dr Marta Puig', language: 'es', country: ES },
      { id: MARC, role: 'doctor', full_name: 'Dr Marc Rovira', language: 'es', country: ES },
      { id: LAIA, role: 'doctor', full_name: 'Dr Laia Soler', language: 'es', country: ES },
    ],
    doctors: [
      { id: MARTA, verified: true, specialty: 'gyn', area: 'Sant Gervasi, Barcelona', languages: ['Spanish', 'Catalan', 'English'],
        consultation: 'video', insurers: ['Sanitas', 'Adeslas', 'DKV', 'Asisa', 'Mapfre'], first_visit_fee: 150, results_visit_fee: 50,
        bio: '15 years in fertility planning and preventive gynaecology. Reviews GiGi results within 48 hours.' },
      { id: MARC, verified: true, specialty: 'endo', area: 'Eixample, Barcelona', languages: ['Catalan', 'Spanish'],
        consultation: 'video', insurers: ['Sanitas', 'DKV'], first_visit_fee: 130, results_visit_fee: null, bio: '' },
      { id: LAIA, verified: true, specialty: 'fertility', area: 'Gràcia, Barcelona', languages: ['Spanish', 'Catalan', 'English', 'French'],
        consultation: 'video', insurers: ['Adeslas', 'Asisa'], first_visit_fee: 170, results_visit_fee: null, bio: '' },
    ],
    reports: [],
    results: [
      r('ferritin', 11, 'ng/mL', 15, 150, '2024-10-15'),
      r('ferritin', 14, 'ng/mL', 15, 150, '2025-03-15'),
      r('ferritin', 19, 'ng/mL', 15, 150, '2026-03-15'),
      r('ferritin', 28, 'ng/mL', 15, 150, '2026-09-12'),
      r('ferritin', 14, 'ng/mL', 15, 150, '2026-10-20'),
      r('haemoglobin', 12.8, 'g/dL', 12.0, 15.5, '2026-03-15'),
      r('haemoglobin', 12.9, 'g/dL', 12.0, 15.5, '2026-10-20'),
      r('vitamin_d', 18, 'ng/mL', 30, 100, '2026-02-15'),
      r('vitamin_d', 32, 'ng/mL', 30, 100, '2026-10-20'),
      r('tsh', 2.1, 'mIU/L', 0.4, 4.0, '2025-03-15'),
      r('tsh', 1.8, 'mIU/L', 0.4, 4.0, '2026-03-15'),
      r('tsh', 1.9, 'mIU/L', 0.4, 4.0, '2026-09-12'),
    ],
    reviews: [
      { id: 'rev-vitd', patient_id: LAURA, doctor_id: MARTA, marker_code: 'vitamin_d', result_ids: ['res-vitamin_d-2026-02-15'],
        note: '', status: 'answered', created_at: '2026-02-18T10:00:00Z', answered_at: '2026-02-20T10:00:00Z',
        response: "This is a little low, which is common in winter. I'd suggest a recheck this month and, if still low, a simple supplement.",
        recommendation: 'recheck', trust_rating: null },
    ],
    // sample free times always in the coming days (fixed dates expired, so the demo showed no times)
    slots: [[2, '10:00'], [3, '16:30'], [5, '09:15'], [8, '18:00']].map(([d, hm], i) => {
      const t = new Date(Date.now() + d * 864e5); const [h, m] = hm.split(':');
      t.setHours(Number(h), Number(m), 0, 0);
      return { id: 's' + (i + 1), doctor_id: MARTA, starts_at: t.toISOString(), minutes: 30, booked: false };
    }),
    appointments: [],
    shares: [
      { id: 'sh1', patient_id: LAURA, doctor_id: MARTA, scopes: ['bloodwork', 'history'], created_at: '2026-10-01T09:00:00Z',
        expires_at: new Date(Date.now() + 45 * 864e5).toISOString(), revoked_at: null },
    ],
    notifications: [],
    waitlist: [],
  };
}
