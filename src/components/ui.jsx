import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import Icon from './Icon.jsx';
import { useI18n, LANGS } from '../i18n/index.jsx';
import { api } from '../lib/api.js';
import { useData, useSession } from '../lib/session.jsx';
import { markerName } from '../lib/markers.js';

export function useIsDesktop() {
  const q = '(min-width: 900px)';
  const [m, setM] = useState(() => typeof window !== 'undefined' && window.matchMedia(q).matches);
  useEffect(() => {
    const mq = window.matchMedia(q); const on = () => setM(mq.matches);
    mq.addEventListener('change', on); return () => mq.removeEventListener('change', on);
  }, []);
  return m;
}

/**
 * Screen wrapper. Phone: the Lovable phone layout with bottom nav.
 * Desktop (>= 900px): signed-in patients get a side menu; onboarding pages get a centred card.
 * `wide` lets list pages use the full width with 2-column grids.
 */
export function Phone({ children, nav = false, wide = false }) {
  const desktop = useIsDesktop();
  const { session } = useSession();
  if (desktop) {
    if (session?.profile?.role === 'patient') return <PatientDesktop wide={wide}>{children}</PatientDesktop>;
    return <DeskSplit>{children}</DeskSplit>;
  }
  return (
    <div className="stage">
      <div className="phone">
        <div className={'screen' + (nav ? ' with-nav' : '')}>{children}</div>
        {nav && <BottomNav />}
      </div>
    </div>
  );
}

/** Desktop, before login: cherry brand panel on the left, the screen on the right. */
function DeskSplit({ children }) {
  const { t } = useI18n();
  return (
    <div className="desk-split">
      <div className="brand-panel">
        <span className="logo">GiGi<span className="dots"><i /><i /><i /></span></span>
        <h1>{t('welcome.headline')}</h1>
        <p>{t('welcome.sub')}</p>
        <div className="brand-points">
          {[['history', 'welcome.p1'], ['steth', 'welcome.p2'], ['shield', 'welcome.p3']].map(([i, k]) => (
            <div key={k} className="row"><Icon name={i} size={18} /><span className="serif" style={{ fontSize: 20 }}>{t(k)}</span></div>
          ))}
        </div>
      </div>
      <div className="split-side"><div className="split-content">{children}</div></div>
    </div>
  );
}

function PatientDesktop({ children, wide }) {
  const { t } = useI18n();
  const navTo = useNavigate();
  const { refresh } = useSession();
  const { data: notifs } = useData(() => api.listNotifications(), []);
  const unread = (notifs || []).filter((n) => !n.read_at).length;
  const links = [
    ['/home', 'home', t('nav.home')],
    ['/record', 'file', t('nav.record')],
    ['/doctors', 'steth', t('nav.doctors')],
    ['/sharing', 'share', t('nav.sharing')],
    ['/notifications', 'bell', t('notif.title'), unread],
  ];
  return (
    <div className="console">
      <aside className="sidebar">
        <span className="logo">GiGi<span className="dots"><i /><i /><i /></span></span>
        {links.map(([to, icon, label, n]) => (
          <NavLink key={to} to={to} className={({ isActive }) => (isActive ? 'active' : '')}>
            <Icon name={icon} size={18} />{label}{n ? <span className="count">{n}</span> : null}
          </NavLink>
        ))}
        <NavLink to="/plans" className={({ isActive }) => (isActive ? 'active' : '')}><Icon name="sparkle" size={18} />{t('plans.title')}</NavLink>
        <div className="spacer" />
        <NavLink to="/settings" className={({ isActive }) => (isActive ? 'active' : '')}><Icon name="settings" size={18} />{t('settings.title')}</NavLink>
        <a href="#/" onClick={async (e) => { e.preventDefault(); await api.signOut(); await refresh(); navTo('/'); }}><Icon name="logout" size={18} />{t('settings.logout')}</a>
      </aside>
      <main className="main desk-main">
        <div className={'desk-inner' + (wide ? ' wide' : '')}>{children}</div>
      </main>
    </div>
  );
}

export function TopBar({ title, back = true, close = false, right = null, onBack }) {
  const nav = useNavigate();
  const { t } = useI18n();
  return (
    <div className="topbar">
      {back || close ? (
        <button className="icon-btn" aria-label={t('common.back')} onClick={onBack || (() => nav(-1))}>
          <Icon name={close ? 'close' : 'back'} />
        </button>
      ) : <span />}
      <div className="title">{title}</div>
      <div style={{ justifySelf: 'end' }}>{right}</div>
    </div>
  );
}

export function BottomNav() {
  const { t } = useI18n();
  const items = [
    ['/home', 'home', t('nav.home')],
    ['/record', 'file', t('nav.record')],
    ['/doctors', 'steth', t('nav.doctors')],
    ['/sharing', 'share', t('nav.sharing')],
  ];
  return (
    <nav className="bottom-nav">
      {items.map(([to, icon, label]) => (
        <NavLink key={to} to={to} className={({ isActive }) => (isActive ? 'active' : '')}>
          <Icon name={icon} size={20} />{label}
        </NavLink>
      ))}
    </nav>
  );
}

export function StatusBadge({ status }) {
  const { t } = useI18n();
  if (!status) return null;
  return <span className={'badge ' + (status === 'unknown' ? 'neutral' : status)}>{t('status.' + status)}</span>;
}

export function Initials({ name = '', className = 'avatar' }) {
  const ini = name.replace(/^Dr\.?\s+/i, '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  return <div className={className}>{name.startsWith('Dr') ? 'Dr' : ini || '·'}</div>;
}

export function MeAvatar({ name }) {
  const nav = useNavigate();
  const ini = (name || '?').slice(0, 2).toUpperCase();
  return <button className="avatar me" style={{ border: 0 }} onClick={() => nav('/settings')} aria-label="Settings">{ini}</button>;
}

export function Bell({ to }) {
  const nav = useNavigate();
  const { data } = useData(() => api.listNotifications(), []);
  const unread = (data || []).filter((n) => !n.read_at).length;
  return (
    <button className="icon-btn bell" onClick={() => nav(to)} aria-label="Notifications">
      <Icon name="bell" />
      {unread > 0 && <span className="dot">{unread}</span>}
    </button>
  );
}

export function LangPicker({ compact = false, onChange }) {
  const { lang, setLang } = useI18n();
  return (
    <div className="chips" style={compact ? { justifyContent: 'center' } : null}>
      {LANGS.map((l) => (
        <button key={l.code} className={'chip' + (lang === l.code ? ' on' : '')}
          onClick={() => { setLang(l.code); onChange?.(l.code); }}>{l.label}</button>
      ))}
    </div>
  );
}

export function Loading() {
  const { t } = useI18n();
  return <p className="muted small center mt24">{t('common.loading')}</p>;
}

export function Empty({ children }) {
  return <div className="card muted small center">{children}</div>;
}

/** Turns a notification row into translated text. */
export function useNotifText() {
  const { t, fmtSlot, lang } = useI18n();
  return (n) => {
    const d = n.data || {};
    const marker = d.marker_code ? markerName(d.marker_code, lang) : '';
    return t('notif.' + n.type, {
      patient: d.patient_name, doctor: d.doctor_name, name: d.name, marker,
      when: d.starts_at ? fmtSlot(d.starts_at) : '',
    });
  };
}

/** Two-tap confirmation (works everywhere, unlike window.confirm). */
export function ConfirmButton({ children, confirmText, onConfirm, className = 'btn btn-ghost', style }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => { if (!armed) return; const id = setTimeout(() => setArmed(false), 4000); return () => clearTimeout(id); }, [armed]);
  return (
    <button className={className} style={style} onClick={() => (armed ? (setArmed(false), onConfirm()) : setArmed(true))}>
      {armed ? confirmText : children}
    </button>
  );
}
