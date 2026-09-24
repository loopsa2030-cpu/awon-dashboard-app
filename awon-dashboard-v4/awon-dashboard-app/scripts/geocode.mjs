/* Builds data/geo.json: one real coordinate per Odoo district, looked up on OpenStreetMap.
   Run it once (about 15 minutes) from the project folder:   node scripts/geocode.mjs
   It resumes where it left off, so you can stop it and run it again. */
import fs from 'node:fs';
import path from 'node:path';

const root = path.join(import.meta.dirname, '..');
const districts = JSON.parse(fs.readFileSync(path.join(root, 'data/districts.json'), 'utf8'));
const geoPath = path.join(root, 'data/geo.json');
const geo = JSON.parse(fs.readFileSync(geoPath, 'utf8'));
geo.districts = geo.districts || {};

const R = 6371;
const km = (a, b) => {
  const dl = (b[0] - a[0]) * Math.PI / 180, dg = (b[1] - a[1]) * Math.PI / 180;
  const x = Math.sin(dl / 2) ** 2 + Math.cos(a[0] * Math.PI / 180) * Math.cos(b[0] * Math.PI / 180) * Math.sin(dg / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
};
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function search(q, viewbox) {
  const u = new URL('https://nominatim.openstreetmap.org/search');
  u.searchParams.set('format', 'json');
  u.searchParams.set('limit', '5');
  u.searchParams.set('countrycodes', 'sa');
  u.searchParams.set('q', q);
  if (viewbox) { u.searchParams.set('viewbox', viewbox); u.searchParams.set('bounded', '1'); }
  const res = await fetch(u, { headers: { 'User-Agent': 'awon-dashboard-geocoder/1.0 (one-off district build)', 'Accept-Language': 'ar,en' } });
  await sleep(1100);                       // OpenStreetMap allows one request per second
  if (!res.ok) return [];
  return res.json();
}

let done = 0, found = 0, skipped = 0;
for (const [id, ar, en, state] of districts) {
  if (geo.districts[id]) { skipped++; continue; }
  const c = geo.states[state];
  if (!c) { console.log(`no city centre for "${state}" - skipping ${ar}`); continue; }
  const box = [c[1] - 0.45, c[0] + 0.45, c[1] + 0.45, c[0] - 0.45].join(',');   // ~50 km around the city
  let hit = null;
  for (const q of [`حي ${ar}، ${state}`, `${ar}، ${state}`, en ? `${en} district, ${state}` : null].filter(Boolean)) {
    const rows = await search(q, box);
    const ok = rows.map(x => [+x.lat, +x.lon]).find(p => km(p, c) < 55);
    if (ok) { hit = ok; break; }
  }
  done++;
  if (hit) { geo.districts[id] = [+hit[0].toFixed(5), +hit[1].toFixed(5)]; found++; }
  if (done % 10 === 0) {
    fs.writeFileSync(geoPath, JSON.stringify(geo));
    console.log(`${done}/${districts.length - skipped} looked up, ${found} placed`);
  }
}
fs.writeFileSync(geoPath, JSON.stringify(geo));
console.log(`Done. ${found} districts placed, ${districts.length - skipped - found} not found (they fall back to the city centre).`);
