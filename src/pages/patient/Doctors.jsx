import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Phone, TopBar, Initials, Loading, Empty } from '../../components/ui.jsx';
import Icon from '../../components/Icon.jsx';
import { useI18n } from '../../i18n/index.jsx';
import { api } from '../../lib/api.js';
import { useSession, useData } from '../../lib/session.jsx';

export function FindDoctor() {
  const { t, fmtMoney } = useI18n();
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState(null);
  const { data, loading } = useData(() => api.listDoctors(), []);
  const filters = [['spec', 'gyn'], ['spec', 'endo'], ['spec', 'fertility'], ['lang', 'English'], ['lang', 'Portuguese']];
  const list = (data || []).filter((d) => {
    const hay = `${d.full_name} ${t('spec.' + d.specialty)} ${d.area}`.toLowerCase();
    if (q && !hay.includes(q.toLowerCase())) return false;
    if (filter?.[0] === 'spec' && d.specialty !== filter[1]) return false;
    if (filter?.[0] === 'lang' && !d.languages?.includes(filter[1])) return false;
    return true;
  });
  return (
    <Phone nav>
      <h1>{t('find.title')}</h1>
      <div className="row field mt16" style={{ padding: '4px 12px' }}>
        <Icon name="search" size={16} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('find.search')} style={{ border: 0, background: 'transparent', outline: 'none', flex: 1, padding: '8px 0' }} />
      </div>
      <div className="chips mt16">
        {filters.map(([k, v]) => {
          const on = filter?.[1] === v;
          return <button key={v} className={'chip' + (on ? ' on' : '')} onClick={() => setFilter(on ? null : [k, v])}>{k === 'spec' ? t('spec.' + v) : t('lang.' + v)}</button>;
        })}
      </div>
      {loading ? <Loading /> : (
        <>
          <p className="tiny muted mt16">{t('find.count', { n: list.length })}</p>
          <div className="stack">
            {list.length ? list.map((d) => (
              <div key={d.id} className="card tap" onClick={() => nav(`/doctors/${d.id}`)}>
                <div className="row"><Initials name={d.full_name} /><div><div className="serif" style={{ fontSize: 20 }}>{d.full_name}</div><div className="tiny muted">{t('spec.' + d.specialty)}</div></div></div>
                <div className="divider" />
                <div className="stack small muted" style={{ fontSize: 12.5 }}>
                  {d.area && <div className="row" style={{ gap: 8 }}><Icon name="pin" size={14} />{d.area}</div>}
                  {!!d.languages?.length && <div className="row" style={{ gap: 8 }}><Icon name="lang" size={14} />{d.languages.join(', ')}</div>}
                  {d.first_visit_fee != null && <div className="row" style={{ gap: 8 }}><Icon name="euro" size={14} />{t('doctor.firstVisit')} {fmtMoney(d.first_visit_fee)}</div>}
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
  const { t, fmtMoney, fmtSlot } = useI18n();
  const nav = useNavigate();
  const { showToast } = useSession();
  const [slot, setSlot] = useState(null);
  const [type, setType] = useState('first');
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');
  const { data, loading } = useData(async () => ({ doc: await api.getDoctor(id), slots: await api.listSlots(id) }), [id]);
  if (loading) return <Phone><TopBar /><Loading /></Phone>;
  const d = data.doc;
  if (!d) return <Phone><TopBar /><Empty>{t('find.none')}</Empty></Phone>;
  const free = data.slots.filter((s) => !s.booked && new Date(s.starts_at) > new Date());

  async function book() {
    setErr('');
    try {
      const appt = await api.book(slot, { type, note });
      showToast(t('book.done'));
      nav(`/booked/${appt.id}`, { replace: true });
    } catch (e) { setErr(e.message === 'book.taken' ? t('err.book.taken') : e.message); }
  }

  return (
    <Phone>
      <TopBar title={t('doctor.profile')} />
      <div className="center"><div style={{ display: 'inline-block' }}><Initials name={d.full_name} className="avatar sq" /></div></div>
      <h1 className="center mt8" style={{ fontSize: 30 }}>{d.full_name}</h1>
      <div className="tiny muted center">{t('spec.' + d.specialty)}{d.area ? ' · ' + d.area : ''}</div>
      <div className="card stack mt16">
        {!!d.languages?.length && <Info icon="lang" label={t('doctor.languages')} value={d.languages.join(', ')} />}
        <Info icon="video" label={t('doctor.consultation')} value={t('consult.' + (d.consultation || 'both'))} />
        {!!d.insurers?.length && <Info icon="shield" label={t('doctor.insurers')} value={d.insurers.join(', ')} />}
      </div>
      {d.bio && <p className="small muted mt16">{d.bio}</p>}
      <h3 className="mt16">{t('doctor.fees')}</h3>
      <div className="card mt8">
        <div className="row between small"><span>{t('doctor.firstVisit')}</span><b>{fmtMoney(d.first_visit_fee)}</b></div>
        {d.results_visit_fee != null && <><div className="divider" /><div className="row between small"><span>{t('doctor.resultsVisit')}</span><b>{fmtMoney(d.results_visit_fee)}</b></div></>}
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
            {['first', 'results', 'video'].map((k) => <button key={k} className={'chip' + (type === k ? ' on' : '')} onClick={() => setType(k)}>{t('visit.' + k)}</button>)}
          </div>
          <label className="lbl">{t('book.note')}</label>
          <textarea className="field" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        </>
      )}
      {err && <div className="error">{err}</div>}
      <button className="btn btn-primary mt24" disabled={!slot} onClick={book}>{t('doctor.bookTime')}</button>
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
  const { t, fmtSlot } = useI18n();
  const nav = useNavigate();
  const { showToast } = useSession();
  const { data, loading } = useData(() => api.listAppointments(), []);
  if (loading) return <Phone><Loading /></Phone>;
  const a = data.find((x) => x.id === id);
  return (
    <Phone>
      <TopBar close onBack={() => nav('/home')} />
      <div className="center mt24"><div className="icon-circle" style={{ width: 64, height: 64, margin: '0 auto' }}><Icon name="check" size={30} /></div></div>
      {a ? (
        <>
          <h1 className="center mt16" style={{ fontSize: 30 }}>{t('booked.title', { doctor: a.doctor?.full_name })}</h1>
          <p className="center">{fmtSlot(a.starts_at)} · {t('visit.' + a.type)}</p>
          <p className="small muted center">{a.doctor?.area}</p>
          <div className="spacer" />
          <button className="btn btn-primary mt24" onClick={() => nav('/plans')}>{t('booked.next')}</button>
          <button className="btn btn-ghost mt8" onClick={() => nav('/home')}>{t('nav.home')}</button>
          <button className="btn btn-link mt8" onClick={async () => { await api.cancelAppointment(a.id); showToast(t('booked.cancelled')); nav('/home'); }}>{t('booked.cancel')}</button>
        </>
      ) : <p className="center muted">{t('booked.gone')}</p>}
    </Phone>
  );
}
