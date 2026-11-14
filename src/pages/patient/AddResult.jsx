import { useRef, useState, useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Phone, TopBar, StatusBadge } from '../../components/ui.jsx';
import Icon from '../../components/Icon.jsx';
import { useI18n } from '../../i18n/index.jsx';
import { api } from '../../lib/api.js';
import { useSession } from '../../lib/session.jsx';
import { MARKERS, byCode, assess, buildResult, SITUATIONS, situationPhase, markerName, standardRange, phaseFromCycle, progesteroneTiming, isPhaseMarker, needsAge } from '../../lib/markers.js';
import { readLabPdf } from '../../lib/pdfReader.js';
import { rangeText } from '../../lib/results.js';
import { InfoButton } from '../../components/ResultBits.jsx';
import { cycleDayOn, avgCycle, isoOf } from '../../lib/cycle.js';
import { unzipChat, chatImport } from '../../lib/chatImport.js';

/** Age in whole years on a given date, from an ISO birth date. */
export function ageOn(birth, when) {
  if (!birth) return null;
  const b = new Date(birth), d = when || new Date();
  let a = d.getFullYear() - b.getFullYear();
  if (d.getMonth() < b.getMonth() || (d.getMonth() === b.getMonth() && d.getDate() < b.getDate())) a -= 1;
  return a > 0 && a < 120 ? a : null;
}

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
  const [params] = useSearchParams();
  // A report shared to GiGi from another app (WhatsApp → Share → GiGi) waits in the browser cache
  useEffect(() => {
    if (params.get('shared') !== '1' || !('caches' in window)) return;
    caches.open('gigi-share').then(async (c) => {
      const res = await c.match('shared-report');
      if (!res) return;
      const blob = await res.blob();
      await c.delete('shared-report');
      const name = decodeURIComponent(res.headers.get('X-Name') || 'report.pdf');
      take(new File([blob], name, { type: blob.type || 'application/pdf' }));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  async function take(f) {
    // A WhatsApp chat export (.zip): pull out the lab-report PDFs and check them one by one
    if (/\.zip$/i.test(f.name) || /zip/.test(f.type)) {
      if (f.size > 200 * 1024 * 1024) { setErr(t('upload.tooBig')); return; }
      try {
        const { pdfs, photos } = await unzipChat(f);
        chatImport.items = pdfs.map((file) => ({ file, info: null, done: false }));
        chatImport.photos = photos;
        nav('/add/whatsapp');
      } catch { setErr(t('wa.badZip')); }
      return;
    }
    if (f.size > 8 * 1024 * 1024) { setErr(t('upload.tooBig')); return; }
    nav('/add/check', { state: { file: f } });
  }
  function pick(e) {
    const f = e.target.files?.[0];
    if (f) take(f);
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
        <input ref={input} type="file" accept="application/pdf,image/*,.zip,application/zip" hidden onChange={pick} data-testid="file" />
      </div>
      {err && <div className="error">{err}</div>}
      <div className="card-tan mt16 small" data-testid="whatsapp-tip"><b>{t('upload.waTitle')}</b><div className="tiny muted mt8">{t('upload.waHow')}</div></div>
      <div className="row mt16 tiny muted" style={{ alignItems: 'flex-start' }}><Icon name="shield" size={14} /><span>{t('upload.private')}</span></div>
      <div className="row mt8 tiny muted" style={{ alignItems: 'flex-start' }}><Icon name="info" size={14} /><span>{t('upload.notDiagnosis')}</span></div>
    </Phone>
  );
}

const emptyRow = () => ({ code: '', value: '', unit: '', low: '', high: '', rangeSource: null });
const GROUPS = ['reproductive', 'thyroid', 'metabolic', 'blood', 'preconception'];

export function CheckResults() {
  const { t, lang, fmtNum } = useI18n();
  const nav = useNavigate();
  const { state } = useLocation();
  const file = state?.file || null;
  const { session, showToast } = useSession();
  const countryName = useCountryName();
  const [ctx, setCtx] = useState({ lab: '', country: session?.profile?.country || 'ES', date: new Date().toISOString().slice(0, 10) });
  // Start from what she told GiGi in her health history; the report header (if read) wins below
  const hist = session?.profile?.medical_history || {};
  const starts = session?.profile?.period_starts || [];
  const [cycle, setCycle] = useState(() => ({ day: String(cycleDayOn(starts, isoOf(new Date())) ?? ''), length: avgCycle(starts, hist.cycle_length || 28), menopause: hist.cycle === 'menopause' }));
  const [age, setAge] = useState(() => String(ageOn(session?.profile?.birth_date, new Date()) ?? ''));
  const [sit, setSit] = useState({ pill: hist.contraception === 'pill', breastfeeding: false, no_period: hist.cycle === 'none', thyroid_med: false, notes: '' });
  const [fromReport, setFromReport] = useState([]);   // which details came from the report header
  // Test date changed by hand: the cycle day follows her period log (unless the report gave one)
  useEffect(() => {
    if (!starts.length || fromReport.includes('cycleDay')) return;
    const d = cycleDayOn(starts, ctx.date);
    setCycle((c) => ({ ...c, day: d ? String(d) : c.day }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx.date]);
  const [rows, setRows] = useState([emptyRow()]);
  const [reading, setReading] = useState(!!file && /pdf$/i.test(file.type || file.name));
  const [readInfo, setReadInfo] = useState(null);   // { found, textFound }
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  // The pill, breastfeeding or no periods: compared with early-follicular ranges (team's reference sheet)
  const phase = cycle.menopause ? 'post' : sit.pill ? 'early' : phaseFromCycle(cycle.day, cycle.length) || situationPhase(sit);
  const opts = { phase, age };
  const progTiming = phase && phase !== 'early' ? progesteroneTiming(cycle.day, cycle.length, cycle.menopause) : null;
  const withStd = (r, o = opts) => {
    if (!r.code || !r.unit || r.rangeSource === 'lab' || r.rangeSource === 'manual') return r;
    const std = standardRange(r.code, r.unit, o);
    return { ...r, low: std ? (std[0] ?? '') : '', high: std ? (std[1] ?? '') : '', rangeSource: std ? 'gigi' : null };
  };

  // Read the PDF once and propose every result found
  useEffect(() => {
    if (!reading) return;
    let alive = true;
    readLabPdf(file).then((res) => {
      if (!alive) return;
      if (res.rows.length) setRows(res.rows.map((r) => withStd({ ...r, value: String(r.value), low: r.low ?? '', high: r.high ?? '' })));
      setCtx((c) => ({ ...c, date: res.date || c.date, lab: res.lab || c.lab }));
      const pt = res.patient || {}, got = [];
      if (pt.age) { setAge(String(pt.age)); got.push('age'); }
      else if (session?.profile?.birth_date && res.date) setAge(String(ageOn(session.profile.birth_date, new Date(res.date)) ?? ''));
      if (pt.cycleDay || pt.cycleLength || pt.menopause) {
        setCycle((c) => ({ day: pt.cycleDay ? String(pt.cycleDay) : c.day, length: pt.cycleLength || c.length, menopause: pt.menopause || c.menopause }));
        if (pt.cycleDay) got.push('cycleDay'); if (pt.cycleLength) got.push('cycleLength');
      }
      // no cycle day on the report: work it out from her period log for the test date
      if (!pt.cycleDay && !pt.menopause && res.date) {
        const d = cycleDayOn(starts, res.date);
        if (d) { setCycle((c) => ({ ...c, day: String(d) })); got.push('fromLog'); }
      }
      setFromReport(got);
      setReadInfo({ found: res.rows.length, textFound: res.textFound });
      setReading(false);
    });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Phase or age changed: refresh the GiGi standard ranges that depend on them
  useEffect(() => { setRows((rs) => rs.map((r) => withStd(r))); /* eslint-disable-next-line */ }, [phase, age]);

  const setRow = (i, patch) => setRows(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  function chooseMarker(i, code) {
    const m = byCode[code];
    setRow(i, withStd({ ...rows[i], code, unit: m?.unit || '', low: '', high: '', rangeSource: null }));
  }
  function chooseUnit(i, unit) {
    setRow(i, withStd({ ...rows[i], unit, low: '', high: '', rangeSource: null }));
  }
  const editRange = (i, k, v) => setRow(i, { [k]: v.replace(',', '.'), rangeSource: 'manual' });
  const valid = rows.length > 0 && rows.every((r) => r.code && r.value !== '' && r.unit) && ctx.date;
  const anyPhase = rows.some((r) => isPhaseMarker(r.code));
  const anyAge = rows.some((r) => needsAge(r.code));

  async function save() {
    setBusy(true); setErr('');
    try {
      const report = await api.addReport({ file, lab_name: ctx.lab, country: ctx.country, test_date: ctx.date });
      const situationToSave = Object.fromEntries(Object.entries({ ...sit, notes: sit.notes.trim() }).filter(([, v]) => v));
      const built = rows.map((r) => ({
        ...buildResult({ code: r.code, value: r.value, unit: r.unit, low: r.low, high: r.high, date: ctx.date, lab: ctx.lab, country: ctx.country,
          context: { range_source: r.rangeSource || 'manual', situation: situationToSave, ...(isPhaseMarker(r.code) ? { phase, cycle_day: cycle.day || null, cycle_length: cycle.length, menopause: cycle.menopause } : {}), ...(needsAge(r.code) ? { age: age || null } : {}) } }),
        report_id: report.id }));
      await api.addResults(built);
      showToast(t('check.saved'));
      // From a WhatsApp chat: mark it done and go back to the list while reports are left
      if (state?.chatIndex != null && chatImport.items[state.chatIndex]) {
        chatImport.items[state.chatIndex].done = true;
        if (chatImport.items.some((x) => !x.done)) { nav('/add/whatsapp', { replace: true }); return; }
      }
      // Land on the plain-words summary of everything just saved (Lexie: "didn't really get a result")
      nav('/record?new=' + ctx.date, { replace: true });
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }

  return (
    <Phone wide>
      <TopBar title={t('check.title')} close />
      <div className="row between tiny muted"><span>{t('add.step', { n: 2 })}</span><span>100%</span></div>
      <div className="progress mt8"><i style={{ width: '100%' }} /></div>
      {file && (
        <div className="card list-item mt16"><Icon name="file" /><div><div style={{ fontWeight: 500 }}>{file.name}</div><div className="tiny muted">{(file.size / 1024).toFixed(0)} KB</div></div></div>
      )}
      {reading && <div className="card-tan small mt16" data-testid="reading">{t('check.reading')}</div>}
      {readInfo && readInfo.found > 0 && <div className="card-tan small mt16" data-testid="read-ok"><b>{t('check.readOk', { n: readInfo.found })}</b> {t('check.readOkSub')}</div>}
      {readInfo && readInfo.found === 0 && <div className="card-tan small mt16" data-testid="read-none">{readInfo.textFound ? t('check.readNone') : t('check.readNoText')}</div>}
      {file && !/pdf$/i.test(file.type || file.name) && <div className="card-tan small mt16">{t('check.photo')}</div>}
      {!file && <p className="small muted mt16">{t('check.introManual')}</p>}

      <div className="card mt16">
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

      {anyPhase && (
        <div className="card mt16" data-testid="cycle">
          <div style={{ fontWeight: 600 }}>{t('cycle.title')}</div>
          <p className="tiny muted" style={{ margin: '4px 0 0' }}>{t('cycle.sub')}</p>
          <div className="grid2">
            <div><label className="lbl">{t('cycle.day')}</label>
              <input className="field" inputMode="numeric" value={cycle.day} disabled={cycle.menopause} onChange={(e) => setCycle({ ...cycle, day: e.target.value.replace(/\D/g, '') })} aria-label={t('cycle.day')} /></div>
            <div><label className="lbl">{t('cycle.length')}</label>
              <input className="field" inputMode="numeric" value={cycle.length} disabled={cycle.menopause} onChange={(e) => setCycle({ ...cycle, length: e.target.value.replace(/\D/g, '') })} /></div>
          </div>
          <label className="row mt8 small" style={{ cursor: 'pointer' }}>
            <input type="checkbox" checked={cycle.menopause} onChange={(e) => setCycle({ ...cycle, menopause: e.target.checked })} />{t('cycle.menopause')}
          </label>
          <div className="small mt8">{phase ? <><b>{t('cycle.phase')}:</b> {t('phase.' + phase)}</> : <span className="muted">{t('cycle.needed')}</span>}</div>
          {(fromReport.includes('cycleDay') || fromReport.includes('cycleLength')) && <p className="tiny muted" style={{ margin: '6px 0 0' }} data-testid="from-report">{t('cycle.fromReport')}</p>}
          {fromReport.includes('fromLog') && <p className="tiny muted" style={{ margin: '6px 0 0' }} data-testid="from-log">{t('cycle.fromLog')}</p>}
        </div>
      )}
      {anyAge && (
        <div className="card mt16">
          <label className="lbl" style={{ marginTop: 0 }}>{t('cycle.age')}</label>
          <input className="field" inputMode="numeric" value={age} onChange={(e) => setAge(e.target.value.replace(/\D/g, ''))} aria-label={t('cycle.age')} />
          <p className="tiny muted" style={{ margin: '6px 0 0' }}>{fromReport.includes('age') ? t('cycle.fromReport') : t('cycle.ageSub')}</p>
        </div>
      )}

      <div className="card mt16" data-testid="situation">
        <div style={{ fontWeight: 600 }}>{t('situation.title')}</div>
        <p className="tiny muted" style={{ margin: '4px 0 0' }}>{t('situation.sub')}</p>
        <div className="stack mt8" style={{ gap: 6 }}>
          {SITUATIONS.map((k) => (
            <label key={k} className="row small" style={{ cursor: 'pointer' }}>
              <input type="checkbox" checked={sit[k]} onChange={(e) => setSit({ ...sit, [k]: e.target.checked })} />{t('situation.' + k)}
            </label>
          ))}
        </div>
        <label className="lbl">{t('situation.notes')}</label>
        <textarea className="field" rows={3} value={sit.notes} onChange={(e) => setSit({ ...sit, notes: e.target.value })} placeholder={t('situation.notesPh')} aria-label={t('situation.notes')} />
        <p className="tiny muted" style={{ margin: '6px 0 0' }}>{t('situation.notesSub')}</p>
      </div>

      <div className="dgrid">
      {rows.map((r, i) => {
        const m = byCode[r.code];
        const ev = r.value !== '' && r.code && r.unit ? assess({ code: r.code, value: r.value, unit: r.unit, low: r.low, high: r.high, situation: sit }) : null;
        return (
          <div key={i} className="card mt16" data-testid="result-row">
            <div className="row between">
              <label className="lbl" style={{ marginTop: 0 }}>{t('check.marker')}</label>
              {rows.length > 1 && <button className="icon-btn" onClick={() => setRows(rows.filter((_, j) => j !== i))} aria-label={t('common.remove')}><Icon name="trash" size={16} /></button>}
            </div>
            <div className="row">
              <select className="field grow" value={r.code} onChange={(e) => chooseMarker(i, e.target.value)} aria-label={t('check.marker')}>
                <option value="">{t('check.pickMarker')}</option>
                {GROUPS.map((g) => (
                  <optgroup key={g} label={t('group.' + g)}>
                    {MARKERS.filter((mk) => mk.group === g).map((mk) => <option key={mk.code} value={mk.code}>{markerName(mk.code, lang)}</option>)}
                  </optgroup>
                ))}
              </select>
              {r.code && <InfoButton code={r.code} r={{ ref_low: r.low, ref_high: r.high, unit: r.unit, context: { phase } }} />}
              {ev && <StatusBadge status={ev.status} ctx={ev} />}
            </div>
            <div className="grid2">
              <div><label className="lbl">{t('check.value')}</label><input className="field" inputMode="decimal" value={r.value} onChange={(e) => setRow(i, { value: e.target.value.replace(',', '.') })} aria-label={t('check.value')} /></div>
              <div><label className="lbl">{t('check.unit')}</label>
                <select className="field" value={r.unit} onChange={(e) => chooseUnit(i, e.target.value)} disabled={!m} aria-label={t('check.unit')}>
                  {m ? Object.keys(m.units).map((u) => <option key={u} value={u}>{u}</option>) : <option value="">—</option>}
                </select></div>
              <div><label className="lbl">{t('check.low')}</label><input className="field" inputMode="decimal" value={r.low} placeholder="—" onChange={(e) => editRange(i, 'low', e.target.value)} aria-label={t('check.low')} /></div>
              <div><label className="lbl">{t('check.high')}</label><input className="field" inputMode="decimal" value={r.high} placeholder="—" onChange={(e) => editRange(i, 'high', e.target.value)} aria-label={t('check.high')} /></div>
            </div>
            {r.rangeSource && (r.low !== '' || r.high !== '') && <p className="tiny" style={{ margin: '8px 0 0' }} data-testid="row-range"><b>{t('range.normal')}: {rangeText(r.low, r.high, t, fmtNum)} {r.unit}</b> <span className="muted">· {t('range.' + r.rangeSource)}</span></p>}
            {m && isPhaseMarker(r.code) && !phase && <p className="tiny" style={{ margin: '8px 0 0', color: 'var(--cherry)' }}>{t('cycle.needed')}</p>}
            {ev?.urgency && <p className="tiny" style={{ margin: '8px 0 0', color: '#C62828', fontWeight: 600 }}>{t('urgent.' + ev.urgency)}</p>}
            {ev?.expected && <p className="tiny muted" style={{ margin: '8px 0 0' }}>{t('situation.expectedWhy.' + ev.expected)}</p>}
            {ev?.dose && <p className="tiny" style={{ margin: '8px 0 0', color: 'var(--cherry)' }}>{t('situation.dose')}</p>}
            {r.code === 'progesterone' && progTiming && <p className="tiny" data-testid="prog-timing" style={{ margin: '8px 0 0', color: 'var(--cherry)' }}>{t('cycle.progTiming', progTiming)}</p>}
            {m && needsAge(r.code) && !age && <p className="tiny" style={{ margin: '8px 0 0', color: 'var(--cherry)' }}>{t('cycle.ageNeeded')}</p>}
            {ev?.status === 'unknown' && !isPhaseMarker(r.code) && !needsAge(r.code) && <p className="tiny muted mt8">{t('check.noRange')}</p>}
          </div>
        );
      })}
      </div>
      <button className="btn btn-link mt8" onClick={() => setRows([...rows, emptyRow()])}>+ {t('check.another')}</button>
      {err && <div className="error">{err}</div>}
      <button className="btn btn-primary mt16" disabled={!valid || busy || reading} onClick={save}>{t('check.save')}</button>
      <button className="btn btn-ghost mt8" onClick={() => nav(-1)}>{t('common.cancel')}</button>
    </Phone>
  );
}

/** Reports found in a WhatsApp chat export: each one is read here, then checked and saved one by one. */
export function WhatsAppImport() {
  const { t, fmtDate } = useI18n();
  const nav = useNavigate();
  const [, force] = useState(0);
  useEffect(() => {
    let alive = true;
    (async () => {
      for (const it of chatImport.items) {
        if (it.info) continue;
        try { const r = await readLabPdf(it.file); it.info = { date: r.date, lab: r.lab, n: r.rows.length }; }
        catch { it.info = { n: 0 }; }
        if (alive) force((x) => x + 1);
      }
    })();
    return () => { alive = false; };
  }, []);
  const items = chatImport.items;
  const reports = items.map((it, i) => ({ ...it, i })).filter((it) => !it.info || it.info.n > 0);
  const others = items.filter((it) => it.info && it.info.n === 0).length;
  return (
    <Phone>
      <TopBar title={t('wa.title')} />
      {!items.length && <div className="card small">{t('wa.none')}</div>}
      {!!items.length && <p className="small muted" style={{ marginTop: 0 }}>{t('wa.found', { n: reports.length })}</p>}
      <div className="stack mt8" style={{ gap: 10 }}>
        {reports.map((it) => (
          <div key={it.i} className="card row between" data-testid="wa-report">
            <div>
              <div style={{ fontWeight: 600 }}>{it.info?.date ? fmtDate(it.info.date) : it.file.name}</div>
              <div className="tiny muted">{it.info ? `${it.info.lab ? it.info.lab + ' · ' : ''}${t('wa.results', { n: it.info.n })}` : t('wa.reading')}</div>
            </div>
            {it.done ? <span className="badge" style={{ background: 'var(--ok-bg)', color: 'var(--ok-ink)' }}>{t('wa.added')}</span>
              : <button className="btn btn-primary btn-small" disabled={!it.info} onClick={() => nav('/add/check', { state: { file: it.file, chatIndex: it.i } })}>{t('wa.check')}</button>}
          </div>
        ))}
      </div>
      {(others > 0 || chatImport.photos > 0) && <p className="tiny muted mt16">{t('wa.skipped', { pdfs: others, photos: chatImport.photos })}</p>}
      <div className="row mt16 tiny muted" style={{ alignItems: 'flex-start' }}><Icon name="shield" size={14} /><span>{t('wa.private')}</span></div>
      {items.length > 0 && items.every((x) => x.done || (x.info && x.info.n === 0)) && <button className="btn btn-primary mt16" onClick={() => nav('/record')}>{t('wa.done')}</button>}
    </Phone>
  );
}
