import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { coversPlan } from './CareTeam.jsx';
import { Phone, TopBar, Initials, Loading, Empty } from '../../components/ui.jsx';
import Icon from '../../components/Icon.jsx';
import { useI18n } from '../../i18n/index.jsx';
import { api } from '../../lib/api.js';
import { useSession, useData } from '../../lib/session.jsx';
import { visitEvent, googleCalendarUrl, outlookCalendarUrl, downloadIcs } from '../../lib/calendar.js';

export function FindDoctor() {
  const { t, fmtMoney, fmtFee } = useI18n();
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [params] = useSearchParams();
  const { session } = useSession();
  const plan = session?.profile?.insurer || '';
  const [filter, setFilter] = useState(params.get('spec') ? ['spec', params.get('spec')] : null);
  const { data, loading } = useData(() => api.listDoctors(), []);
  // Katie: "which doctors are covered by my insurance" — shown first when she has a plan
  const filters = [...(plan ? [['covered', plan]] : []), ['spec', 'gyn'], ['spec', 'endo'], ['spec', 'nutri'], ['spec', 'fertility'], ['lang', 'English'], ['lang', 'Portuguese']];
  const list = (data || []).filter((d) => {
    const hay = `${d.full_name} ${t('spec.' + d.specialty)} ${d.area}`.toLowerCase();
    if (q && !hay.includes(q.toLowerCase())) return false;
    if (filter?.[0] === 'spec' && d.specialty !== filter[1]) return false;
    if (filter?.[0] === 'lang' && !d.languages?.includes(filter[1])) return false;
    if (filter?.[0] === 'covered' && !coversPlan(d, plan)) return false;
    return true;
  }).sort((a, b) => coversPlan(b, plan) - coversPlan(a, plan));
  return (
    <Phone nav wide>
      <h1>{t('find.title')}</h1>
      <div className="row field mt16" style={{ padding: '4px 12px' }}>
        <Icon name="search" size={16} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('find.search')} style={{ border: 0, background: 'transparent', outline: 'none', flex: 1, padding: '8px 0' }} />
      </div>
      <div className="chips mt16">
        {filters.map(([k, v]) => {
          const on = filter?.[1] === v;
          return <button key={v} className={'chip' + (on ? ' on' : '')} onClick={() => setFilter(on ? null : [k, v])}>{k === 'spec' ? t('spec.' + v) : k === 'covered' ? t('find.covered', { plan: v }) : t('lang.' + v)}</button>;
        })}
      </div>
      {loading ? <Loading /> : (
        <>
          <p className="tiny muted mt16">{t('find.count', { n: list.length })}</p>
          <div className="stack dgrid">
            {list.length ? list.map((d) => (
              <div key={d.id} className="card tap" onClick={() => nav(`/doctors/${d.id}`)}>
                <div className="row between" style={{ alignItems: 'flex-start' }}>
                  <div className="row"><Initials name={d.full_name} /><div><div className="serif" style={{ fontSize: 20 }}>{d.full_name}</div><div className="tiny muted">{t('spec.' + d.specialty)}</div></div></div>
                  {plan && (coversPlan(d, plan)
                    ? <span className="badge" style={{ background: 'var(--ok-bg)', color: 'var(--ok-ink)' }} data-testid="covered">{t('find.coveredBadge')}</span>
                    : <span className="badge neutral">{t('find.notCovered')}</span>)}
                </div>
                <div className="divider" />
                <div className="stack small muted" style={{ fontSize: 12.5 }}>
                  <div className="row" style={{ gap: 8 }}><Icon name="video" size={14} />{t('consult.video')}</div>
                  {d.area && <div className="row" style={{ gap: 8 }}><Icon name="pin" size={14} />{d.area}</div>}
                  {!!d.languages?.length && <div className="row" style={{ gap: 8 }}><Icon name="lang" size={14} />{d.languages.join(', ')}</div>}
                  <div className="row" style={{ gap: 8 }}><Icon name="euro" size={14} />{t('doctor.firstVisit')} {fmtFee(d.first_visit_fee)}</div>
                  {!!d.insurers?.length && <div className="row" style={{ gap: 8 }}><Icon name="shield" size={14} />{d.insurers.join(', ')}</div>}
                </div>
              </div>
            )) : <Empty>{t('find.none')}</Empty>}
          </div>
        </>
      )}
    </Phone>
  );
}

export function DoctorProfile() {
  const { id } = useParams();
  const { t, lang, fmtFee, fmtMoney, fmtSlot } = useI18n();
  const nav = useNavigate();
  const { showToast } = useSession();
  const [params] = useSearchParams();
  const [slot, setSlot] = useState(null);
  const [type, setType] = useState('first');
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');
  const { data, loading } = useData(async () => ({ doc: await api.getDoctor(id), slots: await api.listSlots(id) }), [id]);
  if (loading) return <Phone><TopBar /><Loading /></Phone>;
  const d = data.doc;
  if (!d) return <Phone><TopBar /><Empty>{t('find.none')}</Empty></Phone>;
  const free = data.slots.filter((s) => !s.booked && new Date(s.starts_at) > new Date());

  // Doctors who take payments: pay when booking (Stripe Checkout), refund if cancelled > 24 h before
  const price = d.payments_ready ? (type === 'results' ? (d.results_visit_fee ?? d.first_visit_fee) : d.first_visit_fee) : null;
  async function book() {
    setErr('');
    try {
      if (d.payments_ready) {
        const r = await api.payments('checkout', { slot_id: slot, type, note, lang });
        window.location.assign(r.url);
        return;
      }
      const appt = await api.book(slot, { type, note });
      showToast(t('book.done'));
      nav(`/booked/${appt.id}`, { replace: true });
    } catch (e) { setErr(e.message === 'book.taken' ? t('err.book.taken') : e.message.startsWith('payments.') || e.message.startsWith('book.') ? t('err.' + e.message) : e.message); }
  }

  return (
    <Phone>
      <TopBar title={t('doctor.profile')} />
      <div className="center"><div style={{ display: 'inline-block' }}><Initials name={d.full_name} className="avatar sq" /></div></div>
      <h1 className="center mt8" style={{ fontSize: 30 }}>{d.full_name}</h1>
      <div className="tiny muted center">{t('spec.' + d.specialty)}{d.area ? ' · ' + d.area : ''}</div>
      <div className="card stack mt16">
        {!!d.languages?.length && <Info icon="lang" label={t('doctor.languages')} value={d.languages.join(', ')} />}
        <Info icon="video" label={t('doctor.consultation')} value={t('consult.video')} />
        {!!d.insurers?.length && <Info icon="shield" label={t('doctor.insurers')} value={d.insurers.join(', ')} />}
      </div>
      {d.bio && <p className="small muted mt16">{d.bio}</p>}
      <h3 className="mt16">{t('doctor.fees')}</h3>
      <div className="card mt8">
        <div className="row between small"><span>{t('doctor.firstVisit')}</span><b>{fmtFee(d.first_visit_fee)}</b></div>
        <div className="divider" /><div className="row between small"><span>{t('doctor.resultsVisit')}</span><b>{fmtFee(d.results_visit_fee)}</b></div>
      </div>
      <h3 className="mt16">{t('doctor.book')}</h3>
      {free.length ? (
        <div className="grid2 mt8">
          {free.map((s) => (
            <button key={s.id} className={'chip' + (slot === s.id ? ' on' : '')} style={{ padding: 10 }} onClick={() => setSlot(s.id)}>{fmtSlot(s.starts_at)}</button>
          ))}
        </div>
      ) : <div className="card small muted mt8">{t('doctor.noSlots')}</div>}
      {slot && (
        <>
          <label className="lbl">{t('book.type')}</label>
          <div className="chips">
            {['first', 'results'].map((k) => <button key={k} className={'chip' + (type === k ? ' on' : '')} onClick={() => setType(k)}>{t('visit.' + k)}</button>)}
          </div>
          <label className="lbl">{t('book.note')}</label>
          <textarea className="field" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        </>
      )}
      {params.get('payment') === 'cancelled' && <div className="card-tan small mt16">{t('pay.notPaid')}</div>}
      {err && <div className="error">{err}</div>}
      {price != null && slot && <p className="tiny muted mt16" data-testid="pay-policy">{t('pay.policy')}</p>}
      <button className="btn btn-primary mt24" disabled={!slot} onClick={book}>{price != null ? t('pay.payAndBook', { price: fmtMoney(price) }) : t('doctor.bookTime')}</button>
    </Phone>
  );
}

function Info({ icon, label, value }) {
  return (
    <div className="row" style={{ alignItems: 'flex-start' }}>
      <Icon name={icon} size={16} style={{ color: 'var(--cherry)', marginTop: 2 }} />
      <div><div className="tiny muted">{label}</div><div className="small">{value}</div></div>
    </div>
  );
}

export function Booked() {
  const { id } = useParams();
  const { t, fmtSlot, fmtMoney } = useI18n();
  const nav = useNavigate();
  const { showToast } = useSession();
  const [params] = useSearchParams();
  const paidReturn = params.get('paid') === '1';
  const [tries, setTries] = useState(0);
  const { data, loading } = useData(() => api.listAppointments(), [tries]);
  const a = data?.find((x) => x.id === id);
  // Back from Stripe: the booking is confirmed by the webhook a few seconds later — check again
  useEffect(() => {
    if (!paidReturn || a || tries > 10) return;
    const h = setTimeout(() => setTries((n) => n + 1), 2000);
    return () => clearTimeout(h);
  }, [paidReturn, a, tries]);
  if (loading && !data) return <Phone><Loading /></Phone>;
  if (!a && paidReturn && tries <= 10) return <Phone><TopBar close onBack={() => nav('/home')} /><p className="center mt24">{t('pay.confirming')}</p><Loading /></Phone>;
  const paid = a?.payment_status === 'paid' || a?.payment_status === 'transferred';
  const early = a && new Date(a.starts_at).getTime() - Date.now() > 24 * 3600000;
  async function cancelIt() {
    if (paid && !window.confirm(early ? t('pay.cancelRefund') : t('pay.cancelNoRefund'))) return;
    try {
      if (paid) { const r = await api.payments('cancel', { appointment_id: a.id }); showToast(r.refunded ? t('pay.refunded') : t('booked.cancelled')); }
      else { await api.cancelAppointment(a.id); showToast(t('booked.cancelled')); }
      nav('/home');
    } catch (e) { showToast(e.message); }
  }
  const ev = a?.meeting_url ? visitEvent(a, `${t('booked.calTitle')} ${a.doctor?.full_name || ''}`) : null;
  return (
    <Phone>
      <TopBar close onBack={() => nav('/home')} />
      <div className="center mt24"><div className="icon-circle" style={{ width: 64, height: 64, margin: '0 auto' }}><Icon name="check" size={30} /></div></div>
      {a ? (
        <>
          <h1 className="center mt16" style={{ fontSize: 30 }}>{t('booked.title', { doctor: a.doctor?.full_name })}</h1>
          <p className="center">{fmtSlot(a.starts_at)} · {t('visit.' + a.type)}</p>
          <p className="small muted center" style={{ marginTop: -6 }}><Icon name="video" size={14} style={{ verticalAlign: '-2px' }} /> {t('booked.online')}</p>
          {paid && <p className="center" data-testid="paid"><span className="badge" style={{ background: 'var(--ok-bg)', color: 'var(--ok-ink)' }}>{t('pay.paid', { price: fmtMoney(a.price_cents / 100) })}</span></p>}
          {paid && <p className="tiny muted center">{t('pay.policy')}</p>}
          {ev && (
            <div className="card mt16">
              <a className="btn btn-primary" href={a.meeting_url} target="_blank" rel="noreferrer" style={{ display: 'block', textAlign: 'center', textDecoration: 'none', background: 'var(--persimmon)' }}>{t('booked.join')}</a>
              <p className="tiny muted center" style={{ wordBreak: 'break-all' }}>{a.meeting_url}</p>
              <div className="small" style={{ fontWeight: 600, marginTop: 12 }}>{t('booked.addCal')}</div>
              <div className="chips mt8">
                <a className="chip" href={googleCalendarUrl(ev)} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>Google Calendar</a>
                <a className="chip" href={outlookCalendarUrl(ev)} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>Outlook</a>
                <button className="chip" onClick={() => downloadIcs(ev, t('booked.icsFile'))}>{t('booked.appleOther')}</button>
              </div>
              <p className="tiny muted" style={{ marginBottom: 0 }}>{t('booked.emailSent')}</p>
            </div>
          )}
          <div className="spacer" />
          <button className="btn btn-primary mt24" onClick={() => nav('/plans')}>{t('booked.next')}</button>
          <button className="btn btn-ghost mt8" onClick={() => nav('/home')}>{t('nav.home')}</button>
          <button className="btn btn-link mt8" onClick={cancelIt}>{t('booked.cancel')}</button>
        </>
      ) : <p className="center muted">{t('booked.gone')}</p>}
    </Phone>
  );
}
