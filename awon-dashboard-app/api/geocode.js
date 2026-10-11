// One-off helper used to build data/geo.json (district centroids) from OpenStreetMap Nominatim.
const odoo = require('../lib/odoo');
const geo = require('../data/geo.json');
const TOKEN = 'e5c0ac99ff28371ae1335b39';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const km = (a, b) => { const R = 6371, dl = (b[0] - a[0]) * Math.PI / 180, dg = (b[1] - a[1]) * Math.PI / 180;
  const x = Math.sin(dl / 2) ** 2 + Math.cos(a[0] * Math.PI / 180) * Math.cos(b[0] * Math.PI / 180) * Math.sin(dg / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); };
let list = null;
async function districts() {
  if (list) return list;
  const g = await odoo.readGroup('crm.lead', odoo.SCOPE, ['total_weight:sum'], ['city_id'], { orderby: '__count desc' });
  const ids = g.map(x => (x.city_id || [0])[0]).filter(Boolean);
  const meta = await odoo.call('res.city', 'read', [ids, ['name', 'english_name', 'state_id']]);
  const byId = Object.fromEntries(meta.map(c => [c.id, c]));
  list = ids.map(id => { const c = byId[id]; return [id, c.name, c.english_name || '', c.state_id ? String(c.state_id[1]).replace(/\s*\(SA\)\s*$/, '') : '']; });
  return list;
}
async function nom(q) {
  const u = 'https://nominatim.openstreetmap.org/search?format=json&limit=3&countrycodes=sa&q=' + encodeURIComponent(q);
  const r = await fetch(u, { headers: { 'User-Agent': 'awon-dashboard-geocoder/1.0 (one-off district centroid build)', 'Accept-Language': 'ar,en' } });
  if (!r.ok) return [];
  return r.json();
}
module.exports = async (req, res) => {
  const q = new URL(req.url, 'http://x').searchParams;
  if (q.get('token') !== TOKEN) { res.statusCode = 403; return res.end('no'); }
  try {
    const all = await districts();
    const off = +q.get('offset') || 0, lim = Math.min(+q.get('limit') || 40, 45);
    const out = [];
    for (const [id, ar, en, state] of all.slice(off, off + lim)) {
      const c = geo.states[state];
      let hit = null;
      for (const query of [`${ar}، ${state}`, en ? `${en}, ${state}` : null].filter(Boolean)) {
        const r = await nom(query); await sleep(1100);
        const ok = r.map(x => [+x.lat, +x.lon]).find(p => !c || km(p, c) < 60);
        if (ok) { hit = ok; break; }
      }
      out.push([id, hit ? +hit[0].toFixed(4) : null, hit ? +hit[1].toFixed(4) : null]);
    }
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ offset: off, count: out.length, total: all.length, out }));
  } catch (e) { res.statusCode = 500; res.end(JSON.stringify({ error: e.message })); }
};
