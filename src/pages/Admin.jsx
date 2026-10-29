import { useState } from 'react';
import { Phone, TopBar, Initials, Loading, Empty } from '../components/ui.jsx';
import Icon from '../components/Icon.jsx';
import { useI18n } from '../i18n/index.jsx';
import { api } from '../lib/api.js';
import { useSession, useData } from '../lib/session.jsx';

/** GiGi team only: approve or reject doctors before patients can see them. */
export default function Admin() {
  const { t, fmtDate, fmtMoney } = useI18n();
  const { showToast } = useSession();
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
        <h1>{t('admin.title')}</h1>
        {waiting > 0 && <span className="badge cherry">{t('admin.new', { n: waiting })}</span>}
      </div>
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
    </Phone>
  );
}
