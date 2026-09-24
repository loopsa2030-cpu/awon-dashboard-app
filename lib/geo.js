const geo = require('../data/geo.json');
function hash(n) { let x = Math.sin(n * 9301 + 49297) * 233280; return x - Math.floor(x); }
// Returns [lat, lng, precision]: 'district' when geocoded, otherwise 'city' (jittered around the centroid)
function locate(id, stateAr) {
  const d = geo.districts[id];
  if (d) return [d[0], d[1], 'district'];
  const s = geo.states[stateAr];
  if (!s) return null;
  const r = 0.01 + hash(id) * 0.025, a = hash(id + 7) * Math.PI * 2;   // small ring, so unplaced districts stay on the city
  return [s[0] + r * Math.sin(a), s[1] + r * Math.cos(a), 'city'];
}
module.exports = { locate };
