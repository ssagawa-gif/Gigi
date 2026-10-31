import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Phone, TopBar, StatusBadge, Loading, Initials } from '../../components/ui.jsx';
import Icon from '../../components/Icon.jsx';
import TrendChart from '../../components/TrendChart.jsx';
import { useI18n } from '../../i18n/index.jsx';
import { api } from '../../lib/api.js';
import { useSession, useData } from '../../lib/session.jsx';
import { byCode, markerName } from '../../lib/markers.js';

/** Download a calendar reminder (.ics) — works on iPhone, Android, Google and Outlook, free. */
function downloadReminder(title, months = 3) {
  const d = new Date(); d.setMonth(d.getMonth() + months);
  const day = d.toISOString().slice(0, 10).replace(/-/g, '');
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//GiGi//EN', 'BEGIN:VEVENT',
    `UID:${Date.now()}@gigi`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`,
    `DTSTART;VALUE=DATE:${day}`, `SUMMARY:${title}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
  a.download = 'gigi-recheck.ics'; a.click();
}

export function ReviewCard({ review, onRate }) {
  const { t, fmtDate } = useI18n();
  const [rating, setRating] = useState(review.trust_rating || 0);
  if (review.status === 'open') {
    return (
      <div className="card row mt16" style={{ alignItems: 'flex-start' }}>
        <Icon name="clock" size={18} style={{ color: 'var(--cherry)' }} />
        <div><div style={{ fontWeight: 600, fontSize: 14 }}>{t('marker.waiting', { doctor: review.doctor?.full_name })}</div><div className="tiny muted">{t('marker.sent', { date: fmtDate(review.created_at) })}</div></div>
      </div>
    );
  }
  return (
    <div className="card mt16" style={{ borderColor: 'var(--cherry-soft)' }}>
      <div className="row small" style={{ fontWeight: 600, gap: 6 }}><Icon name="checkCircle" size={16} />{t('marker.reviewedBy', { doctor: review.doctor?.full_name, date: fmtDate(review.answered_at) })}</div>
      <p style={{ margin: '10px 0' }}>{review.response}</p>
      {review.recommendation && <span className="badge cherry">{t('rec.' + review.recommendation)}</span>}
      {onRate && (
        <div className="mt16">
          <div className="tiny muted">{t('marker.trustQ')}</div>
          <div className="row mt8" style={{ gap: 6 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} className={'chip' + (rating >= n ? ' on' : '')} onClick={() => { setRating(n); onRate(n); }} aria-label={`${n}/5`}>{n}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Marker() {
  const { code } = useParams();
  const { t, lang, fmtDate, fmtNum } = useI18n();
  const nav = useNavigate();
  const { showToast } = useSession();
  const [showAll, setShowAll] = useState(false);
  const { data, loading } = useData(async () => {
    const [results, reviews, shares] = await Promise.all([api.listResults(), api.listMyReviews(), api.listShares()]);
    return { results: results.filter((r) => r.marker_code === code), reviews: reviews.filter((r) => r.marker_code === code), shares };
  }, [code]);
  const m = byCode[code];
  if (loading) return <Phone><TopBar /><Loading /></Phone>;
  const list = data.results;
  const last = list[list.length - 1];
  if (!last) return <Phone><TopBar /><p className="muted">{t('marker.none')}</p></Phone>;

  const review = [...data.reviews].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  const reviewCoversLatest = review && review.created_at >= last.created_at;
  const needsDoctor = last.needs_review && !reviewCoversLatest;
  const band = last.ref_low_canonical != null || last.ref_high_canonical != null ? [last.ref_low_canonical, last.ref_high_canonical] : null;
  const points = list.map((r) => ({ date: r.test_date, value: r.value_canonical, status: r.status, country: r.country, lab: r.lab_name }));
  const myDoctor = review?.doctor || data.shares.find((s) => !s.revoked_at)?.doctor;
  const about = t('about.' + code) !== 'about.' + code ? t('about.' + code) : t('about.generic');
  const mixedUnits = new Set(list.map((r) => r.unit)).size > 1 || new Set(list.map((r) => r.country)).size > 1;

  return (
    <Phone>
      <TopBar />
      <h1 className="center">{markerName(code, lang)}</h1>
      <div className="row mt8" style={{ justifyContent: 'center' }}>
        <span className="serif" style={{ fontSize: 26 }}>{fmtNum(last.value)} {last.unit}</span><StatusBadge status={last.status} />
      </div>
      <div className="tiny muted center">{[fmtDate(last.test_date), last.lab_name, last.country].filter(Boolean).join(' · ')}</div>
      {m?.loinc && <div className="tiny muted center" style={{ opacity: .7 }}>LOINC {m.loinc}</div>}
      {last.context?.phase && <div className="tiny muted center">{t('marker.phaseInfo', { phase: t('phase.' + last.context.phase) })}</div>}
      {last.context?.range_source && <div className="tiny muted center">{t('range.' + last.context.range_source)}</div>}

      <div className="card mt16">
        <div className="row between small"><b>{t('marker.trend', { n: list.length })}</b>{band && <span className="tiny muted">{t('marker.ref')}: {fmtNum(band[0])}–{fmtNum(band[1])} {last.canonical_unit}</span>}</div>
        <div className="mt8"><TrendChart points={points} band={band} unit={last.canonical_unit} /></div>
        {mixedUnits && <p className="tiny muted" style={{ margin: '6px 0 0' }}>{t('marker.converted', { unit: last.canonical_unit })}</p>}
        <button className="btn btn-link small" onClick={() => setShowAll(!showAll)}>{showAll ? t('marker.hide') : t('marker.all')}</button>
        {showAll && (
          <table className="cmp">
            <thead><tr><th>{t('check.date')}</th><th>{t('marker.printed')}</th><th>{last.canonical_unit}</th><th /></tr></thead>
            <tbody>{[...list].reverse().map((r) => (
              <tr key={r.id}><td>{fmtDate(r.test_date)}<div className="tiny muted">{[r.lab_name, r.country].filter(Boolean).join(' · ')}</div></td>
                <td>{fmtNum(r.value)} {r.unit}</td><td>{fmtNum(r.value_canonical)}</td><td><StatusBadge status={r.status} /></td></tr>
            ))}</tbody>
          </table>
        )}
      </div>

      <h2 className="mt24">{t('marker.whatMeans')}</h2>
      {last.status === 'normal'
        ? <p className="small">{t('marker.inRange')}</p>
        : last.status === 'unknown' ? <p className="small">{t('marker.noRange')}</p>
          : <p className="small">{t('marker.outRange.' + last.status)}</p>}
      <p className="small muted">{about}</p>
      <p className="tiny muted">{t('marker.sample')}</p>

      {review && reviewCoversLatest && <ReviewCard review={review} onRate={review.status === 'answered' ? (n) => { api.rateReview(review.id, n); showToast(t('marker.thanks')); } : null} />}
      {review && !reviewCoversLatest && review.status === 'answered' && (
        <div className="mt8"><div className="tiny muted">{t('marker.previousReview')}</div><ReviewCard review={review} /></div>
      )}

      {needsDoctor && (
        <div className="card-tan row mt16" style={{ alignItems: 'flex-start' }}>
          <Icon name="steth" size={18} style={{ color: 'var(--cherry)' }} />
          <div className="small"><b>{t('marker.flagTitle')}</b><div className="muted">{t('marker.flagSub')}</div></div>
        </div>
      )}

      <h2 className="mt24">{t('marker.pick')}</h2>
      <div className="stack mt8">
        {needsDoctor && <button className="btn btn-primary" onClick={() => nav(`/review/${code}`)}>{t('next.review')}</button>}
        <button className={'btn ' + (needsDoctor ? 'btn-ghost' : 'btn-primary')} onClick={() => nav(myDoctor ? `/doctors/${myDoctor.id}` : '/doctors')}>
          {myDoctor ? t('next.bookWith', { doctor: myDoctor.full_name }) : t('next.book')}
        </button>
        <button className="btn btn-ghost" onClick={() => { downloadReminder(t('next.reminderTitle', { marker: markerName(code, lang) })); showToast(t('next.reminderDone')); }}>{t('next.remind')}</button>
        <button className="btn btn-ghost" onClick={() => nav('/sharing')}>{t('next.share')}</button>
      </div>
    </Phone>
  );
}

export function RequestReview() {
  const { code } = useParams();
  const { t, lang, fmtNum, fmtMoney } = useI18n();
  const nav = useNavigate();
  const { showToast } = useSession();
  const { data, loading } = useData(async () => ({ doctors: await api.listDoctors(), results: await api.listResults() }), []);
  const [doctor, setDoctor] = useState(null);
  const [note, setNote] = useState('');
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  if (loading) return <Phone><TopBar /><Loading /></Phone>;
  const list = data.results.filter((r) => r.marker_code === code);
  const last = list[list.length - 1];

  async function send() {
    setBusy(true);
    await api.requestReview({ doctor_id: doctor, marker_code: code, result_ids: list.map((r) => r.id), note });
    showToast(t('review.sent'));
    nav(`/marker/${code}`, { replace: true });
  }
  const chosen = data.doctors.find((d) => d.id === doctor);
  return (
    <Phone>
      <TopBar title={t('review.title')} />
      <div className="card row between">
        <div><div className="serif" style={{ fontSize: 19 }}>{markerName(code, lang)}</div><div className="tiny muted">{t('review.history', { n: list.length })}</div></div>
        {last && <div><b>{fmtNum(last.value)}</b> <span className="tiny muted">{last.unit}</span> <StatusBadge status={last.status} /></div>}
      </div>
      <label className="lbl">{t('review.choose')}</label>
      <div className="stack">
        {data.doctors.map((d) => (
          <button key={d.id} className={'option' + (doctor === d.id ? ' on' : '')} onClick={() => setDoctor(d.id)}>
            <div className="row"><Initials name={d.full_name} /><div><div className="serif" style={{ fontSize: 17 }}>{d.full_name}</div><div className="tiny muted">{t('spec.' + d.specialty)} · {d.languages?.join(', ')}</div>{d.results_visit_fee != null && <div className="tiny muted">{t('doctor.resultsVisit')}: {fmtMoney(d.results_visit_fee)}</div>}</div></div>
            <span className="radio" />
          </button>
        ))}
      </div>
      <label className="lbl">{t('review.note')}</label>
      <textarea className="field" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('review.notePh')} />
      <label className="row mt16 small" style={{ alignItems: 'flex-start', cursor: 'pointer' }}>
        <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} style={{ marginTop: 3 }} />
        <span>{t('review.consent', { doctor: chosen?.full_name || t('review.theDoctor') })}</span>
      </label>
      <div className="spacer" />
      <button className="btn btn-primary mt24" disabled={!doctor || !agree || busy} onClick={send}>{t('review.send')}</button>
    </Phone>
  );
}
