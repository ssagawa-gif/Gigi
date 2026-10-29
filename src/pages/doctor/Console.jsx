import { useMemo, useState, useEffect } from 'react';
import { NavLink, useNavigate, useParams } from 'react-router-dom';
import Icon from '../../components/Icon.jsx';
import Logo from '../../components/Logo.jsx';
import TrendChart from '../../components/TrendChart.jsx';
import Compare from '../../components/Compare.jsx';
import { StatusBadge, Loading, Empty, Bell, LangPicker } from '../../components/ui.jsx';
import { MarkerList } from '../patient/Record.jsx';
import PatientSummary from '../../components/PatientSummary.jsx';
import { NotificationsList } from '../patient/More.jsx';
import { useI18n } from '../../i18n/index.jsx';
import { api, IS_DEMO } from '../../lib/api.js';
import { useSession, useData } from '../../lib/session.jsx';
import { markerName } from '../../lib/markers.js';
import { byMarker } from '../../lib/results.js';

export function DoctorShell({ children, title, actions }) {
  const { t } = useI18n();
  const nav = useNavigate();
  const { session, refresh } = useSession();
  const { data: queue } = useData(() => api.listDoctorQueue(), []);
  const { data: notifs } = useData(() => api.listNotifications(), []);
  const { data: me } = useData(() => api.getDoctor(session?.user?.id), [session?.user?.id]);
  const open = (queue || []).filter((r) => r.status === 'open').length;
  const unread = (notifs || []).filter((n) => !n.read_at).length;
  const links = [
    ['/doctor', 'inbox', t('doc.nav.queue'), open],
    ['/doctor/agenda', 'calendar', t('doc.nav.agenda')],
    ['/doctor/patients', 'users', t('doc.nav.patients')],
    ['/doctor/notifications', 'bell', t('doc.nav.notifications'), unread],
  ];
  return (
    <div className="console">
      <aside className="sidebar">
        <Logo size={40} light style={{ margin: '0 8px 18px', alignSelf: 'flex-start' }} />
        <div className="tiny" style={{ opacity: .7, margin: '-12px 8px 16px' }}>{t('doc.console')}</div>
        {links.map(([to, icon, label, n]) => (
          <NavLink key={to} to={to} end={to === '/doctor'} className={({ isActive }) => (isActive ? 'active' : '')}>
            <Icon name={icon} size={18} />{label}{n ? <span className="count">{n}</span> : null}
          </NavLink>
        ))}
        <div className="spacer" />
        <NavLink to="/doctor/profile" className={({ isActive }) => (isActive ? 'active' : '')}><Icon name="settings" size={18} />{t('doc.nav.profile')}</NavLink>
        <a href="#/" onClick={async (e) => { e.preventDefault(); await api.signOut(); await refresh(); nav('/'); }}><Icon name="logout" size={18} />{t('settings.logout')}</a>
        <div className="tiny" style={{ opacity: .7, padding: '8px 12px' }}>{session?.profile?.full_name}</div>
      </aside>
      <div>
        <nav className="mobile-tabs">
          {links.map(([to, , label, n]) => (
            <NavLink key={to} to={to} end={to === '/doctor'} className={({ isActive }) => (isActive ? 'active' : '')}>{label}{n ? ` (${n})` : ''}</NavLink>
          ))}
        </nav>
        <main className="main">
          <div className="main-head">
            <h1 style={{ fontSize: 34 }}>{title}</h1>
            <div className="row">{actions}<Bell to="/doctor/notifications" /></div>
          </div>
          {me && !me.verified && (
            <div className="card-tan small" style={{ marginBottom: 16 }}>{me.review_status === 'rejected' ? t('doc.rejected') : t('doc.pending')}</div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ Review queue
export function Queue() {
  const { id } = useParams();
  const { t, lang, fmtDate } = useI18n();
  const nav = useNavigate();
  const { data, loading } = useData(() => api.listDoctorQueue(), []);
  const [filter, setFilter] = useState('open');
  const list = (data || []).filter((r) => filter === 'all' || r.status === filter);
  const selected = (data || []).find((r) => r.id === id) || (!id && list[0]) || null;

  return (
    <DoctorShell title={t('doc.queue.title')}>
      <div className="split">
        <div>
          <div className="chips" style={{ marginBottom: 12 }}>
            {['open', 'answered', 'all'].map((k) => <button key={k} className={'chip' + (filter === k ? ' on' : '')} onClick={() => setFilter(k)}>{t('doc.queue.' + k)}</button>)}
          </div>
          {loading ? <Loading /> : list.length ? (
            <div className="stack">
              {list.map((r) => (
                <div key={r.id} className={'card queue-item' + (selected?.id === r.id ? ' on' : '')} onClick={() => nav(`/doctor/queue/${r.id}`)}>
                  <div className="row between"><b>{r.patient?.full_name || '—'}</b><span className={'badge ' + (r.status === 'open' ? 'cherry' : 'normal')}>{t('doc.status.' + r.status)}</span></div>
                  <div className="small mt8">{markerName(r.marker_code, lang)}</div>
                  <div className="tiny muted">{fmtDate(r.created_at)}</div>
                </div>
              ))}
            </div>
          ) : <Empty>{t('doc.queue.empty')}</Empty>}
        </div>
        <div>{selected ? <CaseView review={selected} key={selected.id} /> : !loading && <Empty>{t('doc.queue.pick')}</Empty>}</div>
      </div>
    </DoctorShell>
  );
}

function CaseView({ review }) {
  const { t, lang, fmtDate, fmtNum } = useI18n();
  const { showToast } = useSession();
  const { data, loading } = useData(() => api.listResults(review.patient_id), [review.patient_id]);
  const { data: extra } = useData(async () => ({ appts: (await api.listAppointments()).filter((a) => a.patient_id === review.patient_id), reviews: (await api.listDoctorQueue()).filter((r) => r.patient_id === review.patient_id) }), [review.patient_id]);
  const [response, setResponse] = useState(review.response || '');
  const [rec, setRec] = useState(review.recommendation || '');
  const [busy, setBusy] = useState(false);
  const results = data || [];
  const list = results.filter((r) => r.marker_code === review.marker_code);
  const last = list[list.length - 1];

  // Editable draft built from the rules (facts only, no diagnosis): the doctor rewrites it.
  useEffect(() => {
    if (!review.response && last && !response) {
      setResponse(t('doc.draft', {
        marker: markerName(review.marker_code, lang), value: fmtNum(last.value), unit: last.unit,
        status: t('status.' + last.status).toLowerCase(), low: fmtNum(last.ref_low), high: fmtNum(last.ref_high),
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [last?.id]);

  async function send() {
    setBusy(true);
    await api.answerReview(review.id, { response, recommendation: rec });
    showToast(t('doc.sent', { name: review.patient?.full_name }));
    setBusy(false);
  }
  if (loading) return <Loading />;
  const band = last ? [last.ref_low_canonical, last.ref_high_canonical] : null;
  const p = review.patient || {};

  return (
    <div className="stack">
      <div className="card">
        <div className="row between">
          <div><h2 style={{ fontSize: 28 }}>{p.full_name}</h2><div className="tiny muted">{[p.city, p.country].filter(Boolean).join(' · ')}</div></div>
          <span className={'badge ' + (review.status === 'open' ? 'cherry' : 'normal')}>{t('doc.status.' + review.status)}</span>
        </div>
        {!!p.reasons?.length && <div className="chips mt8">{p.reasons.map((r) => <span key={r} className="chip">{t(`about.${r}.t`)}</span>)}</div>}
        {p.history_note && <p className="small mt8" style={{ marginBottom: 0 }}>{p.history_note}</p>}
        {review.note && <div className="card-tan mt16 small"><b>{t('doc.patientNote')}:</b> {review.note}</div>}
      </div>

      <PatientSummary patient={review.patient || {}} results={results} appts={extra?.appts || []} reviews={extra?.reviews || []} />

      {last ? (
        <div className="card">
          <div className="row between">
            <div><h3>{markerName(review.marker_code, lang)}</h3><div className="tiny muted">{[fmtDate(last.test_date), last.lab_name, last.country].filter(Boolean).join(' · ')}</div></div>
            <div className="row"><b style={{ fontSize: 20 }}>{fmtNum(last.value)} {last.unit}</b><StatusBadge status={last.status} /></div>
          </div>
          <div className="tiny muted mt8">{t('marker.ref')}: {fmtNum(last.ref_low)}–{fmtNum(last.ref_high)} {last.unit}</div>
          <div className="mt8" style={{ maxWidth: 560 }}><TrendChart points={list.map((r) => ({ date: r.test_date, value: r.value_canonical, country: r.country, lab: r.lab_name }))} band={band} unit={last.canonical_unit} /></div>
        </div>
      ) : <Empty>{t('doc.noAccess')}</Empty>}

      {!!results.length && (
        <div className="card">
          <h3>{t('doc.otherMarkers')}</h3>
          <table className="cmp mt8"><tbody>
            {Object.entries(byMarker(results)).map(([code, l]) => { const r = l[l.length - 1]; return (
              <tr key={code}><td>{markerName(code, lang)}</td><td>{fmtNum(r.value)} {r.unit}</td><td className="muted">{fmtDate(r.test_date)}</td><td><StatusBadge status={r.status} /></td></tr>
            ); })}
          </tbody></table>
        </div>
      )}

      <div className="card">
        <h3>{t('doc.yourReview')}</h3>
        {review.status === 'answered' ? (
          <>
            <p>{review.response}</p>
            {review.recommendation && <span className="badge cherry">{t('rec.' + review.recommendation)}</span>}
            <div className="tiny muted mt8">{t('doc.answeredOn', { date: fmtDate(review.answered_at) })}{review.trust_rating ? ' · ' + t('doc.trust', { n: review.trust_rating }) : ''}</div>
          </>
        ) : (
          <>
            <label className="lbl">{t('doc.explanation')}</label>
            <textarea className="field" rows={5} value={response} onChange={(e) => setResponse(e.target.value)} />
            <label className="lbl">{t('doc.recommendation')}</label>
            <div className="chips">{['recheck', 'visit', 'tests', 'none'].map((k) => <button key={k} className={'chip' + (rec === k ? ' on' : '')} onClick={() => setRec(k)}>{t('rec.' + k)}</button>)}</div>
            <button className="btn btn-primary mt16" style={{ maxWidth: 320 }} disabled={!response.trim() || !rec || busy} onClick={send}>{t('doc.approve')}</button>
            <p className="tiny muted">{t('doc.fee')}</p>
          </>
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ Agenda
function startOfWeek(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; }
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function Agenda() {
  const { t, fmtDate, fmtTime } = useI18n();
  const { session, showToast } = useSession();
  const me = session?.user?.id;
  const [week, setWeek] = useState(() => startOfWeek(new Date()));
  const [form, setForm] = useState({ date: ymd(new Date(Date.now() + 864e5)), time: '09:00', count: 4, minutes: 30 });
  const [sel, setSel] = useState(null);
  const { data, loading } = useData(async () => ({ slots: await api.listSlots(me), appts: await api.listAppointments() }), [me]);

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => { const d = new Date(week); d.setDate(d.getDate() + i); return d; }), [week]);
  const apptBySlot = Object.fromEntries((data?.appts || []).map((a) => [a.slot_id, a]));
  const upcoming = (data?.appts || []).filter((a) => a.doctor_id === me && new Date(a.starts_at) >= new Date());

  async function addSlots() {
    const out = [];
    const base = new Date(`${form.date}T${form.time}:00`);
    for (let i = 0; i < Number(form.count); i++) {
      const s = new Date(base.getTime() + i * form.minutes * 60000);
      out.push({ starts_at: `${ymd(s)}T${String(s.getHours()).padStart(2, '0')}:${String(s.getMinutes()).padStart(2, '0')}:00`, minutes: Number(form.minutes) });
    }
    await api.addSlots(out); showToast(t('agenda.added', { n: out.length }));
    setWeek(startOfWeek(base));
  }

  return (
    <DoctorShell title={t('doc.nav.agenda')} actions={(
      <div className="row">
        <button className="btn btn-ghost btn-small" onClick={() => setWeek(new Date(week.getTime() - 7 * 864e5))}>←</button>
        <button className="btn btn-ghost btn-small" onClick={() => setWeek(startOfWeek(new Date()))}>{t('agenda.today')}</button>
        <button className="btn btn-ghost btn-small" onClick={() => setWeek(new Date(week.getTime() + 7 * 864e5))}>→</button>
      </div>
    )}>
      <p className="muted small" style={{ marginTop: -10 }}>{fmtDate(days[0])} – {fmtDate(days[6])}</p>
      {loading ? <Loading /> : (
        <div className="week">
          {days.map((d) => {
            const key = ymd(d);
            const slots = data.slots.filter((s) => ymd(new Date(s.starts_at)) === key);
            return (
              <div key={key} className={'day' + (key === ymd(new Date()) ? ' today' : '')}>
                <div className="small" style={{ fontWeight: 600 }}>{fmtDate(d, { weekday: 'short', day: 'numeric', month: 'short' })}</div>
                {slots.map((s) => {
                  const a = apptBySlot[s.id];
                  return (
                    <div key={s.id} className={'slot' + (s.booked ? ' booked' : '')} style={{ cursor: 'pointer' }} onClick={() => setSel({ s, a })}>
                      {fmtTime(s.starts_at)}{s.booked ? ` · ${a?.patient?.full_name || t('agenda.booked')}` : ` · ${t('agenda.free')}`}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {sel && (
        <div className="card mt16" style={{ maxWidth: 520 }}>
          <div className="row between"><b>{fmtDate(sel.s.starts_at, { weekday: 'long', day: 'numeric', month: 'long' })} · {fmtTime(sel.s.starts_at)}</b><button className="icon-btn" onClick={() => setSel(null)}><Icon name="close" size={16} /></button></div>
          {sel.a ? (
            <>
              <p className="small">{sel.a.patient?.full_name} · {t('visit.' + sel.a.type)}{sel.a.note ? ` — “${sel.a.note}”` : ''}</p>
              {sel.a.meeting_url && <p className="small"><a href={sel.a.meeting_url} target="_blank" rel="noreferrer">{t('booked.join')}</a> <span className="tiny muted" style={{ wordBreak: 'break-all' }}>{sel.a.meeting_url}</span></p>}
              <button className="btn btn-ghost btn-small" onClick={async () => { await api.cancelAppointment(sel.a.id); setSel(null); showToast(t('booked.cancelled')); }}>{t('booked.cancel')}</button>
            </>
          ) : (
            <button className="btn btn-ghost btn-small mt8" onClick={async () => { await api.deleteSlot(sel.s.id); setSel(null); }}>{t('agenda.remove')}</button>
          )}
        </div>
      )}

      <div className="split two mt24">
        <div className="card">
          <h3>{t('agenda.addTitle')}</h3>
          <div className="grid2">
            <div><label className="lbl">{t('agenda.date')}</label><input className="field" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
            <div><label className="lbl">{t('agenda.start')}</label><input className="field" type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} /></div>
            <div><label className="lbl">{t('agenda.count')}</label><input className="field" type="number" min="1" max="16" value={form.count} onChange={(e) => setForm({ ...form, count: e.target.value })} /></div>
            <div><label className="lbl">{t('agenda.minutes')}</label>
              <select className="field" value={form.minutes} onChange={(e) => setForm({ ...form, minutes: Number(e.target.value) })}>{[15, 20, 30, 45, 60].map((m) => <option key={m} value={m}>{m}</option>)}</select></div>
          </div>
          <button className="btn btn-primary mt16" onClick={addSlots}>{t('agenda.add')}</button>
        </div>
        <div className="card">
          <h3>{t('agenda.upcoming')}</h3>
          {upcoming.length ? (
            <table className="cmp mt8"><tbody>{upcoming.map((a) => (
              <tr key={a.id}><td>{fmtDate(a.starts_at, { weekday: 'short', day: 'numeric', month: 'short' })} · {fmtTime(a.starts_at)}</td><td>{a.patient?.full_name}</td><td className="muted">{t('visit.' + a.type)}</td></tr>
            ))}</tbody></table>
          ) : <p className="small muted">{t('agenda.none')}</p>}
        </div>
      </div>
    </DoctorShell>
  );
}

// ------------------------------------------------------------------ Patients
export function Patients() {
  const { t, lang, fmtDate } = useI18n();
  const { session } = useSession();
  const [pid, setPid] = useState(null);
  const [tab, setTab] = useState('markers');
  const { data, loading } = useData(() => api.listShares(), []);
  const now = Date.now();
  const mine = (data || []).filter((s) => s.doctor_id === session?.user?.id && !s.revoked_at && new Date(s.expires_at) > now);
  const sel = pid || mine[0]?.patient_id;
  const { data: results } = useData(() => (sel ? api.listResults(sel) : Promise.resolve([])), [sel]);
  const { data: extra } = useData(async () => (sel ? { appts: (await api.listAppointments()).filter((a) => a.patient_id === sel), reviews: (await api.listDoctorQueue()).filter((r) => r.patient_id === sel) } : { appts: [], reviews: [] }), [sel]);
  const [marker, setMarker] = useState(null);
  const groups = byMarker(results || []);
  const share = mine.find((s) => s.patient_id === sel);

  return (
    <DoctorShell title={t('doc.nav.patients')}>
      {loading ? <Loading /> : !mine.length ? <Empty>{t('doc.patients.none')}</Empty> : (
        <div className="split">
          <div className="stack">
            {mine.map((s) => (
              <div key={s.id} className={'card queue-item' + (s.patient_id === sel ? ' on' : '')} onClick={() => { setPid(s.patient_id); setMarker(null); }}>
                <b>{s.patient?.full_name}</b>
                <div className="tiny muted">{s.scopes.map((x) => t('scope.' + x)).join(', ')} · {t('sharing.expires')} {fmtDate(s.expires_at)}</div>
              </div>
            ))}
          </div>
          <div>
            <div className="mt8" style={{ marginBottom: 16 }}>
              <PatientSummary patient={share?.scopes.includes('history') ? share?.patient : { ...share?.patient, history_note: null }}
                results={results || []} appts={extra?.appts || []} reviews={extra?.reviews || []} />
            </div>
            <div className="card">
              <h2 style={{ fontSize: 28 }}>{share?.patient?.full_name}</h2>
              <div className="chips mt8">{['markers', 'compare'].map((k) => <button key={k} className={'chip' + (tab === k ? ' on' : '')} onClick={() => setTab(k)}>{t('record.tab.' + (k === 'markers' ? 'bloodwork' : k))}</button>)}</div>
            </div>
            {tab === 'markers' && (
              <div className="split two mt16">
                <MarkerList results={results || []} onOpen={setMarker} grid={false} />
                {marker && groups[marker] && (() => { const l = groups[marker]; const last = l[l.length - 1]; return (
                  <div className="card"><h3>{markerName(marker, lang)}</h3>
                    <TrendChart points={l.map((r) => ({ date: r.test_date, value: r.value_canonical, country: r.country, lab: r.lab_name }))} band={[last.ref_low_canonical, last.ref_high_canonical]} unit={last.canonical_unit} /></div>
                ); })()}
              </div>
            )}
            {tab === 'compare' && <div className="card mt16"><Compare results={results || []} /></div>}
          </div>
        </div>
      )}
    </DoctorShell>
  );
}

export function DoctorNotifications() {
  const { t } = useI18n();
  return <DoctorShell title={t('doc.nav.notifications')}><div style={{ maxWidth: 640 }}><NotificationsList embedded /></div></DoctorShell>;
}

export function DoctorProfileEdit() {
  const { t } = useI18n();
  const { session, showToast } = useSession();
  const { data, loading } = useData(() => api.getDoctor(session?.user?.id), [session?.user?.id]);
  const [f, setF] = useState(null);
  useEffect(() => { if (data && !f) setF({ ...data, specialty: data.specialty || 'gyn', consultation: data.consultation || 'both', languages: (data.languages || []).join(', '), insurers: (data.insurers || []).join(', ') }); }, [data, f]);
  if (loading || !f) return <DoctorShell title={t('doc.nav.profile')}><Loading /></DoctorShell>;
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  async function save() {
    const split = (s) => s.split(',').map((x) => x.trim()).filter(Boolean);
    const link = (f.meeting_url || '').trim();
    if (link && !/^https:\/\/\S+$/.test(link)) { showToast(t('doc.meetingInvalid')); return; }
    await api.updateDoctor({ specialty: f.specialty, area: f.area, consultation: 'video', meeting_url: link || null, bio: f.bio,
      languages: split(f.languages), insurers: split(f.insurers),
      first_visit_fee: f.first_visit_fee === '' ? null : Number(f.first_visit_fee), results_visit_fee: f.results_visit_fee === '' || f.results_visit_fee == null ? null : Number(f.results_visit_fee) });
    showToast(t('settings.saved'));
  }
  return (
    <DoctorShell title={t('doc.nav.profile')}>
      <div className="card" style={{ maxWidth: 640 }}>
        <div className="grid2">
          <div><label className="lbl">{t('doc.specialty')}</label><select className="field" value={f.specialty || ''} onChange={set('specialty')}>{['gyn', 'endo', 'fertility', 'gp'].map((k) => <option key={k} value={k}>{t('spec.' + k)}</option>)}</select></div>
          <div><label className="lbl">{t('doctor.consultation')}</label><div className="field" style={{ background: 'transparent', border: '1px solid var(--line)' }}>{t('consult.video')}</div></div>
        </div>
        <label className="lbl">{t('doc.meetingUrl')}</label>
        <input className="field" type="url" value={f.meeting_url || ''} onChange={set('meeting_url')} placeholder="https://meet.google.com/abc-defg-hij" />
        <p className="tiny muted" style={{ margin: '6px 0 0' }}>{t('doc.meetingHint')}</p>
        <label className="lbl">{t('doc.area')}</label><input className="field" value={f.area || ''} onChange={set('area')} />
        <label className="lbl">{t('doctor.languages')}</label><input className="field" value={f.languages} onChange={set('languages')} placeholder="Spanish, Catalan, English" />
        <label className="lbl">{t('doctor.insurers')}</label><input className="field" value={f.insurers} onChange={set('insurers')} />
        <div className="grid2">
          <div><label className="lbl">{t('doctor.firstVisit')} (€)</label><input className="field" inputMode="decimal" value={f.first_visit_fee ?? ''} onChange={set('first_visit_fee')} /></div>
          <div><label className="lbl">{t('doctor.resultsVisit')} (€)</label><input className="field" inputMode="decimal" value={f.results_visit_fee ?? ''} onChange={set('results_visit_fee')} /></div>
        </div>
        <label className="lbl">{t('doc.bio')}</label><textarea className="field" rows={3} value={f.bio || ''} onChange={set('bio')} />
        <button className="btn btn-primary mt16" style={{ maxWidth: 240 }} onClick={save}>{t('common.save')}</button>
        <h3 className="mt24">{t('settings.language')}</h3>
        <div className="mt8"><LangPicker onChange={(l) => api.updateProfile({ language: l })} /></div>
        {IS_DEMO && <p className="tiny muted mt16">{t('doc.demoTip')}</p>}
      </div>
    </DoctorShell>
  );
}
