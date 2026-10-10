// Month loader: finds each month's Daily + Forecast tab (auto-detects new monthly tabs),
// parses them and returns normalised rows.
const { findTab, parseDaily, parseForecast } = require('./parse');
const google = require('./google');

const FIRST_MONTH = process.env.FIRST_MONTH || '2026-02';   // "All time" floor

function monthsBetween(from, to) {
  const out = [];
  let [y, m] = from.slice(0, 7).split('-').map(Number);
  const [ty, tm] = to.slice(0, 7).split('-').map(Number);
  while (y < ty || (y === ty && m <= tm)) { out.push({ year: y, month: m }); m++; if (m > 12) { m = 1; y++; } }
  return out;
}
const key = ({ year, month }) => `${year}-${String(month).padStart(2, '0')}`;

async function loadMonths(from, to) {
  if (!google.configured()) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON is not set.');
  const [mtd, fc] = await Promise.all([google.workbook('mtd'), google.workbook('forecast')]);
  const out = {};
  const notes = [];
  for (const spec of monthsBetween(from, to)) {
    const k = key(spec);
    const dTab = findTab(mtd.sheetNames, { ...spec, kind: 'daily' });
    const fTab = findTab(fc.sheetNames, { ...spec, kind: 'forecast' });
    const entry = { dailyTab: dTab, forecastTab: fTab, rows: [], forecast: null };
    try { if (dTab) entry.rows = parseDaily(mtd.read([dTab])[dTab]); else notes.push(`No Daily tab found for ${k}`); }
    catch (e) { notes.push(`${dTab}: ${e.message}`); }
    try { if (fTab) entry.forecast = parseForecast(fc.read([fTab])[fTab]); else notes.push(`No Forecast tab found for ${k}`); }
    catch (e) { notes.push(`${fTab}: ${e.message}`); }
    out[k] = entry;
  }
  return { source: 'live', mtdModified: mtd.modified, forecastModified: fc.modified, months: out, notes };
}

module.exports = { loadMonths, monthsBetween, FIRST_MONTH };
