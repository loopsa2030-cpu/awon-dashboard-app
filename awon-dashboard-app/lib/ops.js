// Operations: Odoo orders by scheduled pickup day (date_deadline), driver (delivery_employee_id), region, delivery status.
// Rows: [date, driverId, city, status, active(1/0), orders, kg]. Status: 1 under processing, 2 out for delivery,
// 3 rescheduled, 4 no answer, 5 cancelled, 6 received. Archived (lost) orders are kept so cancellations still count.
const odoo = require('./odoo');
const { cityKey } = require('./cities');
const cache = new Map();
const stateName = s => (s ? String(s[1]).replace(/\s*\(SA\)\s*$/, '') : '');

function shape(groups) {
  const drivers = {}, rows = [];
  for (const g of groups) {
    const e = g.delivery_employee_id; if (!e) continue;
    const r = g.__range && (g.__range['date_deadline:day'] || Object.values(g.__range)[0]);
    const d = r && r.from ? String(r.from).slice(0, 10) : null; if (!d) continue;
    if (/^test$/i.test(String(e[1]).trim())) continue;
    drivers[e[0]] = String(e[1]).trim();
    rows.push([d, e[0], cityKey(stateName(g.state_id)) || 'unknown', String(g.delivery_status || ''), g.active === false ? 0 : 1, g.__count, Math.round((g.total_weight || 0) * 10) / 10]);
  }
  return { drivers, rows };
}

async function build(from, to) {
  if (!odoo.configured()) return { mode: 'not configured', drivers: {}, rows: [] };
  const ck = from + '|' + to, hit = cache.get(ck);
  if (hit && Date.now() - hit.at < 10 * 60 * 1000) return hit.v;
  const g = await odoo.readGroup('crm.lead', [['date_deadline', '>=', from], ['date_deadline', '<=', to], ['delivery_employee_id', '!=', false]],
    ['total_weight:sum'], ['date_deadline:day', 'delivery_employee_id', 'state_id', 'delivery_status', 'active'], { context: { active_test: false } });
  const v = { mode: 'live', from, to, ...shape(g) };
  cache.set(ck, { at: Date.now(), v });
  return v;
}

module.exports = { build, shape };
