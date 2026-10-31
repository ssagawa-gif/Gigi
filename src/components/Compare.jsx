import { useState, useMemo } from 'react';
import { useI18n } from '../i18n/index.jsx';
import { StatusBadge } from './ui.jsx';
import { byMarker, testDates } from '../lib/results.js';
import { markerName, round } from '../lib/markers.js';

/** Side-by-side comparison of two test dates. Values are converted to one unit per
 *  marker, so a São Paulo report in nmol/L compares with a Barcelona one in ng/mL. */
export default function Compare({ results }) {
  const { t, lang, fmtDate, fmtNum } = useI18n();
  const dates = testDates(results);
  const [a, setA] = useState(dates[1] || dates[0]);
  const [b, setB] = useState(dates[0]);
  const [printed, setPrinted] = useState(false);
  const meta = useMemo(() => {
    const m = {};
    for (const r of results) { const k = r.test_date; m[k] ||= new Set(); if (r.country || r.lab_name) m[k].add([r.lab_name, r.country].filter(Boolean).join(', ')); }
    return m;
  }, [results]);

  if (dates.length < 2) return <div className="card small muted mt16">{t('compare.needTwo')}</div>;
  const groups = byMarker(results);
  const pick = (list, d) => list.find((r) => r.test_date === d);
  const rows = Object.entries(groups).map(([code, list]) => ({ code, A: pick(list, a), B: pick(list, b) })).filter((r) => r.A || r.B);
  const label = (d) => `${fmtDate(d)}${meta[d]?.size ? ' · ' + [...meta[d]].join(' / ') : ''}`;
  const show = (r) => (r ? (printed ? `${fmtNum(r.value)} ${r.unit}` : `${fmtNum(r.value_canonical)} ${r.canonical_unit}`) : '—');

  return (
    <div className="mt16">
      <div className="grid2">
        <div><label className="lbl" style={{ marginTop: 0 }}>{t('compare.from')}</label>
          <select className="field" value={a} onChange={(e) => setA(e.target.value)}>{dates.map((d) => <option key={d} value={d}>{label(d)}</option>)}</select></div>
        <div><label className="lbl" style={{ marginTop: 0 }}>{t('compare.to')}</label>
          <select className="field" value={b} onChange={(e) => setB(e.target.value)}>{dates.map((d) => <option key={d} value={d}>{label(d)}</option>)}</select></div>
      </div>
      <div className="chips mt16">
        <button className={'chip' + (!printed ? ' on' : '')} onClick={() => setPrinted(false)}>{t('compare.standard')}</button>
        <button className={'chip' + (printed ? ' on' : '')} onClick={() => setPrinted(true)}>{t('compare.printed')}</button>
      </div>
      <div className="card mt16" style={{ padding: 8 }}>
        <table className="cmp">
          <thead><tr><th>{t('compare.marker')}</th><th>{fmtDate(a, { day: 'numeric', month: 'short', year: '2-digit' })}</th><th>{fmtDate(b, { day: 'numeric', month: 'short', year: '2-digit' })}</th><th>{t('compare.change')}</th></tr></thead>
          <tbody>
            {rows.map(({ code, A, B }) => {
              const d = A && B ? round(B.value_canonical - A.value_canonical) : null;
              const pct = A && B && A.value_canonical ? Math.round((d / A.value_canonical) * 100) : null;
              return (
                <tr key={code}>
                  <td><div style={{ fontWeight: 500 }}>{markerName(code, lang)}</div>{B && <StatusBadge status={B.status} ctx={B.context} />}</td>
                  <td>{show(A)}</td>
                  <td>{show(B)}</td>
                  <td className={d > 0 ? 'up' : d < 0 ? 'down' : ''}>{d == null ? '—' : `${d > 0 ? '▲' : d < 0 ? '▼' : '='} ${pct != null ? Math.abs(pct) + '%' : ''}`}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="tiny muted mt8">{t('compare.note')}</p>
    </div>
  );
}
