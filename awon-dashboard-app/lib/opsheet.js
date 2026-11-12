// Operations sheet: one row per driver per day (tab "Daily by driver"), filled every night at 9 PM Saudi time for the
// whole month so far by a scheduled Claude task that syncs order counts from Odoo. Weight (column I) is entered by the
// logistics team only; an empty weight reaches the dashboard as null (not entered yet), never as 0.
const google = require('./google');

const SHEET_ID = process.env.OPS_SHEET_ID || '1mPFoXmpeOdS4jxhKebev9y6XaZPtyLkuhTAwGt4EnAk';
const TAB = 'Daily by driver';
const HEADER = ['Date', 'Driver', 'City', 'Orders', 'Received', 'Cancelled', 'No answer', 'Postponed', 'Weight (kg)', 'Written from Odoo at'];
const CITY_NAME = { riyadh: 'Riyadh', jeddah: 'Jeddah', mecca: 'Makkah', taif: 'Taif', madina: 'Madinah', sharqia: 'Eastern Province', asir: 'Asir', qassim: 'Qassim', yanbu: 'Yanbu', kharj: 'Al Kharj', hail: 'Hail' };
const CITY_KEY = Object.fromEntries(Object.entries(CITY_NAME).map(([k, v]) => [v.toLowerCase(), k]));
const ORDER = ['riyadh', 'jeddah', 'mecca', 'taif', 'madina', 'sharqia', 'asir', 'qassim', 'yanbu', 'kharj', 'hail'];

// Odoo rows -> one record per driver for the day (archived orders count only as cancelled / no answer)
function perDriver(o, day) {
  const by = {};
  for (const [d, drv, city, st, act, n, kg] of o.rows) {
    if (d !== day || (!act && st !== '4' && st !== '5')) continue;
    const r = by[drv] || (by[drv] = { orders: 0, rec: 0, can: 0, na: 0, post: 0, kg: 0, cities: {} });
    r.orders += n; r.cities[city] = (r.cities[city] || 0) + n;
    if (st === '6') { r.rec += n; r.kg += kg; } else if (st === '5') r.can += n; else if (st === '4') r.na += n; else if (st === '3') r.post += n;
  }
  return Object.entries(by).filter(([, r]) => r.orders > 0).map(([drv, r]) => {
    const city = Object.keys(r.cities).sort((a, b) => r.cities[b] - r.cities[a])[0];
    return { name: o.drivers[drv] || String(drv), city, ...r, kg: Math.round(r.kg * 10) / 10 };
  }).sort((a, b) => ((ORDER.indexOf(a.city) + 1) || 99) - ((ORDER.indexOf(b.city) + 1) || 99) || a.name.localeCompare(b.name));
}

const isoOf = v => {
  if (typeof v === 'number' && v > 40000 && v < 60000) return new Date(Date.UTC(1899, 11, 30) + v * 864e5).toISOString().slice(0, 10);
  const s = String(v || '').trim(); let m;
  if ((m = s.match(/^(\d{4})-(\d{2})-(\d{2})/))) return `${m[1]}-${m[2]}-${m[3]}`;
  if ((m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/))) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;   // day/month/year
  return null;
};
const n = v => { const x = Number(String(v == null ? '' : v).replace(/[, ]/g, '')); return Number.isFinite(x) ? x : 0; };

async function readAll() {
  const g = await google.values.get(SHEET_ID, `'${TAB}'!A2:J`);
  return g.map(r => ({ date: isoOf(r[0]), name: String(r[1] || '').trim(), city: CITY_KEY[String(r[2] || '').trim().toLowerCase()] || String(r[2] || '').trim().toLowerCase() || 'unknown',
    orders: n(r[3]), rec: n(r[4]), can: n(r[5]), na: n(r[6]), post: n(r[7]), kg: String(r[8] == null ? '' : r[8]).trim() === '' ? null : n(r[8]) })).filter(r => r.date && r.name);
}

// For the dashboard: the sheet's rows shaped like ds.ops ([date, driver, city, status, active, orders, kg])
const cache = { at: 0, v: null };
async function forDashboard() {
  if (cache.v && Date.now() - cache.at < 60 * 1000) return cache.v;
  const recs = await readAll();
  const drivers = {}, rows = [];
  for (const r of recs) {
    drivers[r.name] = r.name;
    const open = Math.max(0, r.orders - r.rec - r.can - r.na - r.post);
    if (r.rec) rows.push([r.date, r.name, r.city, '6', 1, r.rec, r.kg]);
    if (r.can) rows.push([r.date, r.name, r.city, '5', 1, r.can, 0]);
    if (r.na) rows.push([r.date, r.name, r.city, '4', 1, r.na, 0]);
    if (r.post) rows.push([r.date, r.name, r.city, '3', 1, r.post, 0]);
    if (open) rows.push([r.date, r.name, r.city, '2', 1, open, 0]);
  }
  const v = { mode: 'sheet', days: [...new Set(recs.map(r => r.date))].sort(), drivers, rows, fetchedAt: new Date().toISOString() };
  cache.at = Date.now(); cache.v = v;
  return v;
}

module.exports = { forDashboard, perDriver, SHEET_ID, TAB };
