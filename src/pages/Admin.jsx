import { useState } from 'react';
import { Phone, TopBar, Initials, Loading, Empty, ConfirmButton } from '../components/ui.jsx';
import Icon from '../components/Icon.jsx';
import { useI18n } from '../i18n/index.jsx';
import { api } from '../lib/api.js';
import { useSession, useData } from '../lib/session.jsx';

/** GiGi team only: approve or reject doctors before patients can see them. */
export default function Admin() {
  const { t, fmtDate, fmtMoney } = useI18n();
  const { showToast } = useSession();
  const [section, setSection] = useState('doctors');
  const [tab, setTab] = useState('pending');
  const [busy, setBusy] = useState(null);
  const { data, loading } = useData(async () => {
    const admin = await api.isAdmin();
    return { admin, doctors: admin ? await api.adminListDoctors() : [] };
  }, []);

  if (loading) return <Phone wide><TopBar title={t('admin.title')} /><Loading /></Phone>;
  if (!data?.admin) return <Phone wide><TopBar title={t('admin.title')} /><Empty>{t('admin.notAllowed')}</Empty></Phone>;

  const list = data.doctors.filter((d) => d.review_status === tab);
  const waiting = data.doctors.filter((d) => d.review_status === 'pending').length;

  async function set(d, status) {
    setBusy(d.id);
    try {
      await api.adminSetDoctor(d.id, status);
      if (status === 'approved') showToast(t('admin.doneApproved', { name: d.full_name }));
      if (status === 'rejected') showToast(t('admin.doneRejected', { name: d.full_name }));
    } finally { setBusy(null); }
  }

  return (
    <Phone wide>
      <div className="row between">
        <h1>{section === 'team' ? t('admin.tab.team') : t('admin.title')}</h1>
        {waiting > 0 && <span className="badge cherry">{t('admin.new', { n: waiting })}</span>}
      </div>
      <div className="chips mt8" role="tablist">
        {['doctors', 'team'].map((k) => (
          <button key={k} className={'chip' + (section === k ? ' on' : '')} style={{ fontWeight: 600 }} onClick={() => setSection(k)}>{t('admin.tab.' + k)}</button>
        ))}
      </div>
      <div className="divider" />
      {section === 'team' ? <Team /> : (<>
      <p className="small muted">{t('admin.hint')}</p>
      <div className="chips mt8">
        {['pending', 'approved', 'rejected'].map((k) => (
          <button key={k} className={'chip' + (tab === k ? ' on' : '')} onClick={() => setTab(k)}>{t('admin.tab.' + k)}</button>
        ))}
      </div>
      <div className="stack dgrid mt16">
        {list.length ? list.map((d) => (
          <div key={d.id} className="card" data-testid="admin-doctor">
            <div className="row">
              <Initials name={d.full_name || 'Dr'} />
              <div className="grow">
                <div className="serif" style={{ fontSize: 20 }}>{d.full_name || '—'}</div>
                <div className="tiny muted">{[d.specialty ? t('spec.' + d.specialty) : null, d.area].filter(Boolean).join(' · ')}</div>
              </div>
            </div>
            <div className="divider" />
            <div className="stack small muted" style={{ fontSize: 12.5 }}>
              <div className="row" style={{ gap: 8 }}><Icon name="inbox" size={14} />{d.email}</div>
              {!!d.languages?.length && <div className="row" style={{ gap: 8 }}><Icon name="lang" size={14} />{d.languages.join(', ')}</div>}
              {d.first_visit_fee != null && <div className="row" style={{ gap: 8 }}><Icon name="euro" size={14} />{t('doctor.firstVisit')} {fmtMoney(d.first_visit_fee)}</div>}
              {d.created_at && <div className="row" style={{ gap: 8 }}><Icon name="calendar" size={14} />{t('admin.signedUp', { date: fmtDate(d.created_at) })}</div>}
            </div>
            {d.bio && <p className="small" style={{ marginBottom: 0 }}>{d.bio}</p>}
            <div className="row mt16" style={{ justifyContent: 'flex-end' }}>
              {tab === 'pending' ? (
                <>
                  <button className="btn btn-ghost btn-small" disabled={busy === d.id} onClick={() => set(d, 'rejected')}>{t('admin.reject')}</button>
                  <button className="btn btn-primary btn-small" disabled={busy === d.id} onClick={() => set(d, 'approved')}>{t('admin.approve')}</button>
                </>
              ) : (
                <button className="btn btn-ghost btn-small" disabled={busy === d.id} onClick={() => set(d, 'pending')}>{t('admin.undo')}</button>
              )}
            </div>
          </div>
        )) : <Empty>{t('admin.none')}</Empty>}
      </div>
      </>)}
    </Phone>
  );
}

/** GiGi team: add or remove administrators by e-mail. */
function Team() {
  const { t } = useI18n();
  const { showToast } = useSession();
  const [email, setEmail] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const { data, loading } = useData(() => api.adminListTeam(), []);

  async function add(e) {
    e.preventDefault(); setErr('');
    const v = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) { setErr(t('admin.team.invalid')); return; }
    setBusy(true);
    try { await api.adminAddAdmin(v); setEmail(''); showToast(t('admin.team.added', { email: v })); }
    catch (ex) { setErr(ex.message.includes('invalid') ? t('admin.team.invalid') : ex.message); }
    finally { setBusy(false); }
  }
  async function remove(v) { await api.adminRemoveAdmin(v); showToast(t('admin.team.removed', { email: v })); }

  return (
    <div style={{ maxWidth: 680 }}>
      <h3>{t('admin.team.title')}</h3>
      <p className="small muted">{t('admin.team.hint')}</p>
      <form className="row mt8" onSubmit={add}>
        <input className="field grow" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('admin.team.email')} aria-label={t('admin.team.email')} />
        <button className="btn btn-primary btn-small" style={{ padding: '12px 20px' }} disabled={busy || !email.trim()}>{t('admin.team.add')}</button>
      </form>
      {err && <div className="error">{err}</div>}
      <div className="card mt16" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? <Loading /> : (data || []).map((m) => (
          <div key={m.email} className="row between" style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)' }} data-testid="team-member">
            <div>
              <div style={{ fontWeight: 500 }}>{m.email}
                {m.is_me && <span className="tiny muted"> ({t('admin.team.you')})</span>}
                {m.is_founder && <span className="badge neutral" style={{ marginLeft: 8 }}>{t('admin.team.owner')}</span>}
              </div>
              <div className="tiny muted">{m.has_account ? t('admin.team.hasAccount') : t('admin.team.waiting')}</div>
            </div>
            {!m.is_me && !m.is_founder && (
              <ConfirmButton className="btn btn-ghost btn-small" onConfirm={() => remove(m.email)} confirmText={t('admin.team.confirmRemove')}>{t('admin.team.remove')}</ConfirmButton>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
