import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, TopBar, MeAvatar, LangPicker, Loading, Empty, useNotifText, ConfirmButton } from '../../components/ui.jsx';
import Icon from '../../components/Icon.jsx';
import { useI18n } from '../../i18n/index.jsx';
import { api, IS_DEMO } from '../../lib/api.js';
import { useSession, useData } from '../../lib/session.jsx';
import { COUNTRIES, useCountryName } from './AddResult.jsx';

export function Sharing() {
  const { t, fmtDate } = useI18n();
  const { session, showToast } = useSession();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ doctor_id: '', days: 30, scopes: ['bloodwork', 'history'] });
  const { data, loading } = useData(async () => ({ shares: await api.listShares(), doctors: await api.listDoctors() }), []);
  const now = Date.now();
  const active = (data?.shares || []).filter((s) => !s.revoked_at && new Date(s.expires_at) > now);
  const past = (data?.shares || []).filter((s) => s.revoked_at || new Date(s.expires_at) <= now);

  async function stop(s) { await api.revokeShare(s.id); showToast(t('sharing.stopped')); }
  async function add() {
    await api.createShare(form); setAdding(false); showToast(t('sharing.added'));
  }
  return (
    <Phone nav wide>
      <div className="row between"><h1>{t('sharing.title')}</h1><MeAvatar name={session?.profile?.full_name} /></div>
      {loading ? <Loading /> : (
        <>
          <h3 className="mt24">{t('sharing.active')}</h3>
          <div className="stack dgrid mt8">
            {active.length ? active.map((s) => (
              <div key={s.id} className="card">
                <div className="serif" style={{ fontSize: 20 }}>{s.doctor?.full_name}</div>
                <div className="tiny muted">{t('spec.' + s.doctor?.specialty)}{s.doctor?.area ? ' · ' + s.doctor.area : ''}</div>
                <div className="divider" />
                <div className="row between tiny"><span className="muted">{t('sharing.canSee')}</span><span className="muted">{t('sharing.expires')}</span></div>
                <div className="row between small"><span>{s.scopes.map((x) => t('scope.' + x)).join(', ')}</span><span>{fmtDate(s.expires_at)}</span></div>
                <ConfirmButton className="btn btn-link small mt8" style={{ color: 'var(--danger)', width: '100%' }} onConfirm={() => stop(s)}
                  confirmText={t('sharing.confirm', { doctor: s.doctor?.full_name })}>
                  <span className="row" style={{ justifyContent: 'center', gap: 6 }}><Icon name="eyeOff" size={15} />{t('sharing.stop')}</span>
                </ConfirmButton>
              </div>
            )) : <Empty>{t('sharing.none')}</Empty>}
          </div>
          {!!past.length && (
            <>
              <h3 className="mt24">{t('sharing.expired')}</h3>
              <div className="stack mt8">{past.map((s) => (
                <div key={s.id} className="card small muted">{s.doctor?.full_name} · {t(s.revoked_at ? 'sharing.stoppedOn' : 'sharing.endedOn', { date: fmtDate(s.revoked_at || s.expires_at) })}</div>
              ))}</div>
            </>
          )}
          {adding ? (
            <div className="card mt16">
              <label className="lbl" style={{ marginTop: 0 }}>{t('sharing.doctor')}</label>
              <select className="field" value={form.doctor_id} onChange={(e) => setForm({ ...form, doctor_id: e.target.value })}>
                <option value="">—</option>
                {data.doctors.map((d) => <option key={d.id} value={d.id}>{d.full_name}</option>)}
              </select>
              <label className="lbl">{t('sharing.what')}</label>
              <div className="chips">{['bloodwork', 'history'].map((k) => {
                const on = form.scopes.includes(k);
                return <button key={k} className={'chip' + (on ? ' on' : '')} onClick={() => setForm({ ...form, scopes: on ? form.scopes.filter((x) => x !== k) : [...form.scopes, k] })}>{t('scope.' + k)}</button>;
              })}</div>
              <label className="lbl">{t('sharing.for')}</label>
              <div className="chips">{[7, 30, 90].map((n) => <button key={n} className={'chip' + (form.days === n ? ' on' : '')} onClick={() => setForm({ ...form, days: n })}>{t('sharing.days', { n })}</button>)}</div>
              <button className="btn btn-primary mt16" disabled={!form.doctor_id || !form.scopes.length} onClick={add}>{t('sharing.confirmAdd')}</button>
            </div>
          ) : <button className="btn btn-ghost mt16" onClick={() => setAdding(true)}>{t('sharing.new')}</button>}
        </>
      )}
    </Phone>
  );
}

/** Free vs Premium (Ste, 11 Nov): same app and booking for both; Premium keeps sharing the full history
 *  after 1 year and sends reminders to book the follow-up visit. Premium is free to try during the beta. */
export function Plans() {
  const { t } = useI18n();
  const { session, refresh, showToast } = useSession();
  const p = session?.profile || {};
  const premium = p.plan === 'premium';
  const [months, setMonths] = useState(p.followup_months || 6);
  const [busy, setBusy] = useState(false);
  async function start() { setBusy(true); await api.startPremiumTrial(); await api.updateProfile({ followup_months: months }); await refresh(); setBusy(false); showToast(t('plans.started')); }
  async function stop() { setBusy(true); await api.endPremium(); await refresh(); setBusy(false); showToast(t('plans.stopped')); }
  async function chooseMonths(n) { setMonths(n); if (premium) { await api.updateProfile({ followup_months: n }); await refresh(); } }
  const Card = ({ k, price, on }) => (
    <div className={'card' + (on ? '' : '')} data-testid={'plan-' + k} style={on ? { borderColor: 'var(--cherry)', borderWidth: 2 } : undefined}>
      <div className="row between">
        <div className="serif" style={{ fontSize: 24 }}>{t('plans.' + k + '.t')}</div>
        <div style={{ textAlign: 'right' }}><b>{price}</b>{k === 'premium' && <div className="tiny muted">{t('plans.month')}</div>}</div>
      </div>
      {on && <span className="badge cherry mt8">{t('plans.current')}</span>}
      <ul className="small" style={{ margin: '10px 0 0', paddingLeft: 20, lineHeight: 1.6 }}>
        {[1, 2, 3, 4].map((n) => t(`plans.${k}.f${n}`)).filter((x) => !x.startsWith('plans.')).map((x) => <li key={x}>{x}</li>)}
      </ul>
    </div>
  );
  return (
    <Phone>
      <TopBar title={t('plans.title')} />
      <div className="stack">
        <Card k="free" price="€0" on={!premium} />
        <Card k="premium" price="€6.99" on={premium} />
      </div>
      <div className="card-tan mt16">
        <div className="small" style={{ fontWeight: 600 }}>{t('plans.reminderQ')}</div>
        <div className="chips mt8">{[3, 6, 12].map((n) => <button key={n} className={'chip' + (months === n ? ' on' : '')} onClick={() => chooseMonths(n)}>{t('plans.months', { n })}</button>)}</div>
        <p className="tiny muted" style={{ margin: '8px 0 0' }}>{t('plans.reminderSub')}</p>
      </div>
      {premium
        ? <button className="btn btn-ghost mt16" disabled={busy} onClick={stop}>{t('plans.backToFree')}</button>
        : <button className="btn btn-primary mt16" disabled={busy} onClick={start} data-testid="try-premium">{t('plans.try')}</button>}
      <p className="tiny muted center mt8">{t('plans.beta')}</p>
    </Phone>
  );
}

export function Settings() {
  const { t } = useI18n();
  const nav = useNavigate();
  const { session, refresh, showToast } = useSession();
  const countryName = useCountryName();
  const p = session?.profile || {};
  const { data: isAdmin } = useData(() => api.isAdmin(), []);
  const [form, setForm] = useState({ full_name: p.full_name || '', city: p.city || '', country: p.country || 'ES', insurer: p.insurer || '', history_note: p.history_note || '' });

  async function save() { await api.updateProfile(form); await refresh(); showToast(t('settings.saved')); }
  async function exportData() {
    const data = await api.exportAll();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    a.download = `gigi-export-${new Date().toISOString().slice(0, 10)}.json`; a.click();
  }
  async function del() { await api.deleteAccount(); await refresh(); nav('/'); }
  return (
    <Phone>
      <TopBar title={t('settings.title')} />
      <h3>{t('settings.profile')}</h3>
      <label className="lbl">{t('auth.name')}</label><input className="field" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
      <div className="grid2">
        <div><label className="lbl">{t('settings.city')}</label><input className="field" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
        <div><label className="lbl">{t('check.country')}</label><select className="field" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })}>{COUNTRIES.map((c) => <option key={c} value={c}>{countryName(c)}</option>)}</select></div>
      </div>
      <label className="lbl">{t('about.insurer')}</label>
      <input className="field" value={form.insurer} onChange={(e) => setForm({ ...form, insurer: e.target.value })} />
      <label className="lbl">{t('record.personal')}</label>
      <textarea className="field" rows={3} value={form.history_note} onChange={(e) => setForm({ ...form, history_note: e.target.value })} />
      <button className="btn btn-primary mt16" onClick={save}>{t('common.save')}</button>

      <h3 className="mt24">{t('hist.title')}</h3>
      <p className="tiny muted" style={{ marginTop: 0 }}>{t('hist.settingsSub')}</p>
      <button className="btn btn-ghost" onClick={() => nav('/history')}>{t('hist.edit')}</button>

      <h3 className="mt24">{t('settings.language')}</h3>
      <div className="mt8"><LangPicker onChange={(l) => api.updateProfile({ language: l })} /></div>

      <h3 className="mt24">{t('settings.data')}</h3>
      <div className="stack mt8">
        <button className="btn btn-ghost" onClick={exportData}>{t('settings.export')}</button>
        <ConfirmButton style={{ color: 'var(--danger)' }} onConfirm={del} confirmText={t('settings.deleteConfirm')}>{t('settings.delete')}</ConfirmButton>
        <button className="btn btn-ghost" onClick={async () => { await api.signOut(); await refresh(); nav('/'); }}>{t('settings.logout')}</button>
      </div>

      {/* GiGi team only. On a computer these links live in the left menu; on a phone they stay here. */}
      {isAdmin && (
        <div className="mobile-only">
          <h3 className="mt24">{t('admin.title')}</h3>
          <button className="btn btn-primary mt8" onClick={() => nav('/admin')}>{t('admin.open')}</button>
          <h3 className="mt24">{t('settings.clinician')}</h3>
          <p className="tiny muted">{t('settings.clinicianSub')}</p>
          <button className="btn btn-ghost" onClick={() => nav('/doctor/login')}>{t('settings.openClinician')}</button>
        </div>
      )}
      {IS_DEMO && <button className="btn btn-link mt16" onClick={async () => { await api.resetDemo(); await refresh(); nav('/'); }}>{t('settings.resetDemo')}</button>}
    </Phone>
  );
}

export function NotificationsList({ embedded = false }) {
  const { t, fmtDate, fmtTime } = useI18n();
  const nav = useNavigate();
  const text = useNotifText();
  const { data, loading } = useData(() => api.listNotifications(), []);
  const body = loading ? <Loading /> : !data.length ? <Empty>{t('notif.none')}</Empty> : (
    <>
      <div className="row between"><span /><button className="btn btn-link small" onClick={() => api.markRead()}>{t('notif.markAll')}</button></div>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {data.map((n) => (
          <div key={n.id} className={'notif' + (n.read_at ? '' : ' unread')} onClick={async () => { await api.markRead(n.id); if (n.link) nav(n.link); }}>
            <div className="row" style={{ alignItems: 'flex-start' }}>
              {!n.read_at && <i style={{ width: 8, height: 8, borderRadius: 4, background: 'var(--persimmon)', marginTop: 6, flexShrink: 0 }} />}
              <div><div className="small" style={{ fontWeight: n.read_at ? 400 : 600 }}>{text(n)}</div><div className="tiny muted">{fmtDate(n.created_at)} · {fmtTime(n.created_at)}</div></div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
  if (embedded) return body;
  return <Phone><TopBar title={t('notif.title')} />{body}</Phone>;
}
