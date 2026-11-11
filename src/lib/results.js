// Helpers over a list of results (any country, any unit).
export function byMarker(results) {
  const map = {};
  for (const r of results || []) (map[r.marker_code] ||= []).push(r);
  for (const k of Object.keys(map)) map[k].sort((a, b) => a.test_date.localeCompare(b.test_date));
  return map;
}
export function latestPerMarker(results) {
  return Object.values(byMarker(results)).map((list) => list[list.length - 1])
    .sort((a, b) => b.test_date.localeCompare(a.test_date));
}
export function testDates(results) {
  return [...new Set((results || []).map((r) => r.test_date))].sort().reverse();
}

/**
 * What she should do about one result, in four plain levels (Lexie's feedback):
 * 'fine' = all fine · 'doctor' = see your doctor, not urgent · 'days' = see a doctor in the next few days · 'today' = go today.
 */
export function actionLevel(r) {
  if (!r) return 'fine';
  if (r.context?.urgency === 'today') return 'today';
  if (r.context?.urgency === 'days') return 'days';
  if (r.context?.expected) return 'fine';
  return r.needs_review || r.status === 'low' || r.status === 'high' ? 'doctor' : 'fine';
}
const ORDER = { today: 3, days: 2, doctor: 1, fine: 0 };
/** The most urgent level across the latest result of every marker. */
export function overallAction(results) {
  return latestPerMarker(results).map(actionLevel).reduce((a, b) => (ORDER[b] > ORDER[a] ? b : a), 'fine');
}
export const actionRank = (lvl) => ORDER[lvl] ?? 0;

/** "2.4–12.6", "up to 34", "50 or more" (t = translator, f = number formatter). */
export function rangeText(low, high, t, f) {
  const has = (x) => x !== '' && x != null;
  if (has(low) && has(high)) return `${f(low)}–${f(high)}`;
  if (has(high)) return t('range.upTo', { n: f(high) });
  if (has(low)) return t('range.atLeast', { n: f(low) });
  return '';
}

/** "Cycle day 3 of 27 · Early follicular" for hormones read by cycle phase. */
export function cycleText(ctx, t) {
  if (!ctx) return '';
  const bits = [];
  if (ctx.menopause) bits.push(t('phase.post'));
  else {
    if (ctx.cycle_day) bits.push(ctx.cycle_length ? t('cycle.dayOf', { day: ctx.cycle_day, length: ctx.cycle_length }) : t('cycle.dayN', { day: ctx.cycle_day }));
    if (ctx.phase) bits.push(t('phase.' + ctx.phase));
  }
  return bits.join(' · ');
}
