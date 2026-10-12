// WhatsApp campaign report (Awon WA - Performance Report): one row per day per city with
// Spend, Sent, Delivered, Seen, Leads. The date is written once per day (first city row) and carried down.
// Every tab with that header is read, so new monthly tabs are picked up automatically.
const XLSX = require('xlsx');
const google = require('./google');
const { cityKey } = require('./cities');

const num = v => { if (v == null || v === '') return null; const n = Number(String(v).replace(/[^0-9.\-]/g, '')); return isFinite(n) ? n : null; };
const iso = d => d.toISOString().slice(0, 10);

function parseDate(v) {
  if (v instanceof Date && !isNaN(v)) return iso(new Date(Date.UTC(v.getFullYear(), v.getMonth(), v.getDate())));
  if (typeof v === 'number' && v > 30000) return iso(new Date(Date.UTC(1899, 11, 30) + v * 864e5));
  const m = String(v || '').trim().match(/^(\d{1,4})[\/\-.](\d{1,2})[\/\-.](\d{1,4})$/);
  if (!m) return null;
  let [a, b, c] = m.slice(1).map(Number), y, mo, d;
  if (a > 31) { y = a; mo = b; d = c; }                // 2026-10-01
  else { y = c < 100 ? 2000 + c : c; if (a > 12) { d = a; mo = b; } else { mo = a; d = b; } }   // sheet writes month first (10-13-2026)
  if (!(mo >= 1 && mo <= 12 && d >= 1 && d <= 31)) return null;
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function parseTab(ws) {
  const grid = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null });
  const hi = grid.findIndex(r => r && r.some(c => /^city$/i.test(String(c || '').trim())) && r.some(c => /^sent$/i.test(String(c || '').trim())));
  if (hi < 0) return null;
  const h = grid[hi].map(c => String(c || '').trim().toLowerCase());
  const col = re => h.findIndex(x => re.test(x));
  const C = { date: col(/^date$/), city: col(/^city$/), spend: col(/^spend|cost/), sent: col(/^sent$/), delivered: col(/^deliver/), seen: col(/^seen|^read/), leads: col(/^leads?$/) };
  const rows = [];
  let date = null;
  for (const r of grid.slice(hi + 1)) {
    if (!r) continue;
    const d = C.date >= 0 ? parseDate(r[C.date]) : null;
    if (d) date = d;
    const city = cityKey(r[C.city]);
    if (!date || !city) continue;
    const v = ['spend', 'sent', 'delivered', 'seen', 'leads'].map(k => (C[k] >= 0 ? num(r[C[k]]) : null));
    if (v.every(x => x == null)) continue;            // not filled yet
    rows.push([date, city, ...v.map(x => x || 0)]);
  }
  return rows;
}

// rows: [date, city, spend, sent, delivered, seen, leads]
async function load() {
  const wb = await google.workbook('wa');
  const tabs = wb.read(wb.sheetNames);
  const rows = [], used = [];
  for (const name of wb.sheetNames) {
    const r = parseTab(tabs[name]);
    if (r) { rows.push(...r); used.push(name); }
  }
  rows.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  return { rows, meta: { mode: 'live', file: wb.fileName, tabs: used, modified: wb.modified } };
}

module.exports = { load, _parseTab: parseTab, _parseDate: parseDate };
