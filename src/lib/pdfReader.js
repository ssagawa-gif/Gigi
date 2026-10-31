// Reads a lab report PDF in the browser (no AI, nothing leaves the device) and proposes the results.
// Works with PDFs that contain text (almost every lab's digital report). Photos and scanned PDFs
// have no text layer: the patient types the values instead.
import { matchMarker, normalizeUnit, normText, isPhaseMarker } from './markers.js';

const LABS = ['synlab', 'fleury', 'dasa', 'delboni', 'lavoisier', 'a+ medicina', 'hermes pardini', 'sabin', 'einstein', 'sirio-libanes',
  'unilabs', 'eurofins', 'megalab', 'labco', 'cerba', 'quest diagnostics', 'labcorp', 'echevarne', 'quironsalud', 'sanitas', 'melo', 'lab gigi'];
const MONTHS = { jan: 1, ene: 1, feb: 2, fev: 2, fév: 2, mar: 3, apr: 4, abr: 4, avr: 4, may: 5, mai: 5, jun: 6, jul: 7, aug: 8, ago: 8, aoû: 8, sep: 9, set: 9, oct: 10, out: 10, nov: 11, dec: 12, dez: 12, dic: 12, déc: 12 };

export async function pdfLines(file) {
  const pdfjs = await import('pdfjs-dist');
  const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const lines = [];
  for (let p = 1; p <= Math.min(doc.numPages, 10); p++) {
    const page = await doc.getPage(p);
    const { items } = await page.getTextContent();
    const rows = [];
    for (const it of items) {
      if (!it.str || !it.str.trim()) continue;
      const x = it.transform[4], y = it.transform[5];
      let row = rows.find((r) => Math.abs(r.y - y) <= 2.5);
      if (!row) rows.push((row = { y, parts: [] }));
      row.parts.push({ x, s: it.str, w: it.width || 0 });
    }
    rows.sort((a, b) => b.y - a.y);
    for (const r of rows) {
      r.parts.sort((a, b) => a.x - b.x);
      let line = '', end = null;
      for (const pt of r.parts) {
        if (end != null) line += pt.x - end > 12 ? '   ' : ' ';
        line += pt.s; end = pt.x + pt.w;
      }
      lines.push(line.replace(/\s+$/, ''));
    }
  }
  return lines;
}

/** "12,9" -> 12.9 · "6.500" (cells/mm³) -> 6500 · "1,234.5" -> 1234.5 */
export function parseNum(s, unit) {
  let t = String(s).replace(/[^\d.,-]/g, '');
  if (!t) return null;
  const hasDot = t.includes('.'), hasComma = t.includes(',');
  if (hasDot && hasComma) {
    const dec = t.lastIndexOf('.') > t.lastIndexOf(',') ? '.' : ',';
    t = t.replace(dec === '.' ? /,/g : /\./g, '').replace(',', '.');
  } else if (hasComma) {
    t = /^\d{1,3}(,\d{3})+$/.test(t) && unit && /mm³|µL/.test(unit) ? t.replace(/,/g, '') : t.replace(',', '.');
  } else if (hasDot && /^\d{1,3}(\.\d{3})+$/.test(t) && unit && /mm³|µL/.test(unit) && !unit.startsWith('×')) {
    t = t.replace(/\./g, '');
  }
  const n = Number(t);
  return isNaN(n) ? null : n;
}

const NUM = String.raw`\d{1,3}(?:[.,]\d{3})+(?:[.,]\d+)?|\d+(?:[.,]\d+)?`;

function findUnit(tokens, code) {
  for (let size = 3; size >= 1; size--) {
    for (let i = 0; i + size <= tokens.length; i++) {
      const cand = tokens.slice(i, i + size).join('');
      const u = normalizeUnit(cand, code);
      if (u) return { unit: u, start: i, end: i + size };
    }
  }
  return null;
}

function findRange(text, unit) {
  const t = ` ${text} `;
  let m = new RegExp(`(${NUM})\\s*(?:-|–|—|a|to|ate|até|hasta|al)\\s*(${NUM})`, 'i').exec(t);
  if (m) return [parseNum(m[1], unit), parseNum(m[2], unit)];
  m = new RegExp(`(?:<|≤|=<|inferior a|menor que|menor de|less than|below|ate|até|hasta|up to)\\s*(${NUM})`, 'i').exec(t);
  if (m) return [null, parseNum(m[1], unit)];
  m = new RegExp(`(?:>|≥|>=|superior a|maior que|mayor que|mayor de|greater than|above|over)\\s*(${NUM})`, 'i').exec(t);
  if (m) return [parseNum(m[1], unit), null];
  return null;
}

export function parseLine(raw, next) {
  const line = String(raw).replace(/\s+/g, ' ').trim();   // same length as its normalised form
  const marker = matchMarker(line);
  if (!marker) return null;
  const norm = normText(line);
  // drop the marker name, keep what follows (value, unit, range); the original spelling keeps "µ", "³", etc.
  const restNorm = norm.slice(marker.matchIndex + marker.matchLength);
  let rest = line.slice(line.length - restNorm.length);
  // "VITAMINA D - 25 HIDROXI: 60 nmol/L" -> the value comes after the colon of the label
  const colon = rest.indexOf(':');
  if (colon >= 0) {
    const before = rest.slice(0, colon).trim().split(/\s+/).filter(Boolean);
    const hasUnit = before.some((tk) => normalizeUnit(tk, marker.code));
    const last = before[before.length - 1] || '';
    if (!hasUnit && (!/\d/.test(before.join('')) || /^[a-zà-ü-]+$/i.test(last))) rest = rest.slice(colon + 1);
  }
  let tokens = rest.replace(/[()[\]]/g, ' ').split(/\s+/).filter(Boolean);
  const u = findUnit(tokens, marker.code);
  const unit = u?.unit || null;
  if (u) tokens = [...tokens.slice(0, u.start), '§', ...tokens.slice(u.end)];

  // value = first number after the name (ignoring flags such as H, L, *, ↑)
  let value = null, valueIdx = -1;
  for (let i = 0; i < tokens.length; i++) {
    const tk = tokens[i].replace(/^[<>≤≥*↑↓]+/, '');
    if (new RegExp(`^(?:${NUM})$`).test(tk)) { value = parseNum(tk, unit); valueIdx = i; break; }
  }
  if (value == null) return null;

  let range = null;
  if (!isPhaseMarker(marker.code)) {   // phase hormones: labs print several ranges; GiGi uses the one for the patient's phase
    const after = tokens.slice(valueIdx + 1).filter((x) => x !== '§').join(' ');
    range = findRange(after, unit);
    // range printed on the next line ("Valor de referência: 12,0 a 15,5 g/dL")
    if (!range && next && !matchMarker(next) && /refer|valor|rango|range|intervalo|normal|\bvr\b/i.test(next)) {
      range = findRange(next.replace(/^[^\d<>≤≥]*/, ''), unit);
    }
  }
  return { code: marker.code, value, unit: unit || marker.unit, unitFound: !!unit,
    low: range ? range[0] : null, high: range ? range[1] : null, rangeSource: range ? 'lab' : null };
}

function findDate(lines) {
  const pats = [
    { re: /\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})\b/, f: (m) => [m[3], m[2], m[1]] },
    { re: /\b(\d{4})-(\d{1,2})-(\d{1,2})\b/, f: (m) => [m[1], m[2], m[3]] },
    { re: /\b(\d{1,2})(?:\s+de)?\s+([a-zà-ü]{3})[a-zà-ü]*\.?(?:\s+de)?\s+(\d{4})\b/i, f: (m) => [m[3], MONTHS[m[2].toLowerCase().slice(0, 3)], m[1]] },
  ];
  const keyed = lines.filter((l) => /fecha|data|date|colet|extrac|recolh|toma|collected|emiss/i.test(l));
  for (const group of [keyed, lines]) {
    for (const l of group) {
      for (const p of pats) {
        const m = p.re.exec(l);
        if (!m) continue;
        let [y, mo, d] = p.f(m).map(Number);
        if (p.mdy !== false && mo > 12 && d <= 12) [mo, d] = [d, mo]; // US style: 10/14/2026
        if (!mo || mo > 12 || d > 31 || y < 1990 || y > new Date().getFullYear() + 1) continue;
        return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      }
    }
  }
  return null;
}

/** Returns { textFound, rows, date, lab }. */
export async function readLabPdf(file) {
  if (!file || !/pdf$/i.test(file.type || file.name)) return { textFound: false, rows: [] };
  let lines = [];
  try { lines = await pdfLines(file); } catch { return { textFound: false, rows: [] }; }
  const textFound = lines.join('').replace(/\s/g, '').length > 30;
  const rows = [];
  for (let i = 0; i < lines.length; i++) {
    const r = parseLine(lines[i], lines[i + 1]);
    if (r && !rows.some((x) => x.code === r.code)) rows.push(r);
  }
  const all = normText(lines.join(' '));
  const lab = LABS.find((l) => all.includes(l));
  const labLine = lab ? lines.find((l) => normText(l).includes(lab)) : null;
  return { textFound, rows, date: findDate(lines), lab: labLine ? labLine.trim().slice(0, 60) : '' };
}
