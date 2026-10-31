// Marker catalogue: the key to comparing results across countries.
//
// Every result is stored twice: exactly as printed on the lab report (value, unit, range)
// AND converted to one canonical unit per marker. Markers are identified by a LOINC code,
// so "Ferritina" from São Paulo and "Ferritin" from London land on the same line.
//
// GiGi standard ranges come from "Gigi_Reference_Ranges.pdf" (draft 31 Oct 2026, adult women,
// not pregnant) and are used whenever the lab report has no range. Reproductive hormones use
// ranges by cycle phase, AMH by age. To be validated by GiGi's clinical advisers (Lugein),
// together with the LOINC codes and conversion factors.
//
// `units`: factor to multiply a value in that unit to get the canonical unit, or {a, b} for an
// affine conversion (canonical = a * value + b). `ranges`: [low, high] per unit; null = open end
// ("< 34" -> [null, 34], "≥ 50" -> [50, null]).

export const PHASES = ['early', 'mid', 'luteal', 'post'];

export const MARKERS = [
  // ---------- Reproductive hormones by cycle phase ----------
  { code: 'fsh', loinc: '15067-2', unit: 'IU/L', group: 'reproductive',
    names: { en: 'FSH', pt: 'FSH', es: 'FSH' },
    synonyms: ['fsh', 'follicle stimulating hormone', 'follicle-stimulating hormone', 'hormona foliculoestimulante', 'hormona folículo estimulante', 'hormônio folículo estimulante', 'hormônio folículo-estimulante', 'folitropina'],
    units: { 'IU/L': 1, 'mIU/mL': 1 },
    phaseRanges: { early: { 'IU/L': [3.5, 12.5] }, mid: { 'IU/L': [4.7, 21.5] }, luteal: { 'IU/L': [1.7, 7.7] }, post: { 'IU/L': [25.8, 134.8] } } },
  { code: 'lh', loinc: '10501-5', unit: 'IU/L', group: 'reproductive',
    names: { en: 'LH', pt: 'LH', es: 'LH' },
    synonyms: ['lh', 'luteinizing hormone', 'luteinising hormone', 'hormona luteinizante', 'hormônio luteinizante', 'lutropina'],
    units: { 'IU/L': 1, 'mIU/mL': 1 },
    phaseRanges: { early: { 'IU/L': [2.4, 12.6] }, mid: { 'IU/L': [14.0, 95.6] }, luteal: { 'IU/L': [1.0, 11.4] }, post: { 'IU/L': [7.7, 58.5] } } },
  { code: 'estradiol', loinc: '2243-4', unit: 'pg/mL', group: 'reproductive',
    names: { en: 'Oestradiol (E2)', pt: 'Estradiol (E2)', es: 'Estradiol (E2)' },
    synonyms: ['estradiol', 'oestradiol', '17-beta estradiol', '17 beta estradiol', '17β-estradiol', 'e2'],
    units: { 'pg/mL': 1, 'pmol/L': 0.2724 },
    phaseRanges: {
      early: { 'pg/mL': [12.5, 166], 'pmol/L': [46, 609] }, mid: { 'pg/mL': [85.8, 498], 'pmol/L': [315, 1828] },
      luteal: { 'pg/mL': [43.8, 211], 'pmol/L': [161, 775] }, post: { 'pg/mL': [null, 54.7], 'pmol/L': [null, 201] } } },
  { code: 'progesterone', loinc: '2839-9', unit: 'ng/mL', group: 'reproductive',
    names: { en: 'Progesterone', pt: 'Progesterona', es: 'Progesterona' },
    synonyms: ['progesterone', 'progesterona'],
    units: { 'ng/mL': 1, 'nmol/L': 0.3145 },
    phaseRanges: {
      early: { 'ng/mL': [0.2, 1.5], 'nmol/L': [0.6, 4.8] }, mid: { 'ng/mL': [0.2, 1.5], 'nmol/L': [0.6, 4.8] },
      luteal: { 'ng/mL': [3.0, 27], 'nmol/L': [9.5, 86] }, post: { 'ng/mL': [null, 0.5], 'nmol/L': [null, 1.6] } } },

  // ---------- Reproductive hormones, other ----------
  { code: 'amh', loinc: '38476-3', unit: 'ng/mL', group: 'reproductive',
    names: { en: 'AMH (anti-Müllerian)', pt: 'AMH (anti-mülleriano)', es: 'AMH (antimülleriana)' },
    synonyms: ['amh', 'anti-mullerian', 'anti-müllerian', 'anti mullerian', 'antimulleriana', 'antimülleriana', 'anti-mulleriana', 'anti-mülleriana', 'antimulleriano', 'antimülleriano', 'anti-mülleriano', 'hormônio anti-mülleriano', 'hormona antimülleriana'],
    units: { 'ng/mL': 1, 'pmol/L': 0.14 },
    ageRanges: [
      { maxAge: 34, 'ng/mL': [1.0, 4.5], 'pmol/L': [7.1, 32] },
      { maxAge: 39, 'ng/mL': [0.7, 4.5], 'pmol/L': [5.0, 32] },
      { maxAge: 44, 'ng/mL': [0.3, 4.5], 'pmol/L': [2.1, 32] },
      { maxAge: 200, 'ng/mL': [null, 4.5], 'pmol/L': [null, 32] },
    ] },
  { code: 'prolactin', loinc: '2842-3', unit: 'ng/mL', group: 'reproductive',
    names: { en: 'Prolactin', pt: 'Prolactina', es: 'Prolactina' },
    synonyms: ['prolactin', 'prolactina', 'prl'],
    units: { 'ng/mL': 1, 'µg/L': 1, 'mIU/L': 0.0472 },
    ranges: { 'ng/mL': [4.8, 23.3], 'µg/L': [4.8, 23.3], 'mIU/L': [102, 494] } },
  { code: 'testosterone', loinc: '2986-8', unit: 'ng/mL', group: 'reproductive',
    names: { en: 'Testosterone (total)', pt: 'Testosterona total', es: 'Testosterona total' },
    synonyms: ['testosterona total', 'testosterone total', 'total testosterone', 'testosterona', 'testosterone'],
    exclude: ['livre', 'libre', 'free', 'biodisponível', 'biodisponible', 'bioavailable', 'índice', 'index'],
    units: { 'ng/mL': 1, 'ng/dL': 0.01, 'nmol/L': 0.2884 },
    ranges: { 'ng/mL': [0.08, 0.48], 'ng/dL': [8, 48], 'nmol/L': [0.28, 1.66] } },
  { code: 'shbg', loinc: '13967-5', unit: 'nmol/L', group: 'reproductive',
    names: { en: 'SHBG', pt: 'SHBG', es: 'SHBG' },
    synonyms: ['shbg', 'sex hormone binding globulin', 'sex hormone-binding globulin', 'globulina ligadora de hormônios sexuais', 'globulina transportadora de hormonas sexuales', 'globulina fijadora de hormonas sexuales'],
    units: { 'nmol/L': 1 },
    ranges: { 'nmol/L': [30, 120] } },
  { code: 'dheas', loinc: '2191-5', unit: 'µg/dL', group: 'reproductive',
    names: { en: 'DHEA-S', pt: 'DHEA-S', es: 'DHEA-S' },
    synonyms: ['dhea-s', 'dhea s', 'dheas', 'dhea-so4', 'dhea sulfato', 'dhea sulfate', 'sulfato de dehidroepiandrosterona', 'sulfato de deidroepiandrosterona', 's-dhea', 'sdhea'],
    units: { 'µg/dL': 1, 'µmol/L': 36.8 },
    ranges: { 'µg/dL': [35, 380], 'µmol/L': [0.95, 10.3] } },

  // ---------- Thyroid ----------
  { code: 'tsh', loinc: '3016-3', unit: 'mIU/L', group: 'thyroid',
    names: { en: 'TSH', pt: 'TSH', es: 'TSH' },
    synonyms: ['tsh', 'thyrotropin', 'thyroid stimulating hormone', 'tirotropina', 'hormônio tireoestimulante', 'hormona estimulante de la tiroides'],
    units: { 'mIU/L': 1, 'µIU/mL': 1, 'mU/L': 1 },
    ranges: { 'mIU/L': [0.4, 4.0], 'µIU/mL': [0.4, 4.0], 'mU/L': [0.4, 4.0] } },
  { code: 'free_t4', loinc: '3024-7', unit: 'ng/dL', group: 'thyroid',
    names: { en: 'Free T4', pt: 'T4 livre', es: 'T4 libre' },
    synonyms: ['free t4', 't4 livre', 't4 libre', 'ft4', 't4l', 'tiroxina livre', 'tiroxina libre', 'free thyroxine'],
    units: { 'ng/dL': 1, 'pmol/L': 0.0777 },
    ranges: { 'ng/dL': [0.9, 1.7], 'pmol/L': [11.6, 21.9] } },
  { code: 'free_t3', loinc: '3051-0', unit: 'pg/mL', group: 'thyroid',
    names: { en: 'Free T3', pt: 'T3 livre', es: 'T3 libre' },
    synonyms: ['free t3', 't3 livre', 't3 libre', 'ft3', 't3l', 'triiodotironina livre', 'triyodotironina libre', 'free triiodothyronine'],
    units: { 'pg/mL': 1, 'pmol/L': 0.651 },
    ranges: { 'pg/mL': [2.0, 4.4], 'pmol/L': [3.1, 6.8] } },
  { code: 'anti_tpo', loinc: '8099-4', unit: 'IU/mL', group: 'thyroid',
    names: { en: 'Anti-TPO antibodies', pt: 'Anticorpos anti-TPO', es: 'Anticuerpos anti-TPO' },
    synonyms: ['anti-tpo', 'anti tpo', 'antitpo', 'atpo', 'tpo ab', 'tpoab', 'anti-tireoperoxidase', 'antitireoperoxidase', 'antiperoxidasa', 'anti-peroxidasa', 'thyroid peroxidase', 'anticorpos antiperoxidase'],
    units: { 'IU/mL': 1, 'kIU/L': 1, 'U/mL': 1 },
    ranges: { 'IU/mL': [null, 34], 'kIU/L': [null, 34], 'U/mL': [null, 34] } },

  // ---------- Metabolic (fasting) ----------
  { code: 'glucose', loinc: '1558-6', unit: 'mg/dL', group: 'metabolic',
    names: { en: 'Fasting glucose', pt: 'Glicose em jejum', es: 'Glucosa en ayunas' },
    synonyms: ['fasting glucose', 'glucose', 'glicose em jejum', 'glicose', 'glicemia de jejum', 'glicemia', 'glucosa basal', 'glucosa en ayunas', 'glucosa', 'glucemia'],
    exclude: ['hemoglobina', 'haemoglobin', 'hemoglobin', 'urina', 'orina', 'urine', 'curva', 'pós', 'post'],
    units: { 'mg/dL': 1, 'mmol/L': 18.016 },
    ranges: { 'mg/dL': [70, 99], 'mmol/L': [3.9, 5.5] } },
  { code: 'hba1c', loinc: '4548-4', unit: '%', group: 'metabolic',
    names: { en: 'HbA1c', pt: 'Hemoglobina glicada (HbA1c)', es: 'Hemoglobina glicada (HbA1c)' },
    synonyms: ['hba1c', 'hb a1c', 'a1c', 'hemoglobina glicada', 'hemoglobina glicosilada', 'glycated haemoglobin', 'glycated hemoglobin', 'glycosylated hemoglobin'],
    units: { '%': 1, 'mmol/mol': { a: 0.0915, b: 2.15 } },
    ranges: { '%': [null, 5.7], 'mmol/mol': [null, 39] } },
  { code: 'insulin', loinc: '20448-7', unit: 'µIU/mL', group: 'metabolic',
    names: { en: 'Fasting insulin', pt: 'Insulina em jejum', es: 'Insulina en ayunas' },
    synonyms: ['fasting insulin', 'insulin', 'insulina em jejum', 'insulina basal', 'insulina'],
    units: { 'µIU/mL': 1, 'mIU/L': 1, 'µU/mL': 1, 'pmol/L': 1 / 6 },
    ranges: { 'µIU/mL': [2.6, 24.9], 'mIU/L': [2.6, 24.9], 'µU/mL': [2.6, 24.9], 'pmol/L': [16, 149] } },
  { code: 'chol_total', loinc: '2093-3', unit: 'mg/dL', group: 'metabolic',
    names: { en: 'Total cholesterol', pt: 'Colesterol total', es: 'Colesterol total' },
    synonyms: ['total cholesterol', 'cholesterol total', 'colesterol total', 'colesterol', 'cholesterol'],
    exclude: ['hdl', 'ldl', 'vldl', 'não hdl', 'no hdl', 'non-hdl', 'não-hdl'],
    units: { 'mg/dL': 1, 'mmol/L': 38.67 },
    ranges: { 'mg/dL': [null, 200], 'mmol/L': [null, 5.2] } },
  { code: 'ldl', loinc: '13457-7', unit: 'mg/dL', group: 'metabolic',
    names: { en: 'LDL cholesterol', pt: 'Colesterol LDL', es: 'Colesterol LDL' },
    synonyms: ['ldl cholesterol', 'ldl-cholesterol', 'colesterol ldl', 'ldl colesterol', 'ldl-colesterol', 'c-ldl', 'ldl-c', 'ldl'],
    exclude: ['vldl'],
    units: { 'mg/dL': 1, 'mmol/L': 38.67 },
    ranges: { 'mg/dL': [null, 116], 'mmol/L': [null, 3.0] } },
  { code: 'hdl', loinc: '2085-9', unit: 'mg/dL', group: 'metabolic',
    names: { en: 'HDL cholesterol', pt: 'Colesterol HDL', es: 'Colesterol HDL' },
    synonyms: ['hdl cholesterol', 'hdl-cholesterol', 'colesterol hdl', 'hdl colesterol', 'hdl-colesterol', 'c-hdl', 'hdl-c', 'hdl'],
    exclude: ['não hdl', 'não-hdl', 'no hdl', 'no-hdl', 'non-hdl', 'non hdl'],
    units: { 'mg/dL': 1, 'mmol/L': 38.67 },
    ranges: { 'mg/dL': [50, null], 'mmol/L': [1.3, null] } },
  { code: 'triglycerides', loinc: '2571-8', unit: 'mg/dL', group: 'metabolic',
    names: { en: 'Triglycerides', pt: 'Triglicerídeos', es: 'Triglicéridos' },
    synonyms: ['triglycerides', 'triglicerídeos', 'triglicerideos', 'triglicérides', 'triglicerides', 'triglicéridos', 'trigliceridos'],
    units: { 'mg/dL': 1, 'mmol/L': 88.57 },
    ranges: { 'mg/dL': [null, 150], 'mmol/L': [null, 1.7] } },

  // ---------- Blood count & nutrients ----------
  { code: 'haemoglobin', loinc: '718-7', unit: 'g/dL', group: 'blood',
    names: { en: 'Haemoglobin', pt: 'Hemoglobina', es: 'Hemoglobina' },
    synonyms: ['haemoglobin', 'hemoglobin', 'hemoglobina', 'hémoglobine', 'hgb', 'hb'],
    exclude: ['glicada', 'glicosilada', 'glycated', 'glycosylated', 'a1c', 'corpuscular', 'média', 'media', 'mean', 'concentração', 'concentración', 'chcm', 'hcm', 'mch'],
    units: { 'g/dL': 1, 'g/L': 0.1, 'mmol/L': 1.611 },
    ranges: { 'g/dL': [12.0, 15.5], 'g/L': [120, 155] } },
  { code: 'mcv', loinc: '787-2', unit: 'fL', group: 'blood',
    names: { en: 'MCV', pt: 'VCM', es: 'VCM' },
    synonyms: ['mcv', 'vcm', 'mean corpuscular volume', 'volume corpuscular médio', 'volume corpuscular medio', 'volumen corpuscular medio'],
    units: { 'fL': 1, 'µm³': 1 },
    ranges: { 'fL': [80, 100], 'µm³': [80, 100] } },
  { code: 'wbc', loinc: '6690-2', unit: '×10³/µL', group: 'blood',
    names: { en: 'White blood cells', pt: 'Leucócitos', es: 'Leucocitos' },
    synonyms: ['white blood cells', 'white blood cell count', 'leucócitos totais', 'leucocitos totales', 'leucócitos', 'leucocitos', 'glóbulos brancos', 'glóbulos blancos', 'wbc'],
    units: { '×10³/µL': 1, '×10⁹/L': 1, '/mm³': 0.001, '/µL': 0.001 },
    ranges: { '×10³/µL': [4.0, 11.0], '×10⁹/L': [4.0, 11.0], '/mm³': [4000, 11000], '/µL': [4000, 11000] } },
  { code: 'platelets', loinc: '777-3', unit: '×10³/µL', group: 'blood',
    names: { en: 'Platelets', pt: 'Plaquetas', es: 'Plaquetas' },
    synonyms: ['platelets', 'platelet count', 'plaquetas', 'contagem de plaquetas', 'recuento de plaquetas', 'plt'],
    units: { '×10³/µL': 1, '×10⁹/L': 1, '/mm³': 0.001, '/µL': 0.001 },
    ranges: { '×10³/µL': [150, 400], '×10⁹/L': [150, 400], '/mm³': [150000, 400000], '/µL': [150000, 400000] } },
  { code: 'ferritin', loinc: '2276-4', unit: 'ng/mL', group: 'blood',
    names: { en: 'Ferritin', pt: 'Ferritina', es: 'Ferritina' },
    synonyms: ['ferritin', 'ferritina', 'ferritine'],
    units: { 'ng/mL': 1, 'µg/L': 1, 'pmol/L': 0.445 },
    ranges: { 'ng/mL': [15, 150], 'µg/L': [15, 150] } },
  { code: 'vitamin_d', loinc: '62292-8', unit: 'ng/mL', group: 'blood',
    names: { en: 'Vitamin D (25-OH)', pt: 'Vitamina D (25-OH)', es: 'Vitamina D (25-OH)' },
    synonyms: ['vitamin d', 'vitamina d', '25-oh vitamin d', '25-oh-vitamina d', '25-hidroxivitamina d', '25 hidroxivitamina d', '25-hydroxyvitamin d', '25(oh)d', '25-oh', 'calcidiol'],
    units: { 'ng/mL': 1, 'nmol/L': 0.4006 },
    ranges: { 'ng/mL': [30, 100], 'nmol/L': [75, 250] } },
  { code: 'b12', loinc: '2132-9', unit: 'pg/mL', group: 'blood',
    names: { en: 'Vitamin B12', pt: 'Vitamina B12', es: 'Vitamina B12' },
    synonyms: ['vitamin b12', 'vitamina b12', 'b12', 'cobalamina', 'cobalamin', 'cianocobalamina'],
    units: { 'pg/mL': 1, 'ng/L': 1, 'pmol/L': 1.355 },
    ranges: { 'pg/mL': [200, 900], 'ng/L': [200, 900], 'pmol/L': [148, 664] } },
  { code: 'iron', loinc: '2498-4', unit: 'µg/dL', group: 'blood',
    names: { en: 'Serum iron', pt: 'Ferro sérico', es: 'Hierro sérico' },
    synonyms: ['serum iron', 'ferro sérico', 'ferro serico', 'hierro sérico', 'hierro serico', 'sideremia', 'iron', 'ferro', 'hierro'],
    exclude: ['ferritin', 'capacidade', 'capacidad', 'transferrin', 'tibc', 'saturação', 'saturación', 'binding'],
    units: { 'µg/dL': 1, 'µmol/L': 5.585 } },

  // ---------- Pre-conception ----------
  { code: 'folate', loinc: '2284-8', unit: 'ng/mL', group: 'preconception',
    names: { en: 'Folate (serum)', pt: 'Folato (ácido fólico)', es: 'Folato (ácido fólico)' },
    synonyms: ['folate', 'serum folate', 'folic acid', 'folato', 'ácido fólico', 'acido folico', 'folatos'],
    exclude: ['eritrocit', 'erythrocyte', 'rbc'],
    units: { 'ng/mL': 1, 'µg/L': 1, 'nmol/L': 0.441 },
    ranges: { 'ng/mL': [4.0, 20], 'µg/L': [4.0, 20], 'nmol/L': [9.1, 45] } },
  { code: 'rubella_igg', loinc: '8014-3', unit: 'IU/mL', group: 'preconception',
    names: { en: 'Rubella IgG', pt: 'Rubéola IgG', es: 'Rubéola IgG' },
    synonyms: ['rubella igg', 'rubéola igg', 'rubeola igg', 'anti-rubéola igg', 'rubella', 'rubéola', 'rubeola'],
    exclude: ['igm'],
    units: { 'IU/mL': 1, 'UI/mL': 1 },
    ranges: { 'IU/mL': [10, null], 'UI/mL': [10, null] } },
];

export const byCode = Object.fromEntries(MARKERS.map((m) => [m.code, m]));
export const isPhaseMarker = (code) => !!byCode[code]?.phaseRanges;
export const needsAge = (code) => !!byCode[code]?.ageRanges;

export function markerName(code, lang = 'en') {
  const m = byCode[code] || DERIVED.find((d) => d.code === code);
  return m ? m.names[lang] || m.names.en : code;
}

// ---------- text helpers (used by the PDF reader too) ----------
const strip = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
export function normText(s) {
  return strip(String(s || '').toLowerCase()).replace(/[μ]/g, 'µ').replace(/\s+/g, ' ').trim();
}
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Find the marker named in a line of text (longest synonym wins; exclusions respected). */
export function matchMarker(text) {
  const t = normText(text);
  if (!t) return null;
  let best = null;
  for (const m of MARKERS) {
    if (m.exclude?.some((x) => t.includes(normText(x)))) continue;
    for (const syn of m.synonyms) {
      const s = normText(syn);
      const re = new RegExp(`(^|[^a-z0-9])${esc(s)}(?=$|[^a-z0-9])`);
      const hit = re.exec(t);
      if (hit && (!best || s.length > best.len)) best = { marker: m, len: s.length, index: hit.index + hit[1].length };
    }
  }
  return best ? { ...best.marker, matchIndex: best.index, matchLength: best.len } : null;
}

/** Normalise how a unit is written on a report ("UI/L", "uUI/mL", "10^3/uL"…) to the catalogue spelling. */
export function normalizeUnit(raw, code) {
  const m = byCode[code];
  if (!m || !raw) return null;
  const key = (u) => normText(u).replace(/\s/g, '')
    .replace(/^x/, '×').replace(/x10/g, '×10').replace(/\^3|3(?=\/)/g, '³').replace(/\^9|9(?=\/l)/g, '⁹')
    .replace(/mui/g, 'miu').replace(/µui|uui|uiu|µiu/g, 'µiu').replace(/^ui\//, 'iu/').replace(/\bu\//, 'u/')
    .replace(/^ug/, 'µg').replace(/^umol/, 'µmol').replace(/^uu/, 'µu').replace(/mm3/, 'mm³').replace(/ul$/, 'µl')
    .replace(/mil\/µl/, '×10³/µl').replace(/^10³/, '×10³').replace(/^10⁹/, '×10⁹');
  const k = key(raw);
  return Object.keys(m.units).find((u) => key(u) === k) || null;
}

const conv = (f, v, back = false) =>
  typeof f === 'number' ? (back ? v / f : v * f) : (back ? (v - f.b) / f.a : f.a * v + f.b);

/** Convert a value from the unit printed on the report to the marker's canonical unit. */
export function toCanonical(code, value, unit) {
  const m = byCode[code];
  if (!m || value === '' || value == null || isNaN(Number(value))) return null;
  const f = m.units[unit];
  if (f == null) return null;
  return round(conv(f, Number(value)));
}

/** Convert a canonical value back into any supported unit. */
export function fromCanonical(code, value, unit) {
  const f = byCode[code]?.units[unit];
  if (f == null || value == null) return null;
  return round(conv(f, Number(value), true));
}

export function round(n) {
  if (n == null || isNaN(n)) return n;
  const a = Math.abs(n);
  const d = a >= 100 ? 0 : a >= 10 ? 1 : a >= 1 ? 2 : 3;
  return Number(Number(n).toFixed(d));
}

// ---------- cycle phase & age ----------
/**
 * Phase from the day of the cycle on the test day (day 1 = first day of the period).
 * Luteal = about the last 10 days before the next period (the PDF: "about 7 days before the
 * next expected period"); mid-cycle = the ovulation window (cycle length − 14, ±3 days).
 */
export function phaseFromCycle(day, length = 28, menopause = false) {
  if (menopause) return 'post';
  const d = Number(day), L = Number(length) || 28;
  if (!d || d < 1) return null;
  const ov = L - 14;
  if (d >= ov - 3 && d <= ov + 3) return 'mid';
  if (d > ov + 3) return 'luteal';
  return 'early';
}

/** GiGi standard range for a marker in a given unit (and phase / age when they matter). */
export function standardRange(code, unit, { phase, age } = {}) {
  const m = byCode[code];
  if (!m || !unit) return null;
  if (m.phaseRanges) {
    if (!phase) return null;
    const pr = m.phaseRanges[phase];
    if (pr?.[unit]) return pr[unit];
    // same unit family with factor 1 (IU/L = mIU/mL)
    const canon = Object.keys(pr || {}).find((u) => m.units[u] === 1 && m.units[unit] === 1);
    return canon ? pr[canon] : null;
  }
  if (m.ageRanges) {
    if (age == null || age === '') return null;
    const row = m.ageRanges.find((r) => Number(age) <= r.maxAge);
    return row?.[unit] || null;
  }
  return m.ranges?.[unit] || null;
}

/**
 * The rule engine. Range = the one printed on the lab report when there is one, otherwise the
 * GiGi standard range. GiGi never diagnoses: it only says whether a value sits inside the range.
 */
export function evaluate(value, low, high) {
  const v = Number(value);
  if (value === '' || value == null || isNaN(v)) return { status: 'unknown', needsReview: false };
  const lo = low === '' || low == null ? null : Number(low);
  const hi = high === '' || high == null ? null : Number(high);
  if (lo != null && v < lo) return { status: 'low', needsReview: true };
  if (hi != null && v > hi) return { status: 'high', needsReview: true };
  if (lo == null && hi == null) return { status: 'unknown', needsReview: true };
  return { status: 'normal', needsReview: false };
}

const num = (x) => (x === '' || x == null ? null : Number(x));

/** Build a full result record ready to store. */
export function buildResult({ code, value, unit, low, high, date, lab, country, context = null }) {
  const { status, needsReview } = evaluate(value, low, high);
  return {
    marker_code: code,
    loinc: byCode[code]?.loinc || null,
    value: Number(value),
    unit,
    ref_low: num(low),
    ref_high: num(high),
    value_canonical: toCanonical(code, value, unit),
    ref_low_canonical: num(low) == null ? null : toCanonical(code, low, unit),
    ref_high_canonical: num(high) == null ? null : toCanonical(code, high, unit),
    canonical_unit: byCode[code]?.unit,
    test_date: date,
    lab_name: lab || null,
    country: country || null,
    status,
    needs_review: needsReview,
    context,
  };
}

// ---------- calculated markers ----------
export const DERIVED = [
  { code: 'homa_ir', names: { en: 'HOMA-IR', pt: 'HOMA-IR', es: 'HOMA-IR' }, high: 2.5,
    formula: 'glucose (mg/dL) × insulin (µIU/mL) ÷ 405',
    compute: (g) => (g.glucose && g.insulin ? (g.glucose.value_canonical * g.insulin.value_canonical) / 405 : null) },
  { code: 'fai', names: { en: 'Free Androgen Index', pt: 'Índice de androgênio livre (FAI)', es: 'Índice de andrógenos libres (FAI)' }, high: 5,
    formula: 'testosterone (nmol/L) × 100 ÷ SHBG',
    compute: (g) => (g.testosterone && g.shbg ? ((g.testosterone.value_canonical / 0.2884) * 100) / g.shbg.value_canonical : null) },
  { code: 'lh_fsh', names: { en: 'LH : FSH ratio', pt: 'Relação LH : FSH', es: 'Relación LH : FSH' }, high: 2,
    formula: 'LH ÷ FSH (early follicular only)',
    compute: (g) => (g.lh && g.fsh && g.lh.context?.phase === 'early' && g.fsh.value_canonical ? g.lh.value_canonical / g.fsh.value_canonical : null) },
];

/** Calculated markers for each test date where all the inputs exist. */
export function derivedResults(results) {
  const byDate = {};
  for (const r of results || []) (byDate[r.test_date] ||= {})[r.marker_code] = r;
  const out = [];
  for (const [date, g] of Object.entries(byDate)) {
    for (const d of DERIVED) {
      const v = d.compute(g);
      if (v != null && isFinite(v)) out.push({ code: d.code, value: round(v), high: d.high, formula: d.formula, test_date: date, status: v < d.high ? 'normal' : 'high' });
    }
  }
  return out.sort((a, b) => b.test_date.localeCompare(a.test_date));
}
