import { useState } from 'react';
import { useI18n } from '../i18n/index.jsx';

/**
 * Line chart of one marker over time, always in the canonical unit so results
 * from different countries and labs sit on the same scale.
 * Green band = lab reference range; latest point in Persimmon.
 */
export default function TrendChart({ points, band, unit, height = 170 }) {
  const { t, fmtMonth, fmtDate, fmtNum } = useI18n();
  const [hover, setHover] = useState(null);
  if (!points?.length) return null;

  const W = 340, H = height, L = 30, R = 10, T = 10, B = 26;
  const xs = points.map((p) => new Date(p.date).getTime());
  const vals = points.map((p) => p.value);
  const [lo, hi] = band || [null, null];
  // Scale to the patient's values; the range band is clipped if it is much wider.
  const vmin = Math.min(...vals), vmax = Math.max(...vals);
  let min = Math.min(vmin, lo ?? vmin), max = Math.max(vmax, hi != null && hi <= vmax * 2 ? hi : vmax);
  if (min === max) { min -= 1; max += 1; }
  const pad = (max - min) * 0.15; min = Math.max(0, min - pad); max += pad;
  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  const X = (x) => (x1 === x0 ? (L + W - R) / 2 : L + ((x - x0) / (x1 - x0)) * (W - L - R));
  const Y = (v) => T + (1 - (v - min) / (max - min)) * (H - T - B);
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${X(xs[i]).toFixed(1)},${Y(p.value).toFixed(1)}`).join(' ');
  const ticks = [min, (min + max) / 2, max];
  // x labels: always the last one, then earlier ones only if they don't collide
  const labelIdx = [];
  for (let i = points.length - 1; i >= 0; i--) {
    if (!labelIdx.length || X(xs[labelIdx[labelIdx.length - 1]]) - X(xs[i]) > 44) labelIdx.push(i);
  }

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={t('chart.aria')}>
        {(lo != null || hi != null) && (() => {
          const top = Y(Math.min(hi ?? max, max)), bottom = Y(Math.max(lo ?? min, min));
          return bottom > top ? <rect x={L} y={top} width={W - L - R} height={bottom - top} fill="var(--band)" rx="4" /> : null;
        })()}
        {ticks.map((v, i) => (
          <text key={i} x={L - 6} y={Y(v) + 3} fontSize="9" textAnchor="end" fill="var(--muted)">{fmtNum(Math.round(v))}</text>
        ))}
        <path d={path} fill="none" stroke="var(--cherry)" strokeWidth="2" />
        {points.map((p, i) => {
          const last = i === points.length - 1;
          return (
            <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onClick={() => setHover(i)} style={{ cursor: 'pointer' }}>
              <circle cx={X(xs[i])} cy={Y(p.value)} r="10" fill="transparent" />
              <circle cx={X(xs[i])} cy={Y(p.value)} r={last ? 5.5 : 4} fill={last ? 'var(--persimmon)' : 'var(--cherry)'} stroke="#fff" strokeWidth="1.5" />
            </g>
          );
        })}
        {labelIdx.map((i) => (
          <text key={'x' + i} x={X(xs[i])} y={H - 8} fontSize="9" textAnchor={i === points.length - 1 && points.length > 1 ? 'end' : i === 0 ? 'start' : 'middle'} fill="var(--muted)">{fmtMonth(points[i].date)}</text>
        ))}
      </svg>
      <div className="row small muted" style={{ gap: 14, minHeight: 20 }}>
        {hover != null ? (
          <span><b style={{ color: 'var(--ink)' }}>{fmtNum(points[hover].value)} {unit}</b> · {fmtDate(points[hover].date)}
            {points[hover].country ? ` · ${points[hover].country}` : ''}{points[hover].lab ? ` · ${points[hover].lab}` : ''}</span>
        ) : (
          <>
            <span className="row" style={{ gap: 5 }}><i style={{ width: 8, height: 8, borderRadius: 4, background: 'var(--cherry)' }} />{t('chart.yours')}</span>
            {band && <span className="row" style={{ gap: 5 }}><i style={{ width: 10, height: 8, borderRadius: 2, background: 'var(--band)' }} />{t('chart.range')}</span>}
          </>
        )}
      </div>
    </div>
  );
}
