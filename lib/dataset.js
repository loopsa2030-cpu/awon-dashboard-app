// Builds one compact, all-time dataset (sheets + forecast + Odoo daily + ad spend) that the browser
// filters locally. Cached in memory and at Vercel's CDN, refreshed in the background.
const { loadMonths, FIRST_MONTH } = require('./sheetsdata');
const odoo = require('./odoo');
const { cityKey } = require('./cities');
const ads = require('./ads');

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

async function odooPart(to) {
  if (!odoo.configured()) return { rows: [], meta: { mode: 'not configured' } };
  const res = await odoo.readGroup('crm.lead', [...odoo.SCOPE, ...odoo.ksaRange('create_date', FIRST_MONTH + '-01', to)],
    ['total_weight:sum'], ['create_date:day', 'state_id', 'hubspot_source_name', 'stage_id']);
  const agg = new Map();
  for (const g of res) {
    const utc = g.__range && g.__range['create_date:day'] && g.__range['create_date:day'].from;
    if (!utc) continue;
    const date = new Date(new Date(utc.replace(' ', 'T') + 'Z').getTime() + 3 * 3600e3).toISOString().slice(0, 10);
    const city = cityKey(stateName(g.state_id)) || 'unknown';
    const { group, platform } = odoo.classify(g.hubspot_source_name);
    const won = g.stage_id && /won/i.test(g.stage_id[1]) ? 1 : 0;
    const k = [date, city, group, platform, won].join('|');
    const a = agg.get(k) || [date, city, group, platform, won, 0, 0];
    a[5] += g.__count; a[6] = r2(a[6] + (g.total_weight || 0));
    agg.set(k, a);
  }
  return { rows: [...agg.values()], meta: { mode: 'live' } };
}

async function adsPart(to, previous) {
  if (!ads.configured()) return { platforms: {}, meta: { mode: 'not configured', errors: ['SUPERMETRICS_API_KEY is not set.'] } };
  const r = await ads.dailySpend(FIRST_MONTH + '-01', to);
  const platforms = {};
  const errors = [...(r.errors || [])];
  for (const [p, list] of Object.entries(r.platforms)) {
    if (!list.length && previous && previous.platforms[p] && previous.platforms[p].length) { platforms[p] = previous.platforms[p]; continue; }
    platforms[p] = list.map(x => [x.date, r2(x.spend), x.platformLeads]);
  }
  return { platforms, meta: { mode: 'live', errors } };
}

async function build() {
  const to = todayKSA();
  const notes = [];
  const [sh, od, ad] = await Promise.all([
    sheetsPart(to),
    withTimeout(odooPart(to), 40000, 'Odoo').catch(e => { notes.push(e.message); return cached ? { rows: cached.odoo.rows, meta: { mode: 'cached', error: e.message } } : { rows: [], meta: { mode: 'error' } }; }),
    withTimeout(adsPart(to, cached && cached.ads), 45000, 'Supermetrics').catch(e => { notes.push(e.message); return cached ? { platforms: cached.ads.platforms, meta: { mode: 'cached', errors: [e.message] } } : { platforms: {}, meta: { mode: 'error', errors: [e.message] } }; }),
  ]);
  return {
    generatedAt: new Date().toISOString(), firstMonth: FIRST_MONTH,
    months: sh.months, odoo: { rows: od.rows }, ads: { platforms: ad.platforms },
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
