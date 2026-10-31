import Icon from './Icon.jsx';
import { useI18n } from '../i18n/index.jsx';
import { markerName } from '../lib/markers.js';
import { latestPerMarker } from '../lib/results.js';

/**
 * Summary card for doctors, built only from what the patient told GiGi (no AI, nothing invented):
 * goal, insurance, last / next visit with the complaint, out-of-range results, open review requests.
 */
export default function PatientSummary({ patient = {}, results = [], appts = [], reviews = [] }) {
  const { t, lang, fmtSlot, fmtNum, fmtDate } = useI18n();
  const now = Date.now();
  const mine = [...appts].sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const past = mine.filter((a) => new Date(a.starts_at).getTime() <= now);
  const last = past[past.length - 1];
  const next = mine.find((a) => new Date(a.starts_at).getTime() > now);
  const complaint = (next?.note || last?.note || [...reviews].reverse().find((r) => r.note)?.note || '').trim();
  const flagged = latestPerMarker(results).filter((r) => (r.status === 'low' || r.status === 'high') && !r.context?.expected);
  const open = reviews.filter((r) => r.status === 'open');

  const Row = ({ icon, label, children }) => (
    <div className="row" style={{ alignItems: 'flex-start', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
      <Icon name={icon} size={16} style={{ color: 'var(--cherry)', marginTop: 2, flexShrink: 0 }} />
      <div style={{ width: 170, flexShrink: 0 }} className="tiny muted">{label}</div>
      <div className="small grow">{children}</div>
    </div>
  );
  const none = <span className="muted">{t('sum.none')}</span>;

  return (
    <div className="card" data-testid="patient-summary">
      <h3 style={{ marginBottom: 6 }}>{t('sum.title')}</h3>
      <Row icon="sparkle" label={t('sum.goal')}>
        {patient.reasons?.length ? patient.reasons.map((r) => t(`about.${r}.t`)).join(' · ') : none}
      </Row>
      <Row icon="shield" label={t('sum.insurer')}>{patient.insurer || none}</Row>
      <Row icon="calendar" label={next ? t('sum.nextVisit') : t('sum.lastVisit')}>
        {next || last ? `${fmtSlot((next || last).starts_at)} · ${t('visit.' + (next || last).type)}` : t('sum.noVisits')}
      </Row>
      <Row icon="pencil" label={t('sum.complaint')}>{complaint ? `“${complaint}”` : none}</Row>
      <Row icon="alert" label={t('sum.alerts')}>
        {flagged.length
          ? flagged.map((r) => `${markerName(r.marker_code, lang)} ${fmtNum(r.value)} ${r.unit} (${fmtDate(r.test_date)})`).join(' · ')
          : <span className="muted">{results.length ? t('sum.allNormal') : t('sum.noResults')}</span>}
      </Row>
      <Row icon="clock" label={t('sum.openReviews')}>
        {open.length ? open.map((r) => markerName(r.marker_code, lang)).join(' · ') : <span className="muted">0</span>}
      </Row>
      {patient.history_note && <Row icon="history" label={t('record.personal')}>{patient.history_note}</Row>}
      <p className="tiny muted" style={{ margin: '8px 0 0' }}>{t('sum.source')}</p>
    </div>
  );
}
