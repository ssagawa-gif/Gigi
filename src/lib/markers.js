// Marker catalogue: the key to comparing results across countries.
//
// Every result is stored twice: exactly as printed on the lab report (value, unit, range)
// AND converted to one canonical unit per marker. Markers are identified by a LOINC code,
// the international lab-test code system, so "Ferritina" from São Paulo, "Ferritina" from
// Barcelona and "Ferritin" from London all land on the same line of the history.
//
// Conversion factors are standard SI <-> conventional factors.
// `factor` = multiply a value in that unit to get the canonical unit.
// LOINC codes and factors should be checked by the clinical lead (Lugein) before launch.

export const MARKERS = [
  {
    code: 'ferritin', loinc: '2276-4', unit: 'ng/mL', group: 'iron',
    names: { en: 'Ferritin', pt: 'Ferritina', es: 'Ferritina' },
    synonyms: ['ferritin', 'ferritina', 'ferritine', 'ferritin serum'],
    units: { 'ng/mL': 1, 'µg/L': 1, 'ug/L': 1, 'pmol/L': 0.445 },
    defaultRange: [15, 150],
  },
  {
    code: 'haemoglobin', loinc: '718-7', unit: 'g/dL', group: 'blood',
    names: { en: 'Haemoglobin', pt: 'Hemoglobina', es: 'Hemoglobina' },
    synonyms: ['haemoglobin', 'hemoglobin', 'hemoglobina', 'hémoglobine', 'hb', 'hgb'],
    units: { 'g/dL': 1, 'g/L': 0.1, 'mmol/L': 1.611 },
    defaultRange: [12.0, 15.5],
  },
  {
    code: 'vitamin_d', loinc: '62292-8', unit: 'ng/mL', group: 'vitamins',
    names: { en: 'Vitamin D', pt: 'Vitamina D', es: 'Vitamina D' },
    synonyms: ['vitamin d', 'vitamina d', '25-oh vitamin d', '25-hidroxivitamina d', '25(oh)d', 'calcidiol'],
    units: { 'ng/mL': 1, 'nmol/L': 0.4006 },
    defaultRange: [30, 100],
  },
  {
    code: 'tsh', loinc: '3016-3', unit: 'mIU/L', group: 'thyroid',
    names: { en: 'TSH', pt: 'TSH', es: 'TSH' },
    synonyms: ['tsh', 'thyrotropin', 'tirotropina', 'hormônio tireoestimulante'],
    units: { 'mIU/L': 1, 'µIU/mL': 1, 'uIU/mL': 1, 'mU/L': 1 },
    defaultRange: [0.4, 4.0],
  },
  {
    code: 'free_t4', loinc: '3024-7', unit: 'ng/dL', group: 'thyroid',
    names: { en: 'Free T4', pt: 'T4 livre', es: 'T4 libre' },
    synonyms: ['free t4', 't4 livre', 't4 libre', 'ft4', 'tiroxina livre', 'tiroxina libre'],
    units: { 'ng/dL': 1, 'pmol/L': 0.0777 },
  },
  {
    code: 'estradiol', loinc: '2243-4', unit: 'pg/mL', group: 'hormones',
    names: { en: 'Oestradiol (E2)', pt: 'Estradiol (E2)', es: 'Estradiol (E2)' },
    synonyms: ['estradiol', 'oestradiol', 'e2', 'estradiol sérico'],
    units: { 'pg/mL': 1, 'pmol/L': 0.2724 },
  },
  {
    code: 'progesterone', loinc: '2839-9', unit: 'ng/mL', group: 'hormones',
    names: { en: 'Progesterone', pt: 'Progesterona', es: 'Progesterona' },
    synonyms: ['progesterone', 'progesterona'],
    units: { 'ng/mL': 1, 'nmol/L': 0.3145 },
  },
  {
    code: 'fsh', loinc: '15067-2', unit: 'mIU/mL', group: 'hormones',
    names: { en: 'FSH', pt: 'FSH', es: 'FSH' },
    synonyms: ['fsh', 'hormônio folículo-estimulante', 'hormona foliculoestimulante'],
    units: { 'mIU/mL': 1, 'IU/L': 1, 'UI/L': 1 },
  },
  {
    code: 'lh', loinc: '10501-5', unit: 'mIU/mL', group: 'hormones',
    names: { en: 'LH', pt: 'LH', es: 'LH' },
    synonyms: ['lh', 'hormônio luteinizante', 'hormona luteinizante'],
    units: { 'mIU/mL': 1, 'IU/L': 1, 'UI/L': 1 },
  },
  {
    code: 'amh', loinc: '38476-3', unit: 'ng/mL', group: 'hormones',
    names: { en: 'AMH', pt: 'AMH (anti-mülleriano)', es: 'AMH (antimülleriana)' },
    synonyms: ['amh', 'anti-mullerian', 'antimülleriano', 'hormônio anti-mülleriano', 'hormona antimülleriana'],
    units: { 'ng/mL': 1, 'pmol/L': 0.14 },
  },
  {
    code: 'prolactin', loinc: '2842-3', unit: 'ng/mL', group: 'hormones',
    names: { en: 'Prolactin', pt: 'Prolactina', es: 'Prolactina' },
    synonyms: ['prolactin', 'prolactina', 'prl'],
    units: { 'ng/mL': 1, 'µg/L': 1, 'mIU/L': 0.0472 },
  },
  {
    code: 'testosterone', loinc: '2986-8', unit: 'ng/dL', group: 'hormones',
    names: { en: 'Testosterone (total)', pt: 'Testosterona total', es: 'Testosterona total' },
    synonyms: ['testosterone', 'testosterona', 'testosterona total'],
    units: { 'ng/dL': 1, 'nmol/L': 28.84 },
  },
  {
    code: 'glucose', loinc: '1558-6', unit: 'mg/dL', group: 'metabolic',
    names: { en: 'Fasting glucose', pt: 'Glicose em jejum', es: 'Glucosa en ayunas' },
    synonyms: ['glucose', 'glicose', 'glucosa', 'glicemia', 'glucemia'],
    units: { 'mg/dL': 1, 'mmol/L': 18.016 },
  },
  {
    code: 'b12', loinc: '2132-9', unit: 'pg/mL', group: 'vitamins',
    names: { en: 'Vitamin B12', pt: 'Vitamina B12', es: 'Vitamina B12' },
    synonyms: ['b12', 'vitamin b12', 'vitamina b12', 'cobalamina', 'cobalamin'],
    units: { 'pg/mL': 1, 'ng/L': 1, 'pmol/L': 1.355 },
  },
  {
    code: 'iron', loinc: '2498-4', unit: 'µg/dL', group: 'iron',
    names: { en: 'Serum iron', pt: 'Ferro sérico', es: 'Hierro sérico' },
    synonyms: ['iron', 'ferro', 'hierro', 'ferro sérico', 'hierro sérico', 'fer sérique'],
    units: { 'µg/dL': 1, 'ug/dL': 1, 'µmol/L': 5.585 },
  },
];

export const byCode = Object.fromEntries(MARKERS.map((m) => [m.code, m]));

export function markerName(code, lang = 'en') {
  const m = byCode[code];
  return m ? m.names[lang] || m.names.en : code;
}

/** Find a marker from free text as printed on any lab report. */
export function matchMarker(text) {
  const t = (text || '').trim().toLowerCase();
  if (!t) return null;
  return MARKERS.find((m) => m.synonyms.some((s) => t === s || t.includes(s))) || null;
}

/** Convert a value from the unit printed on the report to the marker's canonical unit. */
export function toCanonical(code, value, unit) {
  const m = byCode[code];
  if (!m || value === '' || value == null || isNaN(Number(value))) return null;
  const factor = m.units[unit];
  if (factor == null) return null;
  return round(Number(value) * factor);
}

/** Convert a canonical value back into any supported unit (e.g. to show in the user's local units). */
export function fromCanonical(code, value, unit) {
  const m = byCode[code];
  const factor = m?.units[unit];
  if (!factor || value == null) return null;
  return round(Number(value) / factor);
}

export function round(n) {
  if (n == null || isNaN(n)) return n;
  const a = Math.abs(n);
  const d = a >= 100 ? 0 : a >= 10 ? 1 : 2;
  return Number(n.toFixed(d));
}

/**
 * The rule engine. The range used is the one printed on the patient's own lab report
 * (labs set their own ranges), compared in the same unit.
 *   normal -> plain explanation, no doctor needed
 *   low / high -> flagged, the app proposes a doctor review
 * GiGi never diagnoses: it only says whether a value sits inside the lab's range.
 */
export function evaluate(value, low, high) {
  const v = Number(value);
  if (isNaN(v)) return { status: 'unknown', needsReview: false };
  const lo = low === '' || low == null ? null : Number(low);
  const hi = high === '' || high == null ? null : Number(high);
  if (lo != null && v < lo) return { status: 'low', needsReview: true };
  if (hi != null && v > hi) return { status: 'high', needsReview: true };
  if (lo == null && hi == null) return { status: 'unknown', needsReview: true };
  return { status: 'normal', needsReview: false };
}

/** Build a full result record ready to store. */
export function buildResult({ code, value, unit, low, high, date, lab, country }) {
  const { status, needsReview } = evaluate(value, low, high);
  return {
    marker_code: code,
    loinc: byCode[code]?.loinc || null,
    value: Number(value),
    unit,
    ref_low: low === '' ? null : Number(low),
    ref_high: high === '' ? null : Number(high),
    value_canonical: toCanonical(code, value, unit),
    ref_low_canonical: low === '' ? null : toCanonical(code, low, unit),
    ref_high_canonical: high === '' ? null : toCanonical(code, high, unit),
    canonical_unit: byCode[code]?.unit,
    test_date: date,
    lab_name: lab || null,
    country: country || null,
    status,
    needs_review: needsReview,
  };
}
