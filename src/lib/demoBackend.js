// Demo backend: same API as the Supabase backend, but data lives in this browser (localStorage).
// Used automatically when no Supabase keys are configured, so the team can click through
// the whole flow (patient + doctor, even in two tabs) before connecting the real database.
import { seed } from './seed.js';

const KEY = 'gigi_demo_db_v1';
const SESSION = 'gigi_demo_session';
const listeners = new Set();
const uid = () => Math.random().toString(36).slice(2, 10);
const nowIso = () => new Date().toISOString();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  const db = seed();
  save(db, false);
  return db;
}
function save(db, notify = true) {
  try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { /* ignore */ }
  if (notify) listeners.forEach((fn) => fn());
}
// Other tabs (e.g. doctor console open next to the patient app) see changes live.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => { if (e.key === KEY) listeners.forEach((fn) => fn()); });
}

function me() {
  try { return sessionStorage.getItem(SESSION); } catch { return null; }
}
function requireMe() {
  const id = me();
  if (!id) throw new Error('Not signed in');
  return id;
}
function notify(db, user_id, type, data, link) {
  db.notifications.push({ id: uid(), user_id, type, data, link, read_at: null, created_at: nowIso() });
}
function activeShare(db, patient_id, doctor_id) {
  const t = Date.now();
  return db.shares.some((s) => s.patient_id === patient_id && s.doctor_id === doctor_id && !s.revoked_at && new Date(s.expires_at).getTime() > t);
}
function doctorView(db, d) {
  const p = db.profiles.find((x) => x.id === d.id);
  return { ...d, full_name: p?.full_name };
}

export const demoBackend = {
  mode: 'demo',

  // ---------- auth ----------
  async getSession() {
    const db = load();
    const id = me();
    if (!id) return null;
    const user = db.users.find((u) => u.id === id);
    const profile = db.profiles.find((p) => p.id === id);
    return user ? { user: { id, email: user.email }, profile } : null;
  },
  async signIn({ email, password }) {
    const db = load();
    const u = db.users.find((x) => x.email.toLowerCase() === email.toLowerCase() && x.password === password);
    if (!u) throw new Error('auth.invalid');
    sessionStorage.setItem(SESSION, u.id);
    listeners.forEach((fn) => fn());
    return this.getSession();
  },
  async signInAs(id) {
    sessionStorage.setItem(SESSION, id);
    listeners.forEach((fn) => fn());
    return this.getSession();
  },
  async signUp({ email, password, full_name, role, language }) {
    const db = load();
    if (db.users.some((u) => u.email.toLowerCase() === email.toLowerCase())) throw new Error('auth.exists');
    const id = 'u-' + uid();
    db.users.push({ id, email, password });
    db.profiles.push({ id, role: role || 'patient', full_name, language, reasons: [], consent_at: nowIso() });
    notify(db, id, role === 'doctor' ? 'welcome_doctor' : 'welcome', { name: full_name }, role === 'doctor' ? '/doctor/profile' : '/add');
    if (role === 'doctor') db.doctors.push({ id, verified: true, specialty: 'gyn', area: '', languages: [], insurers: [], consultation: 'both', first_visit_fee: null, results_visit_fee: null, bio: '' });
    save(db);
    sessionStorage.setItem(SESSION, id);
    return this.getSession();
  },
  async signOut() { sessionStorage.removeItem(SESSION); listeners.forEach((fn) => fn()); },
  onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  async resetDemo() { localStorage.removeItem(KEY); sessionStorage.removeItem(SESSION); listeners.forEach((fn) => fn()); },

  // ---------- profile ----------
  async updateProfile(patch) {
    const db = load(); const id = requireMe();
    const p = db.profiles.find((x) => x.id === id);
    Object.assign(p, patch);
    save(db); return p;
  },
  async updateDoctor(patch) {
    const db = load(); const id = requireMe();
    const d = db.doctors.find((x) => x.id === id);
    Object.assign(d, patch); save(db); return d;
  },

  // ---------- doctors ----------
  async listDoctors() { const db = load(); return db.doctors.filter((d) => d.verified).map((d) => doctorView(db, d)); },
  async getDoctor(id) { const db = load(); const d = db.doctors.find((x) => x.id === id); return d ? doctorView(db, d) : null; },

  // ---------- results ----------
  async listResults(patientId) {
    const db = load(); const id = requireMe();
    const pid = patientId || id;
    if (pid !== id && !activeShare(db, pid, id)) return [];
    return db.results.filter((r) => r.patient_id === pid).sort((a, b) => a.test_date.localeCompare(b.test_date));
  },
  async addReport({ file, lab_name, country, test_date }) {
    const db = load(); const id = requireMe();
    let file_data = null;
    if (file && file.size < 1.5 * 1024 * 1024) {
      file_data = await new Promise((res) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(file); });
    }
    const rep = { id: 'rep-' + uid(), patient_id: id, file_name: file?.name || null, file_data, lab_name, country, test_date, created_at: nowIso() };
    db.reports.push(rep); save(db); return rep;
  },
  async listReports() { const db = load(); const id = requireMe(); return db.reports.filter((r) => r.patient_id === id).map(({ file_data, ...r }) => ({ ...r, has_file: !!file_data })); },
  async reportFileUrl(reportId) { const db = load(); return db.reports.find((r) => r.id === reportId)?.file_data || null; },
  async addResults(rows) {
    const db = load(); const id = requireMe();
    const saved = rows.map((r) => ({ id: 'res-' + uid(), patient_id: id, created_at: nowIso(), ...r }));
    db.results.push(...saved); save(db); return saved;
  },
  async deleteResult(resultId) {
    const db = load(); const id = requireMe();
    db.results = db.results.filter((r) => !(r.id === resultId && r.patient_id === id)); save(db);
  },

  // ---------- reviews (the "chamado" to the doctor) ----------
  async requestReview({ doctor_id, marker_code, result_ids, note, share_days = 30 }) {
    const db = load(); const id = requireMe();
    const me = db.profiles.find((p) => p.id === id);
    const rev = { id: 'rev-' + uid(), patient_id: id, doctor_id, marker_code, result_ids, note, status: 'open', created_at: nowIso(), answered_at: null, response: null, recommendation: null, trust_rating: null };
    db.reviews.push(rev);
    if (!activeShare(db, id, doctor_id)) {
      db.shares.push({ id: 'sh-' + uid(), patient_id: id, doctor_id, scopes: ['bloodwork'], created_at: nowIso(), expires_at: new Date(Date.now() + share_days * 864e5).toISOString(), revoked_at: null });
    }
    notify(db, doctor_id, 'review_requested', { patient_name: me?.full_name, marker_code }, `/doctor/queue/${rev.id}`);
    save(db); return rev;
  },
  async listMyReviews() { const db = load(); const id = requireMe(); return db.reviews.filter((r) => r.patient_id === id).map((r) => ({ ...r, doctor: doctorView(db, db.doctors.find((d) => d.id === r.doctor_id) || { id: r.doctor_id }) })); },
  async rateReview(reviewId, rating) { const db = load(); const r = db.reviews.find((x) => x.id === reviewId); r.trust_rating = rating; save(db); },
  async listDoctorQueue() {
    const db = load(); const id = requireMe();
    return db.reviews.filter((r) => r.doctor_id === id)
      .map((r) => ({ ...r, patient: db.profiles.find((p) => p.id === r.patient_id) }))
      .sort((a, b) => (a.status === b.status ? b.created_at.localeCompare(a.created_at) : a.status === 'open' ? -1 : 1));
  },
  async answerReview(reviewId, { response, recommendation }) {
    const db = load(); const id = requireMe();
    const r = db.reviews.find((x) => x.id === reviewId && x.doctor_id === id);
    Object.assign(r, { response, recommendation, status: 'answered', answered_at: nowIso() });
    const doc = db.profiles.find((p) => p.id === id);
    notify(db, r.patient_id, 'review_answered', { doctor_name: doc?.full_name, marker_code: r.marker_code }, `/marker/${r.marker_code}`);
    save(db); return r;
  },

  // ---------- agenda ----------
  async listSlots(doctorId) {
    const db = load();
    return db.slots.filter((s) => s.doctor_id === doctorId).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  },
  async addSlots(slots) {
    const db = load(); const id = requireMe();
    const rows = slots.map((s) => ({ id: 's-' + uid(), doctor_id: id, booked: false, ...s }));
    db.slots.push(...rows); save(db); return rows;
  },
  async deleteSlot(slotId) { const db = load(); const id = requireMe(); db.slots = db.slots.filter((s) => !(s.id === slotId && s.doctor_id === id && !s.booked)); save(db); },
  async book(slotId, { type, note }) {
    const db = load(); const id = requireMe();
    const s = db.slots.find((x) => x.id === slotId);
    if (!s || s.booked) throw new Error('book.taken');
    s.booked = true;
    const appt = { id: 'ap-' + uid(), slot_id: s.id, doctor_id: s.doctor_id, patient_id: id, starts_at: s.starts_at, minutes: s.minutes, type, note, status: 'booked', created_at: nowIso() };
    db.appointments.push(appt);
    const me = db.profiles.find((p) => p.id === id);
    notify(db, s.doctor_id, 'appointment_booked', { patient_name: me?.full_name, starts_at: s.starts_at, type }, '/doctor/agenda');
    save(db); return appt;
  },
  async listAppointments() {
    const db = load(); const id = requireMe();
    return db.appointments.filter((a) => (a.patient_id === id || a.doctor_id === id) && a.status === 'booked')
      .map((a) => ({ ...a, doctor: doctorView(db, db.doctors.find((d) => d.id === a.doctor_id) || { id: a.doctor_id }), patient: db.profiles.find((p) => p.id === a.patient_id) }))
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  },
  async cancelAppointment(apptId) {
    const db = load(); const id = requireMe();
    const a = db.appointments.find((x) => x.id === apptId && (x.patient_id === id || x.doctor_id === id));
    a.status = 'cancelled';
    const s = db.slots.find((x) => x.id === a.slot_id); if (s) s.booked = false;
    const other = id === a.patient_id ? a.doctor_id : a.patient_id;
    const me = db.profiles.find((p) => p.id === id);
    notify(db, other, 'appointment_cancelled', { name: me?.full_name, starts_at: a.starts_at }, other === a.doctor_id ? '/doctor/agenda' : '/home');
    save(db);
  },

  // ---------- sharing ----------
  async listShares() {
    const db = load(); const id = requireMe();
    return db.shares.filter((s) => s.patient_id === id || s.doctor_id === id)
      .map((s) => ({ ...s, doctor: doctorView(db, db.doctors.find((d) => d.id === s.doctor_id) || { id: s.doctor_id }), patient: db.profiles.find((p) => p.id === s.patient_id) }));
  },
  async createShare({ doctor_id, scopes, days }) {
    const db = load(); const id = requireMe();
    const sh = { id: 'sh-' + uid(), patient_id: id, doctor_id, scopes, created_at: nowIso(), expires_at: new Date(Date.now() + days * 864e5).toISOString(), revoked_at: null };
    db.shares.push(sh); save(db); return sh;
  },
  async revokeShare(shareId) { const db = load(); const id = requireMe(); const s = db.shares.find((x) => x.id === shareId && x.patient_id === id); s.revoked_at = nowIso(); save(db); },

  // ---------- notifications ----------
  async listNotifications() { const db = load(); const id = requireMe(); return db.notifications.filter((n) => n.user_id === id).sort((a, b) => b.created_at.localeCompare(a.created_at)); },
  async markRead(nid) { const db = load(); const id = requireMe(); db.notifications.forEach((n) => { if (n.user_id === id && (!nid || n.id === nid) && !n.read_at) n.read_at = nowIso(); }); save(db); },

  // ---------- data rights ----------
  async exportAll() {
    const db = load(); const id = requireMe();
    return {
      exported_at: nowIso(),
      profile: db.profiles.find((p) => p.id === id),
      results: db.results.filter((r) => r.patient_id === id),
      reports: db.reports.filter((r) => r.patient_id === id).map(({ file_data, ...r }) => r),
      reviews: db.reviews.filter((r) => r.patient_id === id),
      appointments: db.appointments.filter((a) => a.patient_id === id),
      shares: db.shares.filter((s) => s.patient_id === id),
    };
  },
  async deleteAccount() {
    const db = load(); const id = requireMe();
    for (const k of ['results', 'reports', 'reviews', 'appointments', 'shares']) db[k] = db[k].filter((x) => x.patient_id !== id);
    db.notifications = db.notifications.filter((n) => n.user_id !== id);
    db.profiles = db.profiles.filter((p) => p.id !== id);
    db.users = db.users.filter((u) => u.id !== id);
    save(db); sessionStorage.removeItem(SESSION);
  },
  async joinWaitlist(entry) { const db = load(); db.waitlist.push({ ...entry, created_at: nowIso() }); save(db); },
};
