// Real backend: Supabase (Postgres in the EU + auth + private file storage + realtime).
import { createClient } from '@supabase/supabase-js';

export function makeSupabaseBackend(url, anonKey) {
  const sb = createClient(url, anonKey);
  const listeners = new Set();
  const fire = () => listeners.forEach((fn) => fn());
  let channel = null;

  const uidOf = async () => (await sb.auth.getUser()).data.user?.id;
  const ok = ({ data, error }) => { if (error) throw new Error(error.message); return data; };

  async function doctorsWithNames(ids) {
    if (!ids.length) return {};
    const docs = ok(await sb.from('doctors').select('*').in('id', ids));
    const profs = ok(await sb.from('profiles').select('id, full_name').in('id', ids));
    const names = Object.fromEntries(profs.map((p) => [p.id, p.full_name]));
    return Object.fromEntries(docs.map((d) => [d.id, { ...d, full_name: names[d.id] }]));
  }
  async function profilesById(ids) {
    if (!ids.length) return {};
    const rows = ok(await sb.from('profiles').select('*').in('id', ids));
    return Object.fromEntries(rows.map((p) => [p.id, p]));
  }

  sb.auth.onAuthStateChange((_e, session) => {
    if (channel) { sb.removeChannel(channel); channel = null; }
    if (session?.user) {
      channel = sb.channel('notif-' + session.user.id)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${session.user.id}` }, fire)
        .subscribe();
    }
    fire();
  });

  return {
    mode: 'supabase',

    async getSession() {
      const { data } = await sb.auth.getSession();
      const user = data.session?.user;
      if (!user) return null;
      const profile = ok(await sb.from('profiles').select('*').eq('id', user.id).maybeSingle());
      return { user: { id: user.id, email: user.email }, profile };
    },
    async signIn({ email, password }) {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw new Error('auth.invalid');
      return this.getSession();
    },
    async signUp({ email, password, full_name, role, language }) {
      const { data, error } = await sb.auth.signUp({ email, password, options: { data: { full_name, role, language } } });
      if (error) throw new Error(error.message.includes('registered') ? 'auth.exists' : error.message);
      if (!data.session) throw new Error('auth.confirm');
      return this.getSession();
    },
    async signOut() { await sb.auth.signOut(); },
    onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },

    async updateProfile(patch) { const id = await uidOf(); const row = ok(await sb.from('profiles').update(patch).eq('id', id).select().single()); fire(); return row; },
    async updateDoctor(patch) { const id = await uidOf(); return ok(await sb.from('doctors').update(patch).eq('id', id).select().single()); },

    async listDoctors() {
      const docs = ok(await sb.from('doctors').select('*').eq('verified', true));
      const map = await doctorsWithNames(docs.map((d) => d.id));
      return Object.values(map);
    },
    async getDoctor(id) { return (await doctorsWithNames([id]))[id] || null; },

    async listResults(patientId) {
      const pid = patientId || (await uidOf());
      return ok(await sb.from('results').select('*').eq('patient_id', pid).order('test_date'));
    },
    async addReport({ file, lab_name, country, test_date }) {
      const id = await uidOf();
      let file_path = null;
      if (file) {
        const safe = file.name.replace(/[^\w.-]+/g, '_');
        file_path = `${id}/${Date.now()}_${safe}`;
        ok(await sb.storage.from('lab-reports').upload(file_path, file, { contentType: file.type }));
      }
      return ok(await sb.from('lab_reports').insert({ file_path, file_name: file?.name || null, lab_name, country, test_date }).select().single());
    },
    async listReports() {
      const rows = ok(await sb.from('lab_reports').select('*').order('test_date', { ascending: false }));
      return rows.map((r) => ({ ...r, has_file: !!r.file_path }));
    },
    async reportFileUrl(reportId) {
      const r = ok(await sb.from('lab_reports').select('file_path').eq('id', reportId).single());
      if (!r.file_path) return null;
      return ok(await sb.storage.from('lab-reports').createSignedUrl(r.file_path, 300)).signedUrl;
    },
    async addResults(rows) { const saved = ok(await sb.from('results').insert(rows).select()); fire(); return saved; },
    async deleteResult(id) { ok(await sb.from('results').delete().eq('id', id)); fire(); },

    async requestReview({ doctor_id, marker_code, result_ids, note, share_days = 30 }) {
      const me = await uidOf();
      const active = ok(await sb.from('shares').select('id').eq('patient_id', me).eq('doctor_id', doctor_id).is('revoked_at', null).gt('expires_at', new Date().toISOString()));
      if (!active.length) {
        ok(await sb.from('shares').insert({ doctor_id, scopes: ['bloodwork'], expires_at: new Date(Date.now() + share_days * 864e5).toISOString() }));
      }
      const rev = ok(await sb.from('review_requests').insert({ doctor_id, marker_code, result_ids, note }).select().single());
      fire(); return rev;
    },
    async listMyReviews() {
      const me = await uidOf();
      const rows = ok(await sb.from('review_requests').select('*').eq('patient_id', me).order('created_at', { ascending: false }));
      const docs = await doctorsWithNames([...new Set(rows.map((r) => r.doctor_id))]);
      return rows.map((r) => ({ ...r, doctor: docs[r.doctor_id] || { id: r.doctor_id } }));
    },
    async rateReview(id, rating) { ok(await sb.from('review_requests').update({ trust_rating: rating }).eq('id', id)); },
    async listDoctorQueue() {
      const me = await uidOf();
      const rows = ok(await sb.from('review_requests').select('*').eq('doctor_id', me).order('created_at', { ascending: false }));
      const pats = await profilesById([...new Set(rows.map((r) => r.patient_id))]);
      return rows.map((r) => ({ ...r, patient: pats[r.patient_id] }))
        .sort((a, b) => (a.status === b.status ? 0 : a.status === 'open' ? -1 : 1));
    },
    async answerReview(id, { response, recommendation }) {
      const row = ok(await sb.from('review_requests').update({ response, recommendation, status: 'answered' }).eq('id', id).select().single());
      fire(); return row;
    },

    async listSlots(doctorId) { return ok(await sb.from('slots').select('*').eq('doctor_id', doctorId).order('starts_at')); },
    async addSlots(slots) {
      const rows = slots.map((s) => ({ ...s, starts_at: new Date(s.starts_at).toISOString() }));
      const saved = ok(await sb.from('slots').insert(rows).select()); fire(); return saved;
    },
    async deleteSlot(id) { ok(await sb.from('slots').delete().eq('id', id)); fire(); },
    async book(slotId, { type, note }) {
      const { data, error } = await sb.rpc('book_slot', { p_slot: slotId, p_type: type, p_note: note || null });
      if (error) throw new Error(error.message.includes('book.taken') ? 'book.taken' : error.message);
      fire(); return data;
    },
    async listAppointments() {
      const rows = ok(await sb.from('appointments').select('*').eq('status', 'booked').order('starts_at'));
      const docs = await doctorsWithNames([...new Set(rows.map((r) => r.doctor_id))]);
      const pats = await profilesById([...new Set(rows.map((r) => r.patient_id))]);
      return rows.map((a) => ({ ...a, doctor: docs[a.doctor_id] || { id: a.doctor_id }, patient: pats[a.patient_id] }));
    },
    async cancelAppointment(id) { ok(await sb.rpc('cancel_appointment', { p_id: id })); fire(); },

    async listShares() {
      const rows = ok(await sb.from('shares').select('*').order('created_at', { ascending: false }));
      const docs = await doctorsWithNames([...new Set(rows.map((r) => r.doctor_id))]);
      const pats = await profilesById([...new Set(rows.map((r) => r.patient_id))]);
      return rows.map((s) => ({ ...s, doctor: docs[s.doctor_id] || { id: s.doctor_id }, patient: pats[s.patient_id] }));
    },
    async createShare({ doctor_id, scopes, days }) {
      const row = ok(await sb.from('shares').insert({ doctor_id, scopes, expires_at: new Date(Date.now() + days * 864e5).toISOString() }).select().single());
      fire(); return row;
    },
    async revokeShare(id) { ok(await sb.from('shares').update({ revoked_at: new Date().toISOString() }).eq('id', id)); fire(); },

    async listNotifications() { return ok(await sb.from('notifications').select('*').order('created_at', { ascending: false }).limit(50)); },
    async markRead(id) {
      let q = sb.from('notifications').update({ read_at: new Date().toISOString() }).is('read_at', null);
      q = id ? q.eq('id', id) : q.eq('user_id', await uidOf());
      ok(await q); fire();
    },

    async exportAll() {
      const me = await uidOf();
      const [profile, results, reports, reviews, appointments, shares] = await Promise.all([
        sb.from('profiles').select('*').eq('id', me).single(),
        sb.from('results').select('*').eq('patient_id', me),
        sb.from('lab_reports').select('*').eq('patient_id', me),
        sb.from('review_requests').select('*').eq('patient_id', me),
        sb.from('appointments').select('*').eq('patient_id', me),
        sb.from('shares').select('*').eq('patient_id', me),
      ]);
      return { exported_at: new Date().toISOString(), profile: profile.data, results: results.data, reports: reports.data,
        reviews: reviews.data, appointments: appointments.data, shares: shares.data };
    },
    async deleteAccount() {
      const me = await uidOf();
      const { data: files } = await sb.storage.from('lab-reports').list(me);
      if (files?.length) await sb.storage.from('lab-reports').remove(files.map((f) => `${me}/${f.name}`));
      ok(await sb.rpc('delete_my_account'));
      await sb.auth.signOut();
    },
    // ---------- GiGi admin (doctor approvals) ----------
    async isAdmin() { const { data } = await sb.rpc('is_admin'); return !!data; },
    async adminListDoctors() { return ok(await sb.rpc('admin_list_doctors')); },
    async adminSetDoctor(id, status) { ok(await sb.rpc('admin_set_doctor', { p_id: id, p_status: status })); fire(); },

    async joinWaitlist(entry) { ok(await sb.from('waitlist').insert(entry)); },
  };
}
