import Icon from './Icon.jsx';
import { useI18n } from '../i18n/index.jsx';
import { markerName, isPhaseMarker } from '../lib/markers.js';
import { latestPerMarker, actionLevel, overallAction, actionRank, rangeText, cycleText } from '../lib/results.js';

const STYLE = {
  fine: { background: 'var(--ok-bg)', color: 'var(--ok-ink)' },
  doctor: { background: 'var(--tan)', color: 'var(--cherry)' },
  days: { background: '#C62828', color: '#fff' },
  today: { background: '#C62828', color: '#fff' },
};

/** All fine / See your doctor / See a doctor in the next few days / Go today. */
export function ActionChip({ level, small, forDoctor }) {
  const { t } = useI18n();
  return (
    <span className="badge" data-testid="action" data-level={level}
      style={{ ...STYLE[level], fontWeight: 600, whiteSpace: 'nowrap', ...(small ? { fontSize: 11 } : {}) }}>
      {t((forDoctor ? 'action.doc.' : 'action.') + level)}
    </span>
  );
}

/** "Normal: 2.4–12.6 IU/L" and, for cycle hormones, "Cycle day 3 of 27 · Early follicular". */
export function NormalRange({ r, showCycle = true }) {
  const { t, fmtNum } = useI18n();
  const rg = rangeText(r.ref_low, r.ref_high, t, fmtNum);
  const cyc = showCycle && isPhaseMarker(r.marker_code) ? cycleText(r.context, t) : '';
  return (
    <>
      <div className="tiny muted" data-testid="normal-range">{rg ? `${t('range.normal')}: ${rg} ${r.unit}` : t('range.none')}</div>
      {cyc && <div className="tiny muted" data-testid="cycle-info">{cyc}</div>}
    </>
  );
}

/** One plain sentence for a result: "Your LH is high." */
export function plainOutcome(r, t, lang) {
  const name = markerName(r.marker_code, lang);
  if (r.context?.expected && (r.status === 'low' || r.status === 'high')) return t('plain.expected', { marker: name });
  return t('plain.' + (r.status || 'unknown'), { marker: name });
}

/** "Your results at a glance": the overall verdict, counts and each flagged result in plain words. */
export function ResultsSummary({ results, onOpen, title }) {
  const { t, lang, fmtDate } = useI18n();
  const latest = latestPerMarker(results);
  if (!latest.length) return null;
  const level = overallAction(results);
  const count = (s) => latest.filter((r) => r.status === s && !(r.context?.expected)).length;
  const flagged = latest.filter((r) => actionLevel(r) !== 'fine').sort((a, b) => actionRank(actionLevel(b)) - actionRank(actionLevel(a)));
  const newest = latest.reduce((a, r) => (r.test_date > a ? r.test_date : a), '');
  return (
    <div className="card mt16" data-testid="glance" style={level === 'today' || level === 'days' ? { borderColor: '#C62828' } : undefined}>
      <div className="row between" style={{ alignItems: 'flex-start' }}>
        <div>
          <div className="eyebrow" style={{ margin: 0 }}>{title || t('glance.title')}</div>
          <div className="serif" style={{ fontSize: 24, marginTop: 4 }}>{t('glance.verdict.' + level)}</div>
        </div>
        <ActionChip level={level} />
      </div>
      <p className="small" style={{ margin: '8px 0 0' }}>{t('glance.sub.' + level)}</p>
      <div className="tiny muted mt8">
        {t('glance.counts', { normal: count('normal'), high: count('high'), low: count('low') })}
        {newest ? ' · ' + t('glance.latest', { date: fmtDate(newest) }) : ''}
      </div>
      {flagged.length > 0 && (
        <div className="stack mt16" style={{ gap: 8 }}>
          {flagged.map((r) => (
            <button key={r.id} className="option" style={{ padding: '10px 12px' }} onClick={() => onOpen?.(r.marker_code)}>
              <div style={{ textAlign: 'left' }}>
                <div className="small" style={{ fontWeight: 600 }}>{plainOutcome(r, t, lang)}</div>
                <NormalRange r={r} />
              </div>
              <div className="row" style={{ gap: 6 }}><ActionChip level={actionLevel(r)} small /><Icon name="chevron" size={14} /></div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
