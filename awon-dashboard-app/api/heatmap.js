const odooData = require('../lib/odoodata');
const history = require('../lib/history');
const { locate } = require('../lib/geo');
const { range, send } = require('../lib/http');
const { cityKey, CITY_LABELS } = require('../lib/cities');
module.exports = async (req, res) => {
  try {
    const { from, to } = range(req);
    const [h, table] = await Promise.all([
      odooData.heat(from, to),
      Promise.race([history.geoTable(), new Promise(r => setTimeout(() => r(null), 25000))]).catch(() => null),
    ]);
    const points = [];
    const unplaced = { leads: 0, donations: 0, kg: 0 };
    const unmatched = new Map();
    for (const r of h.rows) {
      const meta = h.districts[r.id];
      const loc = meta ? locate(r.id, meta[0], meta[2], table) : null;
      if (!loc) { unplaced.leads += r.leads; unplaced.donations += r.donations; unplaced.kg += r.kg; continue; }
      if (loc[2] === 'city') unmatched.set(`${meta[0]} (${meta[2]})`, (unmatched.get(`${meta[0]} (${meta[2]})`) || 0) + r.donations);
      const ck = cityKey(meta[2]);
      points.push({ id: r.id, ar: meta[0], en: meta[1] || meta[0], cityAr: meta[2], city: ck,
        cityEn: (CITY_LABELS[ck] || {}).en || meta[2], lat: +loc[0].toFixed(5), lng: +loc[1].toFixed(5), precision: loc[2],
        leads: r.leads, donations: r.donations, kg: Math.round(r.kg) });
    }
    points.sort((a, b) => b.donations - a.donations);
    const placed = points.filter(p => p.precision === 'district').reduce((a, p) => a + p.donations, 0);
    const total = points.reduce((a, p) => a + p.donations, 0);
    send(res, 200, { range: { from, to }, source: h.source, points, unplaced,
      locationTable: table ? Object.keys(table).length : null, placedShare: total ? placed / total : null,
      unmatched: [...unmatched.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25).map(x => x[0]) }, 900);
  } catch (e) { console.error(e); send(res, 500, { error: e.message }); }
};
