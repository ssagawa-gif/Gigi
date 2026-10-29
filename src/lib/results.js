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
