import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, MeAvatar, StatusBadge, Loading, Empty } from '../../components/ui.jsx';
import Icon from '../../components/Icon.jsx';
import Compare from '../../components/Compare.jsx';
import { useI18n } from '../../i18n/index.jsx';
import { api } from '../../lib/api.js';
import { useSession, useData } from '../../lib/session.jsx';
import { latestPerMarker } from '../../lib/results.js';
import { markerName, derivedResults } from '../../lib/markers.js';

export function MarkerList({ results, onOpen, grid = true }) {
  const { t, lang, fmtDate, fmtNum } = useI18n();
  const seen = new Set();
  const calc = derivedResults(results).filter((d) => !seen.has(d.code) && seen.add(d.code));
  return (
    <>
    <div className={'stack' + (grid ? ' dgrid' : '')}>
      {latestPerMarker(results).map((r) => (
        <div key={r.id} className="card row between tap" onClick={() => onOpen(r.marker_code)}>
          <div><div className="serif" style={{ fontSize: 19 }}>{markerName(r.marker_code, lang)}</div><div className="tiny muted">{fmtDate(r.test_date)}{r.country ? ' · ' + r.country : ''}</div></div>
          <div style={{ textAlign: 'right' }}>
            <div><b style={{ fontSize: 18 }}>{fmtNum(r.value)}</b> <span className="tiny muted">{r.unit}</span></div>
            <div className="mt8"><StatusBadge status={r.status} ctx={r.context} /></div>
          </div>
        </div>
      ))}
    </div>
    {calc.length > 0 && (
      <>
        <h3 className="mt24" style={{ marginBottom: 4 }}>{t('record.calculated')}</h3>
        <p className="tiny muted" style={{ marginTop: 0 }}>{t('record.calcNote')}</p>
        <div className={'stack' + (grid ? ' dgrid' : '')}>
          {calc.map((d) => (
            <div key={d.code} className="card row between" data-testid="calc">
              <div><div className="serif" style={{ fontSize: 19 }}>{markerName(d.code, lang)}</div><div className="tiny muted">{d.formula} · {fmtDate(d.test_date)}</div></div>
              <div style={{ textAlign: 'right' }}><b style={{ fontSize: 18 }}>{fmtNum(d.value)}</b><div className="tiny muted">&lt; {fmtNum(d.high)}</div><div className="mt8"><StatusBadge status={d.status} ctx={d.context} /></div></div>
            </div>
          ))}
        </div>
      </>
    )}
    </>
  );
}

export default function Record() {
  const { t, fmtDate } = useI18n();
  const nav = useNavigate();
  const { session } = useSession();
  const [tab, setTab] = useState('bloodwork');
  const { data, loading } = useData(async () => ({ results: await api.listResults(), reports: await api.listReports() }), []);
  const p = session?.profile;

  async function openFile(id) {
    const url = await api.reportFileUrl(id);
    if (!url) return;
    if (url.startsWith('data:')) { const w = window.open(); if (w) w.document.write(`<iframe src="${url}" style="border:0;width:100%;height:100%"></iframe>`); }
    else window.open(url, '_blank', 'noopener');
  }

  return (
    <Phone nav wide>
      <div className="row between"><h1>{t('record.title')}</h1><MeAvatar name={p?.full_name} /></div>
      <div className="chips mt16">
        {['bloodwork', 'compare', 'reports'].map((k) => (
          <button key={k} className={'chip' + (tab === k ? ' on' : '')} onClick={() => setTab(k)}>{tab === k && '✓ '}{t('record.tab.' + k)}</button>
        ))}
      </div>
      {loading ? <Loading /> : (
        <>
          {tab === 'bloodwork' && (
            <>
              <h3 className="mt16" style={{ marginBottom: 10 }}>{t('record.markers')}</h3>
              {data.results.length ? <MarkerList results={data.results} onOpen={(c) => nav(`/marker/${c}`)} /> : <Empty>{t('record.empty')}</Empty>}
              {p?.history_note && (
                <div className="card mt16"><div className="eyebrow" style={{ margin: '0 0 6px' }}>{t('record.personal')}</div><div className="small">{p.history_note}</div></div>
              )}
            </>
          )}
          {tab === 'compare' && <Compare results={data.results} />}
          {tab === 'reports' && (
            <div className="stack mt16">
              {data.reports.length ? data.reports.map((r) => (
                <div key={r.id} className="card list-item">
                  <Icon name="file" />
                  <div className="grow"><div style={{ fontWeight: 500 }}>{r.file_name || t('record.manual')}</div><div className="tiny muted">{[r.lab_name, r.country, fmtDate(r.test_date)].filter(Boolean).join(' · ')}</div></div>
                  {r.has_file && <button className="btn btn-ghost btn-small" onClick={() => openFile(r.id)}>{t('record.open')}</button>}
                </div>
              )) : <Empty>{t('record.noReports')}</Empty>}
            </div>
          )}
        </>
      )}
      <button className="btn btn-primary btn-small fab" onClick={() => nav('/add')}>+ {t('record.add')}</button>
    </Phone>
  );
}
