import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import Icon from './Icon.jsx';
import { useI18n, LANGS } from '../i18n/index.jsx';
import { api } from '../lib/api.js';
import { useData } from '../lib/session.jsx';
import { markerName } from '../lib/markers.js';

export function Phone({ children, nav = false }) {
  return (
    <div className="stage">
      <div className="phone">
        <div className={'screen' + (nav ? ' with-nav' : '')}>{children}</div>
        {nav && <BottomNav />}
      </div>
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
