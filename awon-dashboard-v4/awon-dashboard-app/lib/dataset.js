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

  const [res, won] = await Promise.all([
    odoo.readGroup('crm.lead', [...odoo.SCOPE, ...odoo.ksaRange('create_date', FIRST_MONTH + '-01', to)],
      ['total_weight:sum'], ['create_date:day', 'state_id', 'source_id', 'stage_id']),
    odoo.call('crm.lead', 'search_read', [[...odoo.SCOPE, ['stage_id.is_won', '=', true]]],
      { fields: ['partner_id', 'create_date', 'state_id', 'source_id', 'total_weight'], order: 'create_date asc' }),
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

  // New vs returning donors: a donor's first Won order ever is "new"; later ones are "returning".
  const seen = new Map();      // partner -> first-won month
  const dAgg = new Map();
  const cohortSize = new Map(), cohortActive = new Map();
  for (const o of won) {
    const pid = o.partner_id ? o.partner_id[0] : null;
    const date = new Date(new Date(o.create_date.replace(' ', 'T') + 'Z').getTime() + 3 * 3600e3).toISOString().slice(0, 10);
    const month = date.slice(0, 7);
    const isNew = pid ? !seen.has(pid) : true;
    if (pid && isNew) { seen.set(pid, month); cohortSize.set(month, (cohortSize.get(month) || 0) + 1); }
    if (pid) {
      const key = seen.get(pid) + '|' + month + '|' + pid;
      if (!cohortActive.has(key)) cohortActive.set(key, 1);
    }
    if (date < FIRST_MONTH + '-01') continue;
    const city = cityKey(stateName(o.state_id)) || 'unknown';
    const { group } = groupOf(o.source_id);
    const k = [date, city, group, isNew ? 1 : 0].join('|');
    const a = dAgg.get(k) || [date, city, group, isNew ? 1 : 0, 0, 0];
    a[4] += 1; a[5] = r2(a[5] + (o.total_weight || 0));
    dAgg.set(k, a);
  }
  // cohort matrix: [firstMonth, size, active donors in month +0, +1, +2 ...]
  const counts = new Map();
  for (const key of cohortActive.keys()) {
    const [c, m] = key.split('|');
    const off = (+m.slice(0, 4) - +c.slice(0, 4)) * 12 + (+m.slice(5, 7) - +c.slice(5, 7));
    const ck = c + '|' + off; counts.set(ck, (counts.get(ck) || 0) + 1);
  }
  const cohorts = [...cohortSize.entries()].filter(([c]) => c >= FIRST_MONTH).sort().map(([c, size]) => {
    const row = [c, size];
    for (let off = 0; ; off++) {
      const d = new Date(Date.UTC(+c.slice(0, 4), +c.slice(5, 7) - 1 + off, 1)).toISOString().slice(0, 7);
      if (d > to.slice(0, 7)) break;
      row.push(counts.get(c + '|' + off) || 0);
    }
    return row;
  });
  const history = [...seen.values()].sort()[0] || null;
  return {
    rows: [...agg.values()],
    donors: { rows: [...dAgg.values()], cohorts, historyFrom: history },
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
    withTimeout(odooPart(to), 40000, 'Odoo').catch(e => { notes.push(e.message); return cached ? { rows: cached.odoo.rows, donors: cached.data.donors, meta: { mode: 'cached', error: e.message } } : { rows: [], meta: { mode: 'error' } }; }),
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
