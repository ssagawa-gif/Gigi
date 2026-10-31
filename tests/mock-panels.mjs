import fs from 'fs';
const M = await import('../src/lib/markers.js');
const data = JSON.parse(fs.readFileSync(new URL('./fixtures/mock_panels.json', import.meta.url)));
const map = {'FSH':'fsh','LH':'lh','Estradiol':'estradiol','Progesterone':'progesterone','AMH':'amh','Prolactin':'prolactin','Total testosterone':'testosterone','SHBG':'shbg','DHEA-S':'dheas','TSH':'tsh','Free T4':'free_t4','Free T3':'free_t3','Anti-TPO antibodies':'anti_tpo','Fasting glucose':'glucose','HbA1c':'hba1c','Fasting insulin':'insulin','Total cholesterol':'chol_total','LDL cholesterol':'ldl','HDL cholesterol':'hdl','Triglycerides':'triglycerides','Haemoglobin':'haemoglobin','MCV':'mcv','White blood cells':'wbc','Platelets':'platelets','Ferritin':'ferritin','Vitamin D (25-OH)':'vitamin_d','Vitamin B12':'b12','Folate (serum)':'folate','Rubella IgG':'rubella_igg'};
const exp = {'FFF8CBAD':'high','FFBDD7EE':'low','00000000':'normal','FFFFFFFF':'normal'};
let ok=0, bad=[], unitMiss=new Set();
for (const r of data.rows) {
  const s = r.status.toLowerCase();
  const day = +(s.match(/day[- ]?(\d+)/)||[])[1] || null;
  const len = +(String(r.len).match(/^(\d+)/)||[])[1] || 28;
  const post = s.includes('postmenop');
  // pill / amenorrhoea / postpartum: compared with early follicular per sheet
  const phase = post ? 'post' : day ? M.phaseFromCycle(day, len) : 'early';
  for (const [col, code] of Object.entries(map)) {
    const v = r.vals[col]; if (v==null) continue;
    let unit = M.normalizeUnit(data.units[col], code);
    if (!unit) { unitMiss.add(code+':'+data.units[col]); continue; }
    const rg = M.standardRange(code, unit, {phase, age:r.age});
    const got = rg ? M.evaluate(v, rg[0], rg[1]).status : 'norange';
    const want = exp[r.flags[col]];
    if (got===want) ok++; else bad.push(`${r.id} ${code} ${v} ${unit} phase=${phase} range=${JSON.stringify(rg)} got=${got} want=${want}`);
  }
}
console.log('ok',ok,'bad',bad.length); console.log(bad.join('\n')); console.log('unit misses',[...unitMiss]);
// GG-33 is a known, intended difference: day 21 of a 35-day cycle is ovulation time, so GiGi uses the
// mid-cycle range and shows a "re-test on day 28" note instead of flagging low progesterone.
const unexpected = bad.filter((b) => !b.startsWith('GG-33 progesterone'));
if (unexpected.length) { console.error('Unexpected differences:', unexpected.length); process.exit(1); }
