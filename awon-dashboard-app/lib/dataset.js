// Builds one compact, all-time dataset (sheets + forecast + Odoo daily + ad spend) that the browser
// filters locally. Cached in memory and at Vercel's CDN, refreshed in the background.
const { loadMonths, FIRST_MONTH } = require('./sheetsdata');
const odoo = require('./odoo');
const { cityKey } = require('./cities');
const ads = require('./ads');
const windsor = require('./windsor');
const history = require('./history');
const wadata = require('./wadata');
const snapshot = require('./snapshot');

const TTL = 10 * 60 * 1000;
let cached = null, building = null;
const todayKSA = () => new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 10);
const r2 = v => Math.round(v * 100) / 100;
const stateName = s => (s ? String(s[1]).replace(/\s*\(SA\)\s*$/, '') : '');
const withTimeout = (p, ms, label) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error(`${label} timed out`)), ms))]);

async function sheetsPart(to) {
  const s = await loadMonths(FIRST_MONTH + '-01', to);
  const months = {};
  for (const [k, m] of Object.entries(s.months)) {
    months[k] = {
      dailyTab: m.dailyTab, forecastTab: m.forecastTab, forecast: m.forecast,
      rows: (m.rows || []).filter(r => r.reported).map(r => [r.date, r.city,
        r.paid ? r.paid.leads : 0, r2(r.paid ? r.paid.spend : 0), r.organic ? r.organic.leads : 0, r2(r.organic ? r.organic.spend : 0),
        r.wa ? r.wa.leads : 0, r2(r.wa ? r.wa.spend : 0), r.pickups, r2(r.weight)]),
    };
  }
  return { months, notes: s.notes || [], meta: { mode: 'live', mtdModified: s.mtdModified, forecastModified: s.forecastModified } };
}

// Source groups follow the Odoo favourites (ir.filters) so the team controls them in Odoo.
// Listed in priority order: the team's current favourites first, the older March ones only fill gaps.
const FAVOURITES = [
  [/^awon paid leads$/i, 'paid'],
  [/^awon retention leads$/i, 'wa'],
  [/^awon organic leads$/i, 'organic'],
  [/^awon (affil|onground)/i, 'organic'],
  [/^paid sources$/i, 'paid'],
  [/^awon retention\s+leads & sources$/i, 'wa'],
  [/^awon organic leads & sources$/i, 'organic'],
  [/affil|onground/i, 'organic'],
];
async function favouriteGroups() {
  const f = await odoo.call('ir.filters', 'search_read', [[['model_id', '=', 'crm.lead']]], { fields: ['name', 'domain'] });
  const map = {}, used = [];
  const rank = name => FAVOURITES.findIndex(([re]) => re.test(String(name).trim()));
  for (const { name, domain } of f.filter(x => rank(x.name) >= 0).sort((a, b) => rank(a.name) - rank(b.name))) {
    const hit = FAVOURITES[rank(name)];
    const m = String(domain).match(/source_id["']?\s*,\s*["']in["']\s*,\s*\[([\d,\s]*)\]/);
    if (!m) continue;
    used.push(name);
    for (const id of m[1].split(',').map(x => +x.trim()).filter(Boolean)) if (!(id in map)) map[id] = hit[1];
  }
  return { map, used };
}

async function odooPart(to) {
  if (!odoo.configured()) return { rows: [], donors: { rows: [], cohorts: [] }, meta: { mode: 'not configured' } };
  const fav = await favouriteGroups();
  const unassigned = new Map();
  const groupOf = (src) => {
    const id = src ? src[0] : null, name = src ? src[1] : '';
    const c = odoo.classify(name);
    if (/whatsapp.?paid|paid.?whatsapp/i.test(name)) return c;           // Meta click-to-WhatsApp is always Paid
    if (id && fav.map[id]) return { group: fav.map[id], platform: fav.map[id] === 'paid' ? c.platform : null };
    unassigned.set(name || '(no source)', (unassigned.get(name || '(no source)') || 0) + 1);
    return c;
  };

  history.load().catch(() => {});      // start fetching the history sheet in parallel
  const [res, won] = await Promise.all([
    odoo.readGroup('crm.lead', [...odoo.SCOPE, ...odoo.ksaRange('create_date', FIRST_MONTH + '-01', to)],
      ['total_weight:sum'], ['create_date:day', 'state_id', 'source_id', 'stage_id']),
    odoo.call('crm.lead', 'search_read', [[...odoo.SCOPE, ['stage_id.is_won', '=', true], ['delivery_status', '=', '6']]],
      { fields: ['phone', 'create_date', 'date_closed'] }),
  ]);

  const agg = new Map();
  for (const g of res) {
    const utc = g.__range && g.__range['create_date:day'] && g.__range['create_date:day'].from;
    if (!utc) continue;
    const date = new Date(new Date(utc.replace(' ', 'T') + 'Z').getTime() + 3 * 3600e3).toISOString().slice(0, 10);
    const city = cityKey(stateName(g.state_id)) || 'unknown';
    let { group, platform } = groupOf(g.source_id);
    if (group === 'organic') platform = odoo.organicPlatform(g.source_id ? g.source_id[1] : '');
    else if (group === 'wa') platform = null;
    const wonFlag = g.stage_id && /won/i.test(g.stage_id[1]) ? 1 : 0;
    const k = [date, city, group, platform, wonFlag].join('|');
    const a = agg.get(k) || [date, city, group, platform, wonFlag, 0, 0];
    a[5] += g.__count; a[6] = r2(a[6] + (g.total_weight || 0));
    agg.set(k, a);
  }
  const unassignedCounts = new Map(unassigned);     // counted per group-by bucket, used only for the warning list

  // New vs returning donors, matched by phone: a phone's first-ever received donation (Odoo + old customer data)
  // decides when it became a donor. The browser only receives anonymous indexes, never phone numbers.
  // The history sheet is required: without it, every donor whose earlier donations are only in the old data
  // would count as new. So we wait for it (cached 6 h), and if it fails the donor split is marked unavailable
  // and the previous complete split is kept instead (see build()).
  let hist = null, histNote = null;
  try { hist = await withTimeout(history.load(), 120000, 'Customer history sheet'); }
  catch (e) { histNote = 'Customer history sheet: ' + e.message; }
  if (!hist || !hist.size) {
    return { rows: [...agg.values()], donors: { base: FIRST_MONTH + '-01', rows: [], historyPhones: 0, unavailable: true, note: histNote || 'Customer history sheet is empty' },
      meta: { mode: 'live', favourites: fav.used, unassigned: [...unassignedCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15).map(x => x[0]) } };
  }
  const base = Date.parse(FIRST_MONTH + '-01T00:00:00Z');
  const dayIdx = iso => Math.round((Date.parse(iso + 'T00:00:00Z') - base) / 864e5);
  const firstSeen = new Map(hist);
  const orders = [];
  for (const o of won) {
    const ph = history.normPhone(o.phone);
    const when = (o.date_closed || o.create_date || '').replace(' ', 'T');
    if (!ph || !when) continue;
    const date = new Date(new Date(when + 'Z').getTime() + 3 * 3600e3).toISOString().slice(0, 10);
    const cur = firstSeen.get(ph); if (!cur || date < cur) firstSeen.set(ph, date);
    if (date >= FIRST_MONTH + '-01') orders.push([date, ph]);
  }
  const idx = new Map(); const donorRows = [];
  for (const [date, ph] of orders) {
    if (!idx.has(ph)) idx.set(ph, idx.size);
    donorRows.push([dayIdx(date), idx.get(ph), dayIdx(firstSeen.get(ph))]);
  }
  // Check line in the logs (counts only): this month's new vs returning, with the history sheet and with Odoo alone
  try {
    const m0 = todayKSA().slice(0, 7) + '-01', odooFirst = new Map();
    for (const o of won) { const ph = history.normPhone(o.phone); const when = (o.date_closed || o.create_date || '').replace(' ', 'T'); if (!ph || !when) continue;
      const date = new Date(new Date(when + 'Z').getTime() + 3 * 3600e3).toISOString().slice(0, 10); const c = odooFirst.get(ph); if (!c || date < c) odooFirst.set(ph, date); }
    const month = new Set(orders.filter(([d]) => d >= m0).map(([, ph]) => ph));
    let nH = 0, nO = 0; for (const ph of month) { if (firstSeen.get(ph) >= m0) nH++; if (odooFirst.get(ph) >= m0) nO++; }
    console.log('donors check ' + JSON.stringify({ month: m0.slice(0, 7), donors: month.size, newWithHistory: nH, newOdooOnly: nO, historyPhones: hist.size }));
  } catch (e) { console.error('donors check failed', e.message); }
  return {
    rows: [...agg.values()],
    donors: { base: FIRST_MONTH + '-01', rows: donorRows, historyPhones: hist.size, note: null },
    meta: { mode: 'live', favourites: fav.used, unassigned: [...unassignedCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15).map(x => x[0]) },
  };
}

// Ad data: past days don't change, so after the first full load only the last ADS_WINDOW_DAYS are asked for,
// at most once an hour, and merged into the saved rows. This keeps Supermetrics row usage small.
const ADS_EVERY = 60 * 60 * 1000, ADS_WINDOW_DAYS = 7;
const addDays = (iso, n) => { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
function platformsFrom(camps) {
  const out = {};
  for (const [p, rows] of Object.entries(camps)) {
    const byDate = new Map();
    for (const [d, , lg, sp, ld] of rows || []) { const a = byDate.get(d) || [d, 0, 0, 0]; if (lg) { a[1] += sp; a[3] += ld; } else a[2] += sp; byDate.set(d, a); }
    out[p] = [...byDate.values()].sort((x, y) => (x[0] < y[0] ? -1 : 1)).map(a => [a[0], r2(a[1]), r2(a[2]), Math.round(a[3])]);
  }
  return out;
}
// Provider: Windsor.ai when WINDSOR_API_KEY is set (ADS_PROVIDER=supermetrics switches back), otherwise Supermetrics.
function provider() {
  if (process.env.ADS_PROVIDER === 'supermetrics') return { name: 'supermetrics', mod: ads };
  if (windsor.configured()) return { name: 'windsor', mod: windsor };
  return { name: 'supermetrics', mod: ads };
}
// Log line comparing two sets of rows on the days both have (counts and sums only)
function compareLog(label, a, b) {
  try {
    const out = {};
    for (const p of Object.keys(ads.PLATFORMS)) {
      const A = (a.camps[p] || []), B = (b.camps[p] || []);
      const days = new Set(A.map(x => x[0])); const both = new Set(B.map(x => x[0]).filter(d => days.has(d)));
      const sum = (rows, i) => r2(rows.filter(x => both.has(x[0])).reduce((t, x) => t + (Number(x[i]) || 0), 0));
      out[p] = { days: both.size, spend: [sum(A, 3), sum(B, 3)], native: [sum(A, 4), sum(B, 4)], clicks: [sum(A, 5), sum(B, 5)] };
    }
    const gd = new Set((a.ga || []).map(x => x[0])); const gboth = new Set((b.ga || []).map(x => x[0]).filter(d => gd.has(d)));
    const gs = rows => (rows || []).filter(x => gboth.has(x[0])).reduce((t, x) => t + x[4], 0);
    out.ga4 = { days: gboth.size, sessions: [gs(a.ga), gs(b.ga)] };
    console.log(label + ' ' + JSON.stringify(out));
  } catch (e) { console.error('compare failed', e.message); }
}
async function adsPart(to, previous) {
  const pv = provider();
  if (!pv.mod.configured()) return { platforms: {}, camps: {}, ga: [], meta: { mode: 'not configured', errors: [pv.name + ' is not configured.'] } };
  let prev = previous && previous.camps && Object.values(previous.camps).some(v => v && v.length) ? previous : null;
  const switching = prev && (prev.source || 'supermetrics') !== pv.name;
  if (prev && !switching && prev.fetchedAt && Date.now() - prev.fetchedAt < ADS_EVERY)
    return { platforms: prev.platforms, camps: prev.camps, ga: prev.ga || [], fetchedAt: prev.fetchedAt, source: prev.source, meta: { mode: 'live', errors: prev.errors || [] } };
  // First run on a new provider: load the full history from it, compare with what the old provider gave, then use it
  const from = prev && !switching ? addDays(to, -ADS_WINDOW_DAYS) : FIRST_MONTH + '-01';
  const r = await pv.mod.load(from, to);
  if (switching) { compareLog('ads compare ' + pv.name + ' vs ' + (prev.source || 'supermetrics') + ' [new, old]', r, prev); }
  const errors = [...(r.errors || [])];
  const failed = k => errors.some(e => e.startsWith(k + ':'));
  const camps = {};
  for (const p of Object.keys(ads.PLATFORMS)) {
    const fresh = (r.camps && r.camps[p]) || [];
    const old = (prev && prev.camps && prev.camps[p]) || [];
    if (failed(p) && !fresh.length) camps[p] = old;                       // keep the saved rows if this platform failed
    else camps[p] = [...old.filter(x => x[0] < from), ...fresh];
  }
  const oldGa = (prev && prev.ga) || [];
  const ga = failed('GA4') && !(r.ga || []).length ? oldGa : [...oldGa.filter(x => x[0] < from), ...(r.ga || [])];
  if (errors.length) console.error('ads: ' + errors.join(' | '));
  return { platforms: platformsFrom(camps), camps, ga, fetchedAt: Date.now(), source: pv.name, meta: { mode: 'live', errors, window: from } };
}

// Never replace a complete donor split with one built without the history sheet
function donorsOrPrevious(d) {
  if (d && !d.unavailable && d.historyPhones > 0) return d;
  const prev = cached && cached.data && cached.data.donors;
  if (prev && !prev.unavailable && prev.historyPhones > 0) return { ...prev, note: 'Kept from the previous refresh: ' + ((d && d.note) || 'history not loaded') };
  return d || { base: FIRST_MONTH + '-01', rows: [], historyPhones: 0, unavailable: true, note: 'Donor history not loaded yet' };
}
async function build() {
  const to = todayKSA();
  const notes = [];
  const t0 = Date.now(), took = {};
  const timed = (k, p) => p.then(v => { took[k] = Date.now() - t0; return v; }, e => { took[k] = Date.now() - t0; throw e; });
  const [sh, wa, od, ad] = await Promise.all([   // same order as the list below
    timed('sheets', sheetsPart(to)),
    timed('wa', withTimeout(wadata.load(), 60000, 'WhatsApp report')).catch(e => { notes.push('WhatsApp report: ' + e.message); return cached && cached.data.waReport ? { rows: cached.data.waReport.rows, meta: { mode: 'cached', error: e.message } } : { rows: [], meta: { mode: 'error', error: e.message } }; }),
    timed('odoo', withTimeout(odooPart(to), 200000, 'Odoo')).catch(e => { notes.push('Odoo: ' + e.message); return cached ? { rows: cached.odoo.rows, donors: cached.data.donors, meta: { mode: 'cached', error: e.message } } : { rows: [], meta: { mode: 'error', error: e.message } }; }),
    timed('ads', withTimeout(adsPart(to, cached && cached.ads), 240000, 'Ad data')).catch(e => { notes.push(e.message); return cached ? { platforms: cached.ads.platforms, camps: cached.ads.camps || {}, ga: cached.ads.ga || [], fetchedAt: cached.ads.fetchedAt, source: cached.ads.source, meta: { mode: 'cached', errors: [e.message] } } : { platforms: {}, camps: {}, ga: [], meta: { mode: 'error', errors: [e.message] } }; }),
  ]);
  const out = {
    generatedAt: new Date().toISOString(), firstMonth: FIRST_MONTH,
    months: sh.months, odoo: { rows: od.rows }, donors: donorsOrPrevious(od.donors), ads: { platforms: ad.platforms, camps: ad.camps || {}, ga: ad.ga || [], fetchedAt: ad.fetchedAt || null, source: ad.source || null, errors: (ad.meta && ad.meta.errors) || [] },
    waReport: { rows: wa.rows },
    sources: { sheets: sh.meta, odoo: od.meta, ads: { mode: ad.meta.mode, errors: ad.meta.errors }, waReport: wa.meta },
    notes: [...sh.notes, ...notes],
  };
  try { logBuild(out, took, Date.now() - t0); } catch (e) { console.error('log failed', e.message); }
  try { logRecon(out, to); } catch (e) { console.error('recon failed', e.message); }
  return out;
}
// Current month, per day: Daily sheet leads vs Odoo leads for each group [sheetPaid, odooPaid, sheetOrg, odooOrg, sheetWa, odooWa] (counts only)
function logRecon(d, to) {
  const m = d.months && d.months[to.slice(0, 7)]; if (!m) return;
  const day = {}; const g = k => day[k] || (day[k] = [0, 0, 0, 0, 0, 0]);
  for (const r of m.rows || []) { const x = g(r[0]); x[0] += r[2]; x[2] += r[4]; x[4] += r[6]; }
  for (const r of (d.odoo && d.odoo.rows) || []) { if (r[0].slice(0, 7) !== to.slice(0, 7)) continue; const x = g(r[0]); const i = { paid: 1, organic: 3, wa: 5 }[r[2]]; if (i) x[i] += r[5]; }
  console.log('recon ' + JSON.stringify(Object.keys(day).sort().map(k => [k.slice(8), ...day[k]])));
}
// One summary line per build in the Vercel logs (counts and errors only, no customer data)
function logBuild(d, took, ms) {
  const n = v => (Array.isArray(v) ? v.length : typeof v);
  const src = d.sources || {}, ads = d.ads || {};
  const camps = Object.fromEntries(Object.entries(ads.camps || {}).map(([k, v]) => [k, n(v)]));
  console.log('dataset build ' + JSON.stringify({ ms, took,
    odoo: { mode: src.odoo && src.odoo.mode, error: src.odoo && src.odoo.error, rows: n(d.odoo && d.odoo.rows) },
    ads: { mode: src.ads && src.ads.mode, camps, ga: n(ads.ga), errors: src.ads && src.ads.errors },
    wa: { mode: src.waReport && src.waReport.mode, rows: n(d.waReport && d.waReport.rows), error: src.waReport && src.waReport.error },
    months: Object.keys(d.months || {}).length, notes: d.notes }));
}

// Returns cached data immediately when available; refreshes in the background once it is older than TTL.
// A new server instance starts from the last snapshot in Blob storage instead of rebuilding everything first.
let snapLoad = null;
function startBuild(waitUntil) {
  if (building) return building;
  building = build().then(d => {
    const degraded = ['odoo', 'ads'].some(k => d.sources[k] && d.sources[k].mode === 'error') || !d.donors || d.donors.unavailable || !(d.donors.historyPhones > 0);
    cached = { data: d, _at: degraded ? Date.now() - TTL + 60000 : Date.now() };   // a failed source retries after 1 min instead of 10
    cached.odoo = d.odoo; cached.ads = d.ads;
    if (!degraded) {
      const p = snapshot.save(d).then(n => console.log('snapshot saved ' + n + ' bytes')).catch(e => console.error('snapshot save failed', e.message));
      if (waitUntil) waitUntil(p);
    }
    return d;
  }).catch(e => { console.error('dataset build failed: ' + e.message); throw e; }).finally(() => { building = null; });
  return building;
}
async function get({ waitUntil } = {}) {
  if (!cached && snapshot.configured()) {
    if (!snapLoad) snapLoad = withTimeout(snapshot.load(), 10000, 'Snapshot').catch(e => { console.error('snapshot load failed', e.message); return null; });
    const d = await snapLoad;
    if (d && !cached && d.donors && d.donors.historyPhones > 0) {
      cached = { data: d, _at: Date.parse(d.generatedAt) || 0, fromSnapshot: true };
      cached.odoo = d.odoo; cached.ads = d.ads;
    }
  }
  const fresh = cached && Date.now() - cached._at < TTL;
  if (fresh) return cached.data;
  const p = startBuild(waitUntil);
  if (cached) { if (waitUntil) waitUntil(p.catch(() => {})); return cached.data; }
  return p;
}

module.exports = { get };
