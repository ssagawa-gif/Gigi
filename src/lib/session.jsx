import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { api } from './api.js';
import { useI18n } from '../i18n/index.jsx';

const Ctx = createContext(null);

export function SessionProvider({ children }) {
  const [session, setSession] = useState(undefined); // undefined = loading
  const [tick, setTick] = useState(0);                // bumps when data changes anywhere
  const [toast, setToast] = useState(null);
  const { setLang } = useI18n();
  const langSynced = useRef(null);

  const refresh = useCallback(async () => {
    try { setSession(await api.getSession()); } catch { setSession(null); }
    setTick((n) => n + 1);
  }, []);

  useEffect(() => { refresh(); return api.onChange(refresh); }, [refresh]);

  // adopt the language saved on the profile once per login
  useEffect(() => {
    const p = session?.profile;
    if (p && langSynced.current !== p.id) { langSynced.current = p.id; if (p.language) setLang(p.language); }
  }, [session, setLang]);

  const showToast = useCallback((msg) => { setToast(msg); setTimeout(() => setToast(null), 2800); }, []);

  return (
    <Ctx.Provider value={{ session, refresh, tick, showToast }}>
      {children}
      {toast && <div className="toast" role="status">{toast}</div>}
    </Ctx.Provider>
  );
}

export const useSession = () => useContext(Ctx);

/** Load async data and reload whenever anything changes (tick) or deps change. */
export function useData(loader, deps = []) {
  const { tick } = useSession();
  const [state, setState] = useState({ data: null, loading: true, error: null });
  useEffect(() => {
    let alive = true;
    loader().then((data) => alive && setState({ data, loading: false, error: null }))
      .catch((error) => alive && setState({ data: null, loading: false, error }));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, ...deps]);
  return state;
}
