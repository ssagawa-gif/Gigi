import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Phone, TopBar, LangPicker } from '../../components/ui.jsx';
import Icon from '../../components/Icon.jsx';
import { useI18n } from '../../i18n/index.jsx';
import { api, IS_DEMO } from '../../lib/api.js';
import { useSession } from '../../lib/session.jsx';
import { LAURA, MARTA } from '../../lib/seed.js';

import LogoMark from '../../components/Logo.jsx';

export function Logo({ size = 64 }) {
  return <LogoMark size={size} center />;
}

export function Welcome() {
  const { t } = useI18n();
  const nav = useNavigate();
  const { session } = useSession();
  return (
    <Phone>
      <LangPicker compact />
      <div className="mobile-only">
        <div style={{ height: 40 }} />
        <Logo />
        <h1 className="center mt16" style={{ fontSize: 30 }}>{t('welcome.headline')}</h1>
        <p className="muted small center" style={{ margin: '12px 20px 28px' }}>{t('welcome.sub')}</p>
      </div>
      <h1 className="desk-only" style={{ marginTop: 40 }}>{t('welcome.deskTitle')}</h1>
      <p className="desk-only muted">{t('auth.sub')}</p>
      <div className="card stack mobile-only">
        {[['history', 'welcome.p1'], ['steth', 'welcome.p2'], ['shield', 'welcome.p3']].map(([i, k]) => (
          <div key={k} className="row"><Icon name={i} size={18} style={{ color: 'var(--cherry)' }} /><span className="serif" style={{ fontSize: 17 }}>{t(k)}</span></div>
        ))}
      </div>
      <div className="spacer" />
      {session?.profile ? (
        <button className="btn btn-primary mt24" onClick={() => nav(session.profile.role === 'doctor' ? '/doctor' : '/home')}>{t('welcome.continue')}</button>
      ) : (
        <>
          <button className="btn btn-primary mt24" onClick={() => nav('/consent')}>{t('welcome.start')}</button>
          <button className="btn btn-link mt8" onClick={() => nav('/auth?mode=login')}>{t('welcome.haveAccount')}</button>
        </>
      )}
      <p className="tiny muted center mt8">
        {IS_DEMO ? t('welcome.footDemo') : t('welcome.foot')} · <Link to="/doctor/login" style={{ whiteSpace: 'nowrap' }}>{t('welcome.forDoctors')}</Link> · <Link to="/auth?mode=login&next=/admin" style={{ whiteSpace: 'nowrap' }}>{t('welcome.forAdmins')}</Link>
      </p>
    </Phone>
  );
}

export function Consent() {
  const { t } = useI18n();
  const nav = useNavigate();
  const items = [
    ['database', 'consent.store.t', 'consent.store.d'],
    ['server', 'consent.eu.t', 'consent.eu.d'],
    ['eye', 'consent.who.t', 'consent.who.d'],
    ['download', 'consent.export.t', 'consent.export.d'],
  ];
  return (
    <Phone>
      <TopBar />
      <h1>{t('consent.title')}</h1>
      <p className="muted small">{t('consent.intro')}</p>
      <div className="stack mt16">
        {items.map(([i, a, b]) => (
          <div key={a} className="row" style={{ alignItems: 'flex-start' }}>
            <div className="icon-circle"><Icon name={i} size={16} /></div>
            <div><div style={{ fontWeight: 600, fontSize: 14 }}>{t(a)}</div><div className="muted small">{t(b)}</div></div>
          </div>
        ))}
      </div>
      <div className="card row mt24" style={{ alignItems: 'flex-start' }}>
        <Icon name="info" size={16} /><span className="tiny muted">{t('consent.foot')}</span>
      </div>
      <div className="spacer" />
      <button className="btn btn-primary mt24" onClick={() => { sessionStorage.setItem('gigi_consent', new Date().toISOString()); nav('/auth?mode=signup'); }}>{t('consent.agree')}</button>
    </Phone>
  );
}

/** Sign up / log in, for patients and (role=doctor) clinicians. */
export function Auth({ role = 'patient' }) {
  const { t, lang } = useI18n();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [mode, setMode] = useState(params.get('mode') || 'signup');
  const [form, setForm] = useState({ full_name: '', email: '', password: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const { refresh } = useSession();
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const home = role === 'doctor' ? '/doctor' : '/home';

  async function submit(e) {
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      if (mode === 'signup') {
        await api.signUp({ ...form, role, language: lang });
        await refresh();
        nav(role === 'doctor' ? '/doctor/profile' : '/about');
      } else {
        const s = await api.signIn(form);
        await refresh();
        const next = params.get('next');
        if (next && next.startsWith('/')) nav(next);   // e.g. the admin link on the welcome screen
        else if (s?.profile?.role !== role) nav(s?.profile?.role === 'doctor' ? '/doctor' : '/home');
        else nav(home);
      }
    } catch (ex) {
      setErr(t('err.' + ex.message) !== 'err.' + ex.message ? t('err.' + ex.message) : ex.message);
    } finally { setBusy(false); }
  }
  async function demo(id) { await api.signInAs(id); await refresh(); nav(id === MARTA ? '/doctor' : '/home'); }

  return (
    <Phone>
      <TopBar right={null} />
      <LangPicker compact />
      <h1 className="mt16">{role === 'doctor' ? t('auth.doctorTitle') : mode === 'signup' ? t('auth.signupTitle') : t('auth.loginTitle')}</h1>
      <p className="muted small">{role === 'doctor' ? t('auth.doctorSub') : t('auth.sub')}</p>
      <form onSubmit={submit}>
        {mode === 'signup' && (<><label className="lbl">{t('auth.name')}</label><input className="field" required value={form.full_name} onChange={set('full_name')} placeholder={role === 'doctor' ? 'Dr Marta Puig' : 'Laura'} /></>)}
        <label className="lbl">{t('auth.email')}</label>
        <input className="field" type="email" required value={form.email} onChange={set('email')} autoComplete="email" />
        <label className="lbl">{t('auth.password')}</label>
        <input className="field" type="password" required minLength={IS_DEMO ? 1 : 8} value={form.password} onChange={set('password')} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} />
        {err && <div className="error">{err}</div>}
        <button className="btn btn-primary mt24" disabled={busy}>{mode === 'signup' ? t('auth.create') : t('auth.login')}</button>
      </form>
      <button className="btn btn-link mt8" onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')}>
        {mode === 'signup' ? t('auth.toLogin') : t('auth.toSignup')}
      </button>
      {IS_DEMO && (
        <div className="card-tan mt24">
          <div className="small" style={{ fontWeight: 600 }}>{t('auth.demoTitle')}</div>
          <p className="tiny muted" style={{ margin: '4px 0 10px' }}>{t('auth.demoSub')}</p>
          {role === 'doctor'
            ? <button className="btn btn-ghost btn-small" onClick={() => demo(MARTA)}>{t('auth.demoDoctor')}</button>
            : <button className="btn btn-ghost btn-small" onClick={() => demo(LAURA)}>{t('auth.demoPatient')}</button>}
        </div>
      )}
    </Phone>
  );
}

export function AboutYou() {
  const { t } = useI18n();
  const nav = useNavigate();
  const { session, refresh } = useSession();
  const [name, setName] = useState(session?.profile?.full_name || '');
  const [reasons, setReasons] = useState(session?.profile?.reasons || []);
  const opts = ['fertility', 'understand', 'doctor', 'history'];
  const toggle = (k) => setReasons(reasons.includes(k) ? reasons.filter((x) => x !== k) : [...reasons, k]);
  async function next() {
    await api.updateProfile({ full_name: name, reasons });
    await refresh();
    nav('/add?first=1');
  }
  return (
    <Phone>
      <TopBar />
      <h1>{t('about.title')}</h1>
      <p className="muted small">{t('about.sub')}</p>
      <label className="lbl">{t('about.name')}</label>
      <input className="field" value={name} onChange={(e) => setName(e.target.value)} />
      <label className="lbl">{t('about.why')}</label>
      <p className="tiny muted" style={{ marginTop: -2 }}>{t('about.all')}</p>
      <div className="stack">
        {opts.map((k) => (
          <button key={k} className={'option' + (reasons.includes(k) ? ' on' : '')} onClick={() => toggle(k)}>
            <div><div className="serif" style={{ fontSize: 18 }}>{t(`about.${k}.t`)}</div><div className="tiny muted">{t(`about.${k}.d`)}</div></div>
            <span className="radio" />
          </button>
        ))}
      </div>
      <div className="spacer" />
      <button className="btn btn-primary mt24" disabled={!reasons.length || !name.trim()} onClick={next}>{t('common.continue')}</button>
    </Phone>
  );
}
