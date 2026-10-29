import { useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Phone, TopBar, StatusBadge } from '../../components/ui.jsx';
import Icon from '../../components/Icon.jsx';
import { useI18n } from '../../i18n/index.jsx';
import { api } from '../../lib/api.js';
import { useSession } from '../../lib/session.jsx';
import { MARKERS, byCode, evaluate, buildResult, markerName } from '../../lib/markers.js';

export const COUNTRIES = ['ES', 'BR', 'PT', 'FR', 'IT', 'DE', 'GB', 'IE', 'NL', 'CH', 'US', 'CA', 'MX', 'AR', 'CL', 'CO', 'PE', 'UY'];
export function useCountryName() {
  const { locale } = useI18n();
  let dn = null;
  try { dn = new Intl.DisplayNames([locale], { type: 'region' }); } catch { /* ignore */ }
  return (c) => (dn ? dn.of(c) : c);
}

export function AddToRecord() {
  const { t } = useI18n();
  const nav = useNavigate();
  const [params] = useSearchParams();
  return (
    <Phone>
      <TopBar title={t('add.title')} close onBack={() => nav(params.get('first') ? '/home' : -1)} />
      <div className="row between tiny muted"><span>{t('add.step', { n: 1 })}</span><span>50%</span></div>
      <div className="progress mt8"><i style={{ width: '50%' }} /></div>
      <div className="stack mt16">
        <button className="option" onClick={() => nav('/add/upload')}>
          <div className="row"><div className="icon-circle"><Icon name="file" size={16} /></div><div><div style={{ fontWeight: 600 }}>{t('add.upload')}</div><div className="tiny muted">{t('add.uploadSub')}</div></div></div>
          <Icon name="chevron" size={16} />
        </button>
        <button className="option" onClick={() => nav('/add/check')}>
          <div className="row"><div className="icon-circle"><Icon name="pencil" size={16} /></div><div><div style={{ fontWeight: 600 }}>{t('add.manual')}</div><div className="tiny muted">{t('add.manualSub')}</div></div></div>
          <Icon name="chevron" size={16} />
        </button>
      </div>
      <p className="tiny muted center mt16">{t('add.note')}</p>
      {params.get('first') && <button className="btn btn-link mt16" onClick={() => nav('/home')}>{t('add.later')}</button>}
    </Phone>
  );
}

export function Upload() {
  const { t } = useI18n();
  const nav = useNavigate();
  const input = useRef();
  const [err, setErr] = useState('');
  function pick(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 8 * 1024 * 1024) { setErr(t('upload.tooBig')); return; }
    nav('/add/check', { state: { file: f } });
  }
  return (
    <Phone>
      <TopBar title={t('upload.title')} />
      <div className="card-cherry">
        <Icon name="sparkle" size={22} />
        <h2 style={{ fontSize: 26, margin: '8px 0' }}>{t('upload.headline')}</h2>
        <p className="small" style={{ margin: 0, opacity: .9 }}>{t('upload.sub')}</p>
      </div>
      <div className="dropzone mt16" onClick={() => input.current.click()}>
        <Icon name="upload" size={30} style={{ color: 'var(--cherry)' }} />
        <div style={{ fontWeight: 600, marginTop: 8 }}>{t('upload.choose')}</div>
        <div className="tiny muted">{t('upload.max')}</div>
        <input ref={input} type="file" accept="application/pdf,image/*" hidden onChange={pick} data-testid="file" />
      </div>
      {err && <div className="error">{err}</div>}
      <div className="row mt16 tiny muted" style={{ alignItems: 'flex-start' }}><Icon name="shield" size={14} /><span>{t('upload.private')}</span></div>
      <div className="row mt8 tiny muted" style={{ alignItems: 'flex-start' }}><Icon name="info" size={14} /><span>{t('upload.notDiagnosis')}</span></div>
    </Phone>
  );
}

const emptyRow = () => ({ code: '', value: '', unit: '', low: '', high: '' });

export function CheckResults() {
  const { t, lang } = useI18n();
  const nav = useNavigate();
  const { state } = useLocation();
  const file = state?.file || null;
  const { session, showToast } = useSession();
  const countryName = useCountryName();
  const [ctx, setCtx] = useState({ lab: '', country: session?.profile?.country || 'ES', date: new Date().toISOString().slice(0, 10) });
  const [rows, setRows] = useState([emptyRow()]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const setRow = (i, patch) => setRows(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  function chooseMarker(i, code) {
    const m = byCode[code];
    setRow(i, { code, unit: m?.unit || '', low: m?.defaultRange?.[0] ?? '', high: m?.defaultRange?.[1] ?? '' });
  }
  function chooseUnit(i, unit) {
    const r = rows[i]; const m = byCode[r.code];
    // ranges differ per unit: clear the defaults so the person types the range printed on her report
    const keep = m && unit === m.unit && m.defaultRange;
    setRow(i, { unit, low: keep ? m.defaultRange[0] : '', high: keep ? m.defaultRange[1] : '' });
  }
  const valid = rows.every((r) => r.code && r.value !== '' && r.unit) && ctx.date;

  async function save() {
    setBusy(true); setErr('');
    try {
      const report = await api.addReport({ file, lab_name: ctx.lab, country: ctx.country, test_date: ctx.date });
      const built = rows.map((r) => ({ ...buildResult({ code: r.code, value: r.value, unit: r.unit, low: r.low, high: r.high, date: ctx.date, lab: ctx.lab, country: ctx.country }), report_id: report.id }));
      await api.addResults(built);
      const flagged = built.find((r) => r.needs_review);
      showToast(t('check.saved'));
      nav(flagged ? `/marker/${flagged.marker_code}` : '/record', { replace: true });
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }

  return (
    <Phone>
      <TopBar title={t('check.title')} close />
      <div className="row between tiny muted"><span>{t('add.step', { n: 2 })}</span><span>100%</span></div>
      <div className="progress mt8"><i style={{ width: '100%' }} /></div>
      {file && (
        <div className="card list-item mt16"><Icon name="file" /><div><div style={{ fontWeight: 500 }}>{file.name}</div><div className="tiny muted">{(file.size / 1024).toFixed(0)} KB</div></div></div>
      )}
      <p className="small muted mt16">{file ? t('check.introFile') : t('check.introManual')}</p>

      <div className="card">
        <label className="lbl" style={{ marginTop: 0 }}>{t('check.lab')}</label>
        <input className="field" value={ctx.lab} onChange={(e) => setCtx({ ...ctx, lab: e.target.value })} placeholder="Synlab Barcelona" />
        <div className="grid2">
          <div><label className="lbl">{t('check.country')}</label>
            <select className="field" value={ctx.country} onChange={(e) => setCtx({ ...ctx, country: e.target.value })}>
              {COUNTRIES.map((c) => <option key={c} value={c}>{countryName(c)}</option>)}
            </select></div>
          <div><label className="lbl">{t('check.date')}</label>
            <input className="field" type="date" value={ctx.date} onChange={(e) => setCtx({ ...ctx, date: e.target.value })} /></div>
        </div>
      </div>

      {rows.map((r, i) => {
        const m = byCode[r.code];
        const ev = r.value !== '' ? evaluate(r.value, r.low, r.high) : null;
        return (
          <div key={i} className="card mt16" data-testid="result-row">
            <div className="row between">
              <label className="lbl" style={{ marginTop: 0 }}>{t('check.marker')}</label>
              {rows.length > 1 && <button className="icon-btn" onClick={() => setRows(rows.filter((_, j) => j !== i))} aria-label={t('common.remove')}><Icon name="trash" size={16} /></button>}
            </div>
            <div className="row">
              <select className="field grow" value={r.code} onChange={(e) => chooseMarker(i, e.target.value)} aria-label={t('check.marker')}>
                <option value="">{t('check.pickMarker')}</option>
                {MARKERS.map((mk) => <option key={mk.code} value={mk.code}>{markerName(mk.code, lang)}</option>)}
              </select>
              {ev && <StatusBadge status={ev.status} />}
            </div>
            <div className="grid2">
              <div><label className="lbl">{t('check.value')}</label><input className="field" inputMode="decimal" value={r.value} onChange={(e) => setRow(i, { value: e.target.value.replace(',', '.') })} aria-label={t('check.value')} /></div>
              <div><label className="lbl">{t('check.unit')}</label>
                <select className="field" value={r.unit} onChange={(e) => chooseUnit(i, e.target.value)} disabled={!m} aria-label={t('check.unit')}>
                  {m ? Object.keys(m.units).map((u) => <option key={u} value={u}>{u}</option>) : <option value="">—</option>}
                </select></div>
              <div><label className="lbl">{t('check.low')}</label><input className="field" inputMode="decimal" value={r.low} onChange={(e) => setRow(i, { low: e.target.value.replace(',', '.') })} aria-label={t('check.low')} /></div>
              <div><label className="lbl">{t('check.high')}</label><input className="field" inputMode="decimal" value={r.high} onChange={(e) => setRow(i, { high: e.target.value.replace(',', '.') })} aria-label={t('check.high')} /></div>
            </div>
            {ev?.status === 'unknown' && <p className="tiny muted mt8">{t('check.noRange')}</p>}
          </div>
        );
      })}
      <button className="btn btn-link mt8" onClick={() => setRows([...rows, emptyRow()])}>+ {t('check.another')}</button>
      {err && <div className="error">{err}</div>}
      <button className="btn btn-primary mt16" disabled={!valid || busy} onClick={save}>{t('check.save')}</button>
      <button className="btn btn-ghost mt8" onClick={() => nav(-1)}>{t('common.cancel')}</button>
    </Phone>
  );
}
