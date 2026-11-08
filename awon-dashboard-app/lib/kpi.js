// Spend quality / partners / initiatives / team: raw Odoo rows by day and UTM source (source_id).
// Everything is computed in the browser (public/kpi.js) with the settings saved in api/settings.js.
// valid lead  = active crm.lead in Awon scope (lost / archived records are not returned by Odoo by default)
// received    = delivery_status '6'; kg counts received orders only and is dated by date_deadline (scheduled pickup)
const odoo = require('./odoo');
const cache = new Map();

const day = g => { const f = g.__range && Object.values(g.__range)[0] && Object.values(g.__range)[0].from; return !f ? null : f.length === 10 ? f : new Date(new Date(f.replace(' ', 'T') + 'Z').getTime() + 3 * 3600e3).toISOString().slice(0, 10); };
const src = g => (g.source_id ? [g.source_id[0], String(g.source_id[1])] : [0, '']);

async function build(from, to) {
  if (!odoo.configured()) return { mode: 'not configured', sources: [], leads: [], recv: [], cohort: [] };
  const ck = from + '|' + to;
  const hit = cache.get(ck);
  if (hit && Date.now() - hit.at < 10 * 60 * 1000) return hit.v;
  const created = odoo.ksaRange('create_date', from, to);
  const deadline = [['date_deadline', '>=', from], ['date_deadline', '<=', to]];
  const done = [['delivery_status', '=', '6']];
  const [leads, recv, cohort] = await Promise.all([
    odoo.readGroup('crm.lead', [...odoo.SCOPE, ...created], ['total_weight:sum'], ['create_date:day', 'source_id']),
    odoo.readGroup('crm.lead', [...odoo.SCOPE, ...deadline, ...done], ['total_weight:sum'], ['date_deadline:day', 'source_id']),
    odoo.readGroup('crm.lead', [...odoo.SCOPE, ...created, ...done], ['total_weight:sum'], ['create_date:day', 'source_id']),
  ]);
  const names = {};
  const rows = (gs, withKg) => gs.map(g => { const d = day(g), [id, n] = src(g); if (id) names[id] = n; return d ? (withKg ? [d, id, g.__count, Math.round((g.total_weight || 0) * 10) / 10] : [d, id, g.__count]) : null; }).filter(Boolean);
  const v = {
    mode: 'live', from, to,
    leads: rows(leads, false),          // [date, source_id, valid leads created that day]
    recv: rows(recv, true),             // [date, source_id, received orders, kg] by scheduled pickup date
    cohort: rows(cohort, false),        // [date, source_id, received orders from the leads created that day]
  };
  v.sources = Object.entries(names).map(([id, name]) => [Number(id), name]);
  cache.set(ck, { at: Date.now(), v });
  return v;
}

module.exports = { build };
