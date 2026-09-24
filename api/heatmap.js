const odooData = require('../lib/odoodata');
const { locate } = require('../lib/geo');
const { range, send } = require('../lib/http');
const { cityKey, CITY_LABELS } = require('../lib/cities');
module.exports = async (req, res) => {
  try {
    const { from, to } = range(req);
    const h = await odooData.heat(from, to);
    const points = [];
    let unplaced = { orders: 0, kg: 0 };
    for (const r of h.rows) {
      const meta = h.districts[r.id];
      const loc = meta ? locate(r.id, meta[2]) : null;
      if (!loc) { unplaced.orders += r.orders; unplaced.kg += r.kg; continue; }
      const ck = cityKey(meta[2]);
      points.push({ id: r.id, ar: meta[0], en: meta[1] || meta[0], cityAr: meta[2], city: ck,
        cityEn: (CITY_LABELS[ck] || {}).en || meta[2], lat: +loc[0].toFixed(5), lng: +loc[1].toFixed(5), precision: loc[2],
        orders: r.orders, pickups: r.pickups, kg: Math.round(r.kg) });
    }
    points.sort((a, b) => b.orders - a.orders);
    send(res, 200, { range: { from, to }, source: h.source, granularity: h.granularity, points, unplaced });
  } catch (e) { console.error(e); send(res, 500, { error: e.message }); }
};
