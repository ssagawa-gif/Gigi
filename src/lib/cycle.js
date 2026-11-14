// Period log → cycle day today, next period and the best days for hormone tests.
// Uses only rules already in GiGi: early follicular = cycle days 2–5 (phase label), and
// progesterone about 7 days before the next period (progesteroneTiming in markers.js).
const DAY = 864e5;
const toDate = (iso) => new Date(iso + 'T12:00:00');
export const isoOf = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const addDays = (d, n) => new Date(d.getTime() + n * DAY);

/** Average gap between logged period starts (21–45 days only), else the fallback. */
export function avgCycle(starts = [], fallback = 28) {
  const s = [...starts].sort().reverse();
  const gaps = [];
  for (let i = 0; i + 1 < s.length; i++) {
    const g = Math.round((toDate(s[i]) - toDate(s[i + 1])) / DAY);
    if (g >= 21 && g <= 45) gaps.push(g);
  }
  return gaps.length ? Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length) : (Number(fallback) || 28);
}

/** Cycle day on a date from the last period start before it (null if none in the last 60 days). */
export function cycleDayOn(starts = [], dateIso) {
  if (!dateIso) return null;
  const d = toDate(dateIso);
  const last = [...starts].sort().reverse().find((s) => toDate(s) <= d);
  if (!last) return null;
  const n = Math.round((d - toDate(last)) / DAY) + 1;
  return n >= 1 && n <= 60 ? n : null;
}

/** Plan for today: cycle day, expected next period, best window for baseline hormones, best progesterone day. */
export function cyclePlan(starts = [], fallbackLength = 28, today = new Date()) {
  const s = [...starts].sort().reverse();
  if (!s.length) return null;
  const length = avgCycle(s, fallbackLength);
  const t0 = toDate(isoOf(today));
  let start = toDate(s[0]);
  let day = Math.round((t0 - start) / DAY) + 1;
  if (day < 1 || day > 60) return { length, stale: true };
  let next = addDays(start, length);
  // baseline window: days 2–5 of this cycle if still ahead, otherwise of the next one
  let from = addDays(start, 1), to = addDays(start, 4);
  if (to < t0) { from = addDays(next, 1); to = addDays(next, 4); }
  else if (from < t0) from = t0;
  // progesterone: about 7 days before the next period; if that has passed, the next cycle's
  let prog = addDays(next, -7);
  if (prog < t0) prog = addDays(next, length - 7);
  const late = next < t0;
  return { length, day, next: isoOf(next), late, baseline: [isoOf(from), isoOf(to)], progesterone: isoOf(prog) };
}

/** Keep the log tidy: newest first, no duplicates, at most 12. */
export const addStart = (starts = [], iso) => [...new Set([iso, ...starts])].sort().reverse().slice(0, 12);
