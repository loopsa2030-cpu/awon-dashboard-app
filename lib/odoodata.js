// Odoo aggregates: daily leads / pickups (Won) / kg by city-state and source, plus district heat.
const odoo = require('./odoo');
const { cityKey } = require('./cities');
const cache = new Map();

function stateName(s) { return s ? String(s[1]).replace(/\s*\(SA\)\s*$/, '') : ''; }

async function daily(from, to) {
  if (!odoo.configured()) {
    return { source: 'not configured', rows: [] };
  }
  const ck = `d|${from}|${to}`;
  const hit = cache.get(ck);
  if (hit && Date.now() - hit.at < 10 * 60 * 1000) return hit.value;
  const res = await odoo.readGroup('crm.lead', [...odoo.SCOPE, ...odoo.ksaRange('create_date', from, to)],
    ['total_weight:sum'], ['create_date:day', 'state_id', 'hubspot_source_name', 'stage_id']);
  const rows = res.map(g => {
    const utc = g.__range?.['create_date:day']?.from;
    const date = utc ? new Date(utc.replace(' ', 'T') + 'Z').getTime() + 3 * 3600e3 : null;
    return {
      date: date ? new Date(date).toISOString().slice(0, 10) : null,
      city: cityKey(stateName(g.state_id)), source: g.hubspot_source_name || '',
      won: !!(g.stage_id && /won/i.test(g.stage_id[1])), n: g.__count, kg: g.total_weight || 0,
    };
  }).filter(r => r.date);
  const value = { source: 'live', rows };
  cache.set(ck, { at: Date.now(), value });
  return value;
}

// District heat for the map tab.
async function heat(from, to) {
  if (!odoo.configured()) {
    throw new Error('Odoo is not configured (ODOO_LOGIN / ODOO_API_KEY).');
  }
  const ck = `h|${from}|${to}`;
  const hit = cache.get(ck);
  if (hit && Date.now() - hit.at < 10 * 60 * 1000) return hit.value;
  const dom = [...odoo.SCOPE, ...odoo.ksaRange('create_date', from, to)];
  const [all, won] = await Promise.all([
    odoo.readGroup('crm.lead', dom, ['total_weight:sum'], ['city_id']),
    odoo.readGroup('crm.lead', [...dom, ['stage_id.is_won', '=', true]], ['total_weight:sum'], ['city_id']),
  ]);
  const wonBy = Object.fromEntries(won.map(g => [(g.city_id || [0])[0], g]));
  const ids = all.map(g => (g.city_id || [0])[0]).filter(Boolean);
  const meta = ids.length ? await odoo.call('res.city', 'read', [ids, ['name', 'english_name', 'state_id']]) : [];
  const districts = Object.fromEntries(meta.map(c => [c.id, [c.name, c.english_name || '', stateName(c.state_id)]]));
  const rows = all.map(g => {
    const id = (g.city_id || [0])[0];
    return { id, orders: g.__count, pickups: wonBy[id]?.__count || 0, kg: g.total_weight || 0 };
  });
  const value = { source: 'live', granularity: 'day', districts, rows };
  cache.set(ck, { at: Date.now(), value });
  return value;
}

module.exports = { daily, heat };
