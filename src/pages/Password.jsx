import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Phone, TopBar, LangPicker, PasswordField } from '../components/ui.jsx';
import { useI18n } from '../i18n/index.jsx';
import { api } from '../lib/api.js';
import { useSession } from '../lib/session.jsx';

/** "Forgot my password": asks for the e-mail and sends a reset link. */
export function ForgotPassword() {
  const { t } = useI18n();
  const [params] = useSearchParams();
  const [email, setEmail] = useState(params.get('email') || '');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  async function submit(e) {
    e.preventDefault(); setBusy(true); setErr('');
    try { await api.requestPasswordReset(email); setSent(true); }
    catch (ex) { setErr(ex.message); }
    finally { setBusy(false); }
  }
  return (
    <Phone>
      <TopBar />
      <LangPicker compact />
      <h1 className="mt16">{t('forgot.title')}</h1>
      {params.get('expired') && !sent && <div className="card-tan small mt8">{t('forgot.expired')}</div>}
      {sent ? (
        <div className="card mt16"><p style={{ margin: 0 }}>{t('forgot.sent')}</p></div>
      ) : (
        <form onSubmit={submit}>
          <p className="muted small">{t('forgot.sub')}</p>
          <label className="lbl">{t('auth.email')}</label>
          <input className="field" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          {err && <div className="error">{err}</div>}
          <button className="btn btn-primary mt24" disabled={busy}>{t('forgot.send')}</button>
        </form>
      )}
      <Link to="/auth?mode=login" className="btn btn-link mt16" style={{ textAlign: 'center', textDecoration: 'none' }}>{t('forgot.back')}</Link>
    </Phone>
  );
}

/** Opened from the e-mail link: choose a new password. */
export function ResetPassword() {
  const { t } = useI18n();
  const nav = useNavigate();
  const { session, refresh, showToast } = useSession();
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  if (session === undefined) return <Phone><TopBar /></Phone>;
  if (!session) {
    return (
      <Phone>
        <TopBar />
        <h1>{t('reset.title')}</h1>
        <div className="card-tan small mt16">{t('reset.noSession')}</div>
        <Link to="/forgot" className="btn btn-primary mt24" style={{ textAlign: 'center', textDecoration: 'none' }}>{t('forgot.send')}</Link>
      </Phone>
    );
  }
  async function submit(e) {
    e.preventDefault(); setErr('');
    if (pw.length < 8) { setErr(t('reset.short')); return; }
    if (pw !== pw2) { setErr(t('reset.mismatch')); return; }
    setBusy(true);
    try {
      await api.updatePassword(pw);
      showToast(t('reset.done'));
      await refresh();
      nav(session.profile?.role === 'doctor' ? '/doctor' : '/home', { replace: true });
    } catch (ex) { setErr(ex.message); } finally { setBusy(false); }
  }
  return (
    <Phone>
      <TopBar back={false} />
      <LangPicker compact />
      <h1 className="mt16">{t('reset.title')}</h1>
      <p className="muted small">{session.user.email}</p>
      <form onSubmit={submit}>
        <label className="lbl">{t('reset.new')}</label>
        <PasswordField value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" minLength={8} ariaLabel={t('reset.new')} />
        <label className="lbl">{t('reset.confirm')}</label>
        <PasswordField value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" minLength={8} ariaLabel={t('reset.confirm')} />
        <p className="tiny muted">{t('reset.short')}</p>
        {err && <div className="error">{err}</div>}
        <button className="btn btn-primary mt16" disabled={busy}>{t('reset.save')}</button>
      </form>
    </Phone>
  );
}
