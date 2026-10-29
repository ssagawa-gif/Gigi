import { createContext, useContext, useMemo, useState, useCallback } from 'react';
import en from './en.js';
import pt from './pt.js';
import es from './es.js';

const DICTS = { en, pt, es };
export const LANGS = [
  { code: 'en', label: 'English' },
  { code: 'pt', label: 'Português' },
  { code: 'es', label: 'Español' },
];
const LOCALE = { en: 'en-GB', pt: 'pt-BR', es: 'es-ES' };

function initialLang() {
  try {
    const saved = localStorage.getItem('gigi_lang');
    if (saved && DICTS[saved]) return saved;
  } catch { /* ignore */ }
  const nav = (navigator.language || 'en').slice(0, 2);
  return DICTS[nav] ? nav : 'en';
}

const Ctx = createContext(null);

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(initialLang);
  const setLang = useCallback((l) => {
    if (!DICTS[l]) return;
    setLangState(l);
    try { localStorage.setItem('gigi_lang', l); } catch { /* ignore */ }
    document.documentElement.lang = l;
  }, []);
  const value = useMemo(() => {
    const dict = DICTS[lang];
    const t = (key, vars) => {
      let s = dict[key] ?? en[key] ?? key;
      if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, v ?? '');
      return s;
    };
    const locale = LOCALE[lang];
    const fmtDate = (d, opts = { day: 'numeric', month: 'short', year: 'numeric' }) =>
      d ? new Date(String(d).length === 10 ? d + 'T12:00:00' : d).toLocaleDateString(locale, opts) : '';
    const fmtMonth = (d) => fmtDate(d, { month: 'short', year: '2-digit' });
    const fmtTime = (d) => new Date(d).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
    const fmtSlot = (d) => `${fmtDate(d, { weekday: 'short', day: 'numeric', month: 'short' })} · ${fmtTime(d)}`;
    const fmtMoney = (n) => (n == null ? '—' : new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(n));
    const fmtNum = (n) => (n == null ? '—' : new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(n));
    return { lang, setLang, t, locale, fmtDate, fmtMonth, fmtTime, fmtSlot, fmtMoney, fmtNum };
  }, [lang, setLang]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useI18n = () => useContext(Ctx);
