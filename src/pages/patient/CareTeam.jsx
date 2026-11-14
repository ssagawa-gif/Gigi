import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Phone, TopBar, Initials, Loading } from '../../components/ui.jsx';
import Icon from '../../components/Icon.jsx';
import { useI18n } from '../../i18n/index.jsx';
import { api } from '../../lib/api.js';
import { useSession, useData } from '../../lib/session.jsx';

// "My care team" (14 Nov feedback): the doctors she chooses, in GiGi or outside, with their plan.
// Each doctor only sees what she shares; their notes and replies stay between her and that doctor.
export const KEY_SPECS = ['gyn', 'endo', 'nutri'];
export const CARE_SPECS = ['gyn', 'endo', 'nutri', 'fertility', 'gp', 'other'];

/** Does this GiGi doctor accept the patient's plan? */
export const coversPlan = (doctor, plan) =>
  !!plan && (doctor?.insurers || []).some((x) => x.trim().toLowerCase() === plan.trim().toLowerCase());

function Coverage({ value }) {
  const { t } = useI18n();
  if (!value) return null;
  return <span className="badge neutral" data-testid="coverage">{value === 'private' ? t('care.private') : value}</span>;
}

/** Home card: the team at a glance, or the question "do you have a gynaecologist you trust?". */
export function CareTeamCard() {
  const { t } = useI18n();
  const nav = useNavigate();
  const { data } = useData(() => api.listCareTeam(), []);
  if (!data) return null;
  if (!data.length) {
    return (
      <div className="card mt24" data-testid="care-prompt">
        <div className="row" style={{ gap: 8 }}><Icon name="users" size={16} /><b>{t('care.title')}</b></div>
        <p className="small" style={{ margin: '8px 0 12px' }}>{t('care.ask.gyn')}</p>
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-primary btn-small" onClick={() => nav('/care-team?add=gyn')}>{t('care.yesAdd')}</button>
          <button className="btn btn-ghost btn-small" onClick={() => nav('/doctors?spec=gyn')}>{t('care.noSuggest')}</button>
        </div>
      </div>
    );
  }
  return (
    <div className="card mt24 tap" onClick={() => nav('/care-team')} style={{ cursor: 'pointer' }}>
      <div className="row between"><div className="row" style={{ gap: 8 }}><Icon name="users" size={16} /><b>{t('care.title')}</b></div><Icon name="chevron" size={16} /></div>
      <div className="stack mt8" style={{ gap: 6 }}>
        {data.slice(0, 4).map((m) => (
          <div key={m.id} className="row between small">
            <span>{m.doctor?.full_name || m.name} <span className="muted">· {t('spec.' + m.specialty)}</span></span>
            <Coverage value={m.coverage} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function CareTeam() {
  const { t, fmtDate } = useI18n();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const { session, showToast } = useSession();
  const plan = session?.profile?.insurer || '';
  const [k, setK] = useState(0);
  const reload = () => setK((x) => x + 1);
  const { data, loading } = useData(() => Promise.all([api.listCareTeam(), api.listDoctors()]).then(([team, doctors]) => ({ team, doctors })), [k]);
  const [adding, setAdding] = useState(params.get('add') || null);   // specialty being added
  if (loading || !data) return <Phone nav wide><TopBar title={t('care.title')} /><Loading /></Phone>;
  const bySpec = (s) => data.team.filter((m) => (s === 'other' ? !KEY_SPECS.includes(m.specialty) : m.specialty === s));

  async function toggleShare(m) { await api.updateCareMember(m.id, { share_results: !m.share_results }); reload(); }
  async function remove(m) { await api.removeCareMember(m.id); reload(); showToast(t('care.removed')); }
  async function invite(m) {
    try { await api.inviteCareDoctor(m.id); showToast(t('care.invited')); } catch (e) { showToast(/today/.test(e.message) ? t('care.inviteWait') : e.message); }
    reload();
  }

  const Member = ({ m }) => {
    const inGiGi = !!m.doctor_id;
    return (
      <div className="card" data-testid="care-member">
        <div className="row between" style={{ alignItems: 'flex-start' }}>
          <div className="row"><Initials name={m.doctor?.full_name || m.name} />
            <div>
              <div className="serif" style={{ fontSize: 19 }}>{m.doctor?.full_name || m.name}</div>
              <div className="tiny muted">{t('spec.' + m.specialty)}{m.email ? ' · ' + m.email : ''}{m.phone ? ' · ' + m.phone : ''}</div>
            </div>
          </div>
          <Coverage value={m.coverage} />
        </div>
        <div className="tiny mt8" data-testid="care-status">
          {inGiGi
            ? (m.share_results ? <span><Icon name="check" size={12} /> {t('care.sees')}</span> : <span className="muted">{t('care.noAccess')}</span>)
            : m.invited_at ? <span className="muted">{t('care.invitedOn', { date: fmtDate(m.invited_at) })}</span>
              : <span className="muted">{t('care.contactOnly')}</span>}
        </div>
        <div className="row mt8" style={{ gap: 8, flexWrap: 'wrap' }}>
          {inGiGi && <button className="btn btn-ghost btn-small" onClick={() => toggleShare(m)}>{m.share_results ? t('care.stopSharing') : t('care.share')}</button>}
          {inGiGi && <button className="btn btn-ghost btn-small" onClick={() => nav(`/doctors/${m.doctor_id}`)}>{t('care.book')}</button>}
          {!inGiGi && m.email && <button className="btn btn-ghost btn-small" onClick={() => invite(m)}>{m.invited_at ? t('care.reinvite') : t('care.invite')}</button>}
          <button className="btn btn-link btn-small" onClick={() => remove(m)}>{t('care.remove')}</button>
        </div>
      </div>
    );
  };

  return (
    <Phone nav wide>
      <TopBar title={t('care.title')} />
      <p className="muted small" style={{ marginTop: 0 }}>{t('care.sub')}</p>
      <div className="row tiny muted" style={{ alignItems: 'flex-start' }}><Icon name="shield" size={14} /><span>{t('care.privacy')}</span></div>

      {[...KEY_SPECS, 'other'].map((s) => (
        <div key={s} className="mt24" data-testid={'care-sec-' + s}>
          <h3 style={{ marginBottom: 8 }}>{s === 'other' ? t('care.others') : t('spec.' + s)}</h3>
          <div className="stack" style={{ gap: 10 }}>
            {bySpec(s).map((m) => <Member key={m.id} m={m} />)}
            {!bySpec(s).length && s !== 'other' && adding !== s && (
              <div className="card-tan">
                <p className="small" style={{ margin: '0 0 10px' }}>{t('care.ask.' + s)}</p>
                <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                  <button className="btn btn-primary btn-small" onClick={() => setAdding(s)}>{t('care.yesAdd')}</button>
                  <button className="btn btn-ghost btn-small" onClick={() => nav('/doctors?spec=' + s)}>{t('care.noSuggest')}</button>
                </div>
              </div>
            )}
            {adding === s && <AddMember spec={s} plan={plan} doctors={data.doctors} onDone={() => { setAdding(null); reload(); }} />}
            {s === 'other' && adding !== 'other' && <button className="btn btn-ghost" onClick={() => setAdding('other')}>{t('care.addOther')}</button>}
          </div>
        </div>
      ))}
    </Phone>
  );
}

function AddMember({ spec, plan, doctors, onDone }) {
  const { t } = useI18n();
  const { showToast } = useSession();
  const [where, setWhere] = useState('outside');   // 'gigi' | 'outside'
  const [f, setF] = useState({ specialty: spec === 'other' ? 'gp' : spec, name: '', email: '', phone: '', doctor_id: '', coverage: plan || 'private', share_results: true });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const gigiList = doctors.filter((d) => spec === 'other' || d.specialty === f.specialty);
  const valid = where === 'gigi' ? !!f.doctor_id : f.name.trim().length > 1;

  async function save() {
    const d = doctors.find((x) => x.id === f.doctor_id);
    await api.addCareMember({ ...f, name: where === 'gigi' ? d?.full_name : f.name.trim(), doctor_id: where === 'gigi' ? f.doctor_id : null,
      email: where === 'outside' ? f.email.trim() : null, phone: where === 'outside' ? f.phone.trim() : null });
    showToast(where === 'outside' && f.email.trim() ? t('care.invited') : t('care.added'));
    onDone();
  }

  return (
    <div className="card" data-testid="care-add">
      <div className="chips">
        <button className={'chip' + (where === 'outside' ? ' on' : '')} onClick={() => setWhere('outside')}>{t('care.outside')}</button>
        <button className={'chip' + (where === 'gigi' ? ' on' : '')} onClick={() => setWhere('gigi')}>{t('care.fromGiGi')}</button>
      </div>
      {spec === 'other' && (
        <><label className="lbl">{t('doc.specialty')}</label>
          <select className="field" value={f.specialty} onChange={set('specialty')}>{CARE_SPECS.filter((x) => !KEY_SPECS.includes(x)).map((k) => <option key={k} value={k}>{t('spec.' + k)}</option>)}</select></>
      )}
      {where === 'gigi' ? (
        <>
          <label className="lbl">{t('care.pickDoctor')}</label>
          <select className="field" value={f.doctor_id} onChange={set('doctor_id')} aria-label={t('care.pickDoctor')}>
            <option value="">—</option>
            {gigiList.map((d) => <option key={d.id} value={d.id}>{d.full_name}{coversPlan(d, plan) ? ` · ${t('care.coveredShort')}` : ''}</option>)}
          </select>
          {!gigiList.length && <p className="tiny muted">{t('care.noneInGiGi')}</p>}
        </>
      ) : (
        <>
          <label className="lbl">{t('care.name')}</label><input className="field" value={f.name} onChange={set('name')} placeholder="Dr Ana Ruiz" aria-label={t('care.name')} />
          <div className="grid2">
            <div><label className="lbl">{t('care.email')}</label><input className="field" type="email" value={f.email} onChange={set('email')} aria-label={t('care.email')} /></div>
            <div><label className="lbl">{t('care.phone')}</label><input className="field" type="tel" value={f.phone} onChange={set('phone')} aria-label={t('care.phone')} /></div>
          </div>
          <p className="tiny muted" style={{ margin: '6px 0 0' }}>{t('care.inviteHow')}</p>
        </>
      )}
      <label className="lbl">{t('care.plan')}</label>
      <div className="chips">
        <button className={'chip' + (f.coverage === 'private' ? ' on' : '')} onClick={() => setF({ ...f, coverage: 'private' })}>{t('care.private')}</button>
        {plan && <button className={'chip' + (f.coverage === plan ? ' on' : '')} onClick={() => setF({ ...f, coverage: plan })}>{plan}</button>}
      </div>
      <input className="field mt8" value={f.coverage === 'private' ? '' : f.coverage} onChange={(e) => setF({ ...f, coverage: e.target.value || 'private' })} placeholder={t('care.planOther')} aria-label={t('care.planOther')} />
      <label className="row small mt16" style={{ cursor: 'pointer' }}>
        <input type="checkbox" checked={f.share_results} onChange={(e) => setF({ ...f, share_results: e.target.checked })} />{t('care.letSee')}
      </label>
      <div className="row mt16" style={{ gap: 8 }}>
        <button className="btn btn-primary btn-small" disabled={!valid} onClick={save}>{t('care.save')}</button>
        <button className="btn btn-link btn-small" onClick={onDone}>{t('common.cancel')}</button>
      </div>
    </div>
  );
}
