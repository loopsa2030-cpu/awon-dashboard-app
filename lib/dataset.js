// Builds one compact, all-time dataset (sheets + forecast + Odoo daily + ad spend) that the browser
// filters locally. Cached in memory and at Vercel's CDN, refreshed in the background.
const { loadMonths, FIRST_MONTH } = require('./sheetsdata');
const odoo = require('./odoo');
const { cityKey } = require('./cities');
const ads = require('./ads');
const history = require('./history');

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
const FAVOURITES = [
  [/^paid sources$/i, 'paid'],
  [/^awon retention\s+leads & sources$/i, 'wa'],
  [/^awon organic leads & sources$/i, 'organic'],
  [/affil|onground/i, 'organic'],
];
async function favouriteGroups() {
  const f = await odoo.call('ir.filters', 'search_read', [[['model_id', '=', 'crm.lead']]], { fields: ['name', 'domain'] });
  const map = {}, used = [];
  for (const { name, domain } of f) {
    const hit = FAVOURITES.find(([re]) => re.test(String(name).trim()));
    if (!hit) continue;
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
    const { group, platform } = groupOf(g.source_id);
    const wonFlag = g.stage_id && /won/i.test(g.stage_id[1]) ? 1 : 0;
    const k = [date, city, group, platform, wonFlag].join('|');
    const a = agg.get(k) || [date, city, group, platform, wonFlag, 0, 0];
    a[5] += g.__count; a[6] = r2(a[6] + (g.total_weight || 0));
    agg.set(k, a);
  }
  const unassignedCounts = new Map(unassigned);     // counted per group-by bucket, used only for the warning list

  // New vs returning donors, matched by phone: a phone's first-ever received donation (Odoo + old customer data)
  // decides when it became a donor. The browser only receives anonymous indexes, never phone numbers.
  let hist = new Map(), histNote = null;
  // History is cached for 6 h; if the first load is slow, carry on without it this time and pick it up next refresh.
  const hp = history.load();
  try { hist = await Promise.race([hp, new Promise((_, rej) => setTimeout(() => rej(new Error('still loading, will apply on the next refresh')), 20000))]); }
  catch (e) { histNote = 'Customer history sheet: ' + e.message; hp.catch(() => {}); }
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
  return {
    rows: [...agg.values()],
    donors: { base: FIRST_MONTH + '-01', rows: donorRows, historyPhones: hist.size, note: histNote },
    meta: { mode: 'live', favourites: fav.used, unassigned: [...unassignedCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15).map(x => x[0]) },
  };
}

async function adsPart(to, previous) {
  if (!ads.configured()) return { platforms: {}, meta: { mode: 'not configured', errors: ['SUPERMETRICS_API_KEY is not set.'] } };
  const r = await ads.dailySpend(FIRST_MONTH + '-01', to);
  const platforms = {};
  const errors = [...(r.errors || [])];
  for (const [p, list] of Object.entries(r.platforms)) {
    if (!list.length && previous && previous.platforms[p] && previous.platforms[p].length) { platforms[p] = previous.platforms[p]; continue; }   // keep last good data if a platform fails
    platforms[p] = list;
  }
  return { platforms, meta: { mode: 'live', errors } };
}

async function build() {
  const to = todayKSA();
  const notes = [];
  const [sh, od, ad] = await Promise.all([
    sheetsPart(to),
    withTimeout(odooPart(to), 55000, 'Odoo').catch(e => { notes.push(e.message); return cached ? { rows: cached.odoo.rows, donors: cached.data.donors, meta: { mode: 'cached', error: e.message } } : { rows: [], meta: { mode: 'error' } }; }),
    withTimeout(adsPart(to, cached && cached.ads), 45000, 'Supermetrics').catch(e => { notes.push(e.message); return cached ? { platforms: cached.ads.platforms, meta: { mode: 'cached', errors: [e.message] } } : { platforms: {}, meta: { mode: 'error', errors: [e.message] } }; }),
  ]);
  return {
    generatedAt: new Date().toISOString(), firstMonth: FIRST_MONTH,
    months: sh.months, odoo: { rows: od.rows }, donors: od.donors || { rows: [], cohorts: [] }, ads: { platforms: ad.platforms },
    sources: { sheets: sh.meta, odoo: od.meta, ads: { mode: ad.meta.mode, errors: ad.meta.errors } },
    notes: [...sh.notes, ...notes],
  };
}

// Returns cached data immediately when available; refreshes in the background once it is older than TTL.
async function get({ waitUntil } = {}) {
  const fresh = cached && Date.now() - cached._at < TTL;
  if (fresh) return cached.data;
  if (!building) building = build().then(d => { cached = { data: d, _at: Date.now() }; cached.odoo = d.odoo; cached.ads = d.ads; return d; }).finally(() => { building = null; });
  if (cached) { if (waitUntil) waitUntil(building.catch(() => {})); return cached.data; }
  return building;
}

module.exports = { get };
