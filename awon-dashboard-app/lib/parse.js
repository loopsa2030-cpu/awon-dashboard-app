// Pure parsers for the MTD workbook (Daily tab) and the Forecast workbook.
// They locate columns by header text, not fixed positions, because the
// monthly tabs drift (extra spaces, moved header rows, new/removed cities).
const XLSX = require('xlsx');
const { cityKey, norm } = require('./cities');

const MONTHS = ['january','february','march','april','may','june','july','august','september','october','november','december'];
const MON3 = MONTHS.map(m => m.slice(0, 3));

// ---------- tab discovery ----------
function tabMatches(name, { year, month, kind }) {
  const n = norm(name);
  if (!n.includes(String(year))) return false;
  if (n.includes('sutra') || n.includes('cash4') || n.includes('c4c') || n.includes('copy of') || n.includes('نسخة')) return false;
  const full = MONTHS[month - 1], short = MON3[month - 1];
  const hasMonth = new RegExp(`(^|[^a-z])(${full}|${short})([^a-z]|$)`).test(n);
  if (!hasMonth) return false;
  if (kind === 'daily') return n.includes('awon') && n.includes('daily');
  if (kind === 'mtd') return n.includes('awon') && n.includes('mtd');
  if (kind === 'forecast') return n.includes('awon') && n.includes('forecast');
  return false;
}
function findTab(sheetNames, spec) {
  const hits = sheetNames.filter(s => tabMatches(s, spec));
  // prefer names that start with the month/Awon (avoids e.g. "Mar Awon Feb 2026 Daily")
  hits.sort((a, b) => a.trim().length - b.trim().length);
  if (spec.kind === 'daily') {
    const exact = hits.filter(h => !/^(mar|ram)\s/i.test(h.trim()));
    if (exact.length) return exact[0];
  }
  return hits[0] || null;
}

// ---------- cell helpers ----------
function num(v) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (v instanceof Date) return null;
  const s = String(v).trim();
  if (!s || s.startsWith('#')) return null;           // #DIV/0!, #REF!
  const cleaned = s.replace(/[$,%\s]/g, '').replace(/,/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}
function toISO(v) {
  if (v instanceof Date) {
    const d = new Date(Date.UTC(v.getFullYear(), v.getMonth(), v.getDate()));
    return d.toISOString().slice(0, 10);
  }
  if (typeof v === 'number' && v > 40000 && v < 60000) {
    const d = XLSX.SSF.parse_date_code(v);
    return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
  }
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
  return null;
}
function grid(ws) {
  return XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null, blankrows: true });
}
const low = v => norm(v);

// ---------- Daily tab ----------
// Layout (Sept 2026): row with group headers "Paid Leads (Active)" / "Organic Leads (Active)" /
// "WA Leads (Active)" and a sub-header row with Target | Achieved | Difference | Spent | CPL.
// Right-hand block "Logistics & Main KPIs" has Pickups | CAC | Pickup Rate | Weight | CPK.
function parseDaily(ws) {
  const g = grid(ws);
  let hdr = -1;
  for (let r = 0; r < Math.min(g.length, 10); r++) {
    if ((g[r] || []).some(c => /^paid leads/.test(low(c)))) { hdr = r; break; }
  }
  if (hdr < 0) throw new Error('Daily tab: could not find "Paid Leads" header');
  const H = g[hdr], S = g[hdr + 1] || [], TOP = g[hdr - 1] || [];
  const groupCol = re => H.findIndex(c => re.test(low(c)));
  const blocks = {
    paid: groupCol(/^paid leads/),
    organic: groupCol(/^organic leads/),
    wa: groupCol(/^wa leads|^whatsapp leads/),
  };
  const sub = (start, re, span = 7) => {
    for (let c = start; c < start + span && c < S.length; c++) if (re.test(low(S[c]))) return c;
    return -1;
  };
  const cols = {};
  for (const [k, start] of Object.entries(blocks)) {
    if (start < 0) continue;
    cols[k] = { target: sub(start, /^target/), achieved: sub(start, /^achieved/), spent: sub(start, /^spent/) };
  }
  // Logistics & Main KPIs block ("Pickups" and "Weight" to the right of that title)
  let logStart = TOP.findIndex(c => /logistics & main kpis/.test(low(c)));
  if (logStart < 0) logStart = H.findIndex(c => low(c) === 'pickups');
  const findRight = re => { for (let c = Math.max(logStart, 0); c < H.length; c++) if (re.test(low(H[c]))) return c; return -1; };
  cols.pickups = findRight(/^pickups$/);
  cols.weight = findRight(/^weight$/);
  const cityCol = H.findIndex((c, i) => i > 0 && low(c) === 'city');
  const cCity = cityCol >= 0 ? cityCol : 1;

  const rows = [];
  let date = null;
  for (let r = hdr + 2; r < g.length; r++) {
    const row = g[r] || [];
    const d = toISO(row[0]);
    if (d) date = d;
    if (!date) continue;                      // monthly city totals above the first dated row
    const cityRaw = row[cCity];
    if (!cityRaw || typeof cityRaw !== 'string') continue;   // daily total rows
    const v = (c) => (c >= 0 ? num(row[c]) : null);
    const rec = { date, city: cityKey(cityRaw) };
    let any = false;
    for (const k of ['paid', 'organic', 'wa']) {
      if (!cols[k]) continue;
      const leads = v(cols[k].achieved), spend = v(cols[k].spent), target = v(cols[k].target);
      rec[k] = { leads: leads ?? 0, spend: spend ?? 0, target: target ?? 0 };
      if (leads || spend) any = true;
    }
    rec.pickups = v(cols.pickups) ?? 0;
    rec.weight = v(cols.weight) ?? 0;
    if (rec.pickups || rec.weight) any = true;
    rec.reported = any;
    rows.push(rec);
  }
  return rows;
}

// ---------- Forecast tab ----------
function parseForecast(ws) {
  const g = grid(ws);
  let hdr = -1;
  for (let r = 0; r < Math.min(g.length, 12); r++) {
    const row = (g[r] || []).map(low);
    if (row.includes('city') && row.some(c => /monthly budget/.test(c))) { hdr = r; break; }
  }
  if (hdr < 0) throw new Error('Forecast tab: header row with "City" + "Monthly budget" not found');
  const H = g[hdr].map(low);
  const col = (...res) => H.findIndex(c => res.some(re => re.test(c)));
  const C = {
    city: H.indexOf('city'),
    paidBudget: col(/^paid budget/), paidLeads: col(/^paid leads/),
    brandBudget: col(/^branding budget/), orgLeads: col(/^organic leads/),
    waBudget: col(/^wa budget/), waLeads: col(/^wa leads/),
    drivers: col(/^drivers/), days: col(/^days of op/),
    pickups: col(/^pickups ?\/ ?month/), avgKg: col(/^avg (kg|weight) ?\/ ?pickup/),
    weight: col(/^expected monthly weight/),
  };
  let daysInMonth = null;
  for (let r = 0; r < Math.min(g.length, 60) && daysInMonth === null; r++) {
    const row = g[r] || [];
    row.forEach((c, i) => { if (/^days in month/.test(low(c))) daysInMonth = num(row[i + 1]); });
  }
  const cities = [];
  for (let r = hdr + 1; r < g.length; r++) {
    const row = g[r] || [];
    const name = row[C.city];
    const first = low(row[0]);
    if (first.startsWith('total') || low(name).startsWith('/ blended')) break;
    if (!name || typeof name !== 'string') { if (cities.length) break; else continue; }
    const v = k => (C[k] >= 0 ? num(row[C[k]]) ?? 0 : 0);
    cities.push({
      city: cityKey(name),
      paid: { budget: v('paidBudget'), leads: v('paidLeads') },
      organic: { budget: v('brandBudget'), leads: v('orgLeads') },
      wa: { budget: v('waBudget'), leads: v('waLeads') },
      drivers: v('drivers'), opDays: v('days'),
      pickups: v('pickups'), avgKg: v('avgKg'), weight: v('weight'),
    });
  }
  // Marketing overhead: newer tabs carry a per-city table, older ones only a single total.
  let overhead = 0;
  for (let r = 0; r < g.length; r++) {
    const row = g[r] || [];
    const i = row.findIndex(c => /marketing overhead( costs?)?( \(awon share\))?$/.test(low(c)));
    if (i >= 0) {
      const v = row.slice(i + 1).map(num).filter(x => x !== null && x > 100)[0];
      if (v) { overhead = v; break; }
    }
  }
  let hdr2 = -1;
  for (let r = 0; r < g.length; r++) {
    const row = (g[r] || []).map(low);
    if (row.includes('city') && row.some(c => /^overhead carried/.test(c))) { hdr2 = r; break; }
  }
  if (hdr2 >= 0) {
    const H2 = g[hdr2].map(low);
    const cCity = H2.indexOf('city'), cOver = H2.findIndex(c => /^overhead carried/.test(c));
    const by = {};
    for (let r = hdr2 + 1; r < g.length; r++) {
      const row = g[r] || [], nm = row[cCity];
      if (!nm || typeof nm !== 'string') break;
      if (low(nm).startsWith('total')) break;
      by[cityKey(nm)] = num(row[cOver]) ?? 0;
    }
    const sum = Object.values(by).reduce((a, b) => a + b, 0);
    if (sum > 0) { cities.forEach(c => { c.overhead = by[c.city] ?? 0; }); overhead = overhead || sum; }
  }
  const direct = cities.reduce((a, c) => a + c.paid.budget + c.organic.budget + c.wa.budget, 0);
  cities.forEach(c => {
    if (c.overhead === undefined) {
      const share = direct ? (c.paid.budget + c.organic.budget + c.wa.budget) / direct : 0;
      c.overhead = overhead * share;
    }
  });
  return { cities, daysInMonth, overhead };
}

module.exports = { findTab, parseDaily, parseForecast, MONTHS, num, toISO };
