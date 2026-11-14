import { useState } from 'react';
import Icon from './Icon.jsx';
import { useI18n } from '../i18n/index.jsx';
import { useSession } from '../lib/session.jsx';
import { api } from '../lib/api.js';
import { cyclePlan, addStart, isoOf } from '../lib/cycle.js';

/** "Your cycle": log when your period started; GiGi suggests the best days for hormone tests. */
export default function CycleCard() {
  const { t, locale } = useI18n();
  const { session, refresh, showToast } = useSession();
  const p = session?.profile || {};
  const hist = p.medical_history || {};
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(isoOf(new Date()));
  if (hist.cycle === 'menopause') return null;
  const starts = p.period_starts || [];
  const plan = cyclePlan(starts, hist.cycle_length || 28);
  const wd = (iso) => new Date(iso + 'T12:00:00').toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' });

  async function save() {
    await api.updateProfile({ period_starts: addStart(starts, date) });
    await refresh(); setOpen(false); showToast(t('cyc.saved'));
  }

  return (
    <div className="card mt16" data-testid="cycle-card">
      <div className="row between">
        <div className="row" style={{ gap: 8 }}><Icon name="calendar" size={16} /><b>{t('cyc.title')}</b></div>
        <button className="btn btn-ghost btn-small" onClick={() => setOpen(!open)} data-testid="log-period">{t('cyc.log')}</button>
      </div>
      {open && (
        <div className="row mt8" style={{ gap: 8 }}>
          <input className="field" style={{ margin: 0 }} type="date" value={date} max={isoOf(new Date())} onChange={(e) => setDate(e.target.value)} aria-label={t('cyc.started')} />
          <button className="btn btn-primary btn-small" onClick={save} disabled={!date}>{t('common.save')}</button>
        </div>
      )}
      {!plan && <p className="small muted" style={{ margin: '8px 0 0' }}>{t('cyc.empty')}</p>}
      {plan?.stale && <p className="small muted" style={{ margin: '8px 0 0' }}>{t('cyc.stale')}</p>}
      {plan && !plan.stale && (
        <>
          <p className="small" style={{ margin: '8px 0 0' }}>
            {t('cyc.today', { day: plan.day })} · {plan.late ? t('cyc.late') : t('cyc.next', { date: wd(plan.next) })}
          </p>
          <div className="card-tan mt8 small" data-testid="best-days">
            <div><b>{t('cyc.baseline')}</b> {wd(plan.baseline[0])}{plan.baseline[1] !== plan.baseline[0] ? ' – ' + wd(plan.baseline[1]) : ''}</div>
            <div className="tiny muted">{t('cyc.baselineSub')}</div>
            <div className="mt8"><b>{t('cyc.prog')}</b> {wd(plan.progesterone)}</div>
            <div className="tiny muted">{t('cyc.progSub')}</div>
          </div>
          <p className="tiny muted" style={{ margin: '6px 0 0' }}>{t('cyc.based', { n: plan.length })}</p>
        </>
      )}
    </div>
  );
}
