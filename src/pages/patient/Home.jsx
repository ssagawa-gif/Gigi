import { useNavigate } from 'react-router-dom';
import { Phone, MeAvatar, Bell, Initials, Loading } from '../../components/ui.jsx';
import Icon from '../../components/Icon.jsx';
import { useI18n } from '../../i18n/index.jsx';
import { api } from '../../lib/api.js';
import { useSession, useData } from '../../lib/session.jsx';
import { latestPerMarker } from '../../lib/results.js';
import { markerName } from '../../lib/markers.js';

export default function Home() {
  const { t, lang, fmtDate, fmtSlot } = useI18n();
  const nav = useNavigate();
  const { session } = useSession();
  const { data, loading } = useData(async () => {
    const [results, reviews, appts, shares] = await Promise.all([
      api.listResults(), api.listMyReviews(), api.listAppointments(), api.listShares(),
    ]);
    return { results, reviews, appts, shares };
  }, []);
  const p = session?.profile;

  let next = null;
  if (data) {
    const latest = latestPerMarker(data.results);
    const answered = data.reviews.filter((r) => r.status === 'answered' && !r.trust_rating)
      .sort((a, b) => (b.answered_at || '').localeCompare(a.answered_at || ''))[0];
    const flagged = latest.find((r) => r.needs_review && !data.reviews.some((v) => v.marker_code === r.marker_code && v.created_at > r.created_at));
    if (flagged) next = { text: t('home.flagged.' + flagged.status, { marker: markerName(flagged.marker_code, lang) }), cta: t('home.seeMeaning'), to: `/marker/${flagged.marker_code}` };
    else if (answered) next = { text: t('home.answered', { doctor: answered.doctor?.full_name, marker: markerName(answered.marker_code, lang) }), cta: t('home.read'), to: `/marker/${answered.marker_code}` };
    else if (!data.results.length) next = { text: t('home.empty'), cta: t('home.addFirst'), to: '/add' };
    else next = { text: t('home.allGood'), cta: t('home.addNew'), to: '/add' };
  }

  const myDoctor = data && (data.appts[0]?.doctor || data.reviews[0]?.doctor || data.shares.find((s) => !s.revoked_at)?.doctor);
  const openReviews = data?.reviews.filter((r) => r.status === 'open') || [];

  return (
    <Phone nav wide>
      <div className="row between">
        <div>
          <h1>{t('home.hello', { name: p?.full_name || '' })}</h1>
          {p?.city && <div className="tiny muted">{p.city}</div>}
        </div>
        <div className="row" style={{ gap: 4 }}><Bell to="/notifications" /><MeAvatar name={p?.full_name} /></div>
      </div>

      {loading ? <Loading /> : (
        <>
          <h3 className="italic muted mt24" style={{ fontSize: 18 }}>{t('home.nextStep')}</h3>
          <div className="card-cherry mt8">
            <div className="row small" style={{ fontWeight: 600, gap: 6 }}><Icon name="alert" size={16} />{t('home.action')}</div>
            <p style={{ margin: '10px 0 14px', fontWeight: 500 }}>{next?.text}</p>
            <button className="btn btn-light btn-small" onClick={() => nav(next.to)}>{next?.cta}</button>
          </div>

          <div className="dgrid mt8">
          <div>
          <div className="row between mt24"><h2>{t('home.comingUp')}</h2></div>
          <div className="stack mt8">
            {data.appts.map((a) => (
              <div key={a.id} className="card list-item tap" onClick={() => nav(`/booked/${a.id}`)}>
                <Icon name="calendar" size={18} />
                <div className="grow"><div style={{ fontWeight: 500 }}>{t('home.visitWith', { doctor: a.doctor?.full_name })}</div><div className="tiny muted">{fmtSlot(a.starts_at)}</div></div>
                <Icon name="chevron" size={16} />
              </div>
            ))}
            {openReviews.map((r) => (
              <div key={r.id} className="card list-item tap" onClick={() => nav(`/marker/${r.marker_code}`)}>
                <Icon name="clock" size={18} />
                <div className="grow"><div style={{ fontWeight: 500 }}>{t('home.reviewPending', { marker: markerName(r.marker_code, lang) })}</div><div className="tiny muted">{r.doctor?.full_name} · {fmtDate(r.created_at)}</div></div>
                <Icon name="chevron" size={16} />
              </div>
            ))}
            {!data.appts.length && !openReviews.length && <div className="card small muted">{t('home.nothingComing')}</div>}
          </div>
          </div>
          <div>

          {myDoctor?.full_name && (
            <>
              <h2 className="mt24">{t('home.yourDoctor')}</h2>
              <div className="card list-item mt8 tap" onClick={() => nav(`/doctors/${myDoctor.id}`)}>
                <Initials name={myDoctor.full_name} />
                <div className="grow"><div className="serif" style={{ fontSize: 18 }}>{myDoctor.full_name}</div><div className="tiny muted">{t('spec.' + myDoctor.specialty)}{myDoctor.area ? ' · ' + myDoctor.area : ''}</div></div>
                <Icon name="chevron" size={16} />
              </div>
            </>
          )}

          <div className="card-tan list-item mt24 tap" onClick={() => nav('/plans')} style={{ cursor: 'pointer' }}>
            <Icon name="sparkle" size={18} />
            <div className="grow"><div style={{ fontWeight: 600, fontSize: 14 }}>{t('home.promo')}</div><div className="tiny muted">{t('home.seePlans')}</div></div>
            <Icon name="chevron" size={16} />
          </div>
          </div>
          </div>
        </>
      )}
    </Phone>
  );
}
