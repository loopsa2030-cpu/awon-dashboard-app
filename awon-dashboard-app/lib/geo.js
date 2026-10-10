const geo = require('../data/geo.json');
const { arNorm } = require('./arnorm');
const centres = Object.fromEntries(Object.entries(geo.states).map(([k, v]) => [arNorm(k), v]));
function hash(n) { let x = Math.sin(n * 9301 + 49297) * 233280; return x - Math.floor(x); }
// Returns [lat, lng, precision]: 'district' when the district is in the location table built from
// the customer data (median of real order coordinates), otherwise 'city' (small ring around the centre).
function locate(id, districtAr, stateAr, table) {
  const c = arNorm(stateAr), d = arNorm(districtAr);
  const hit = table && (table[c + '|' + d]);
  if (hit) return [hit[0], hit[1], 'district'];
  const s = centres[c] || geo.states[stateAr];
  if (!s) return null;
  const r = 0.008 + hash(id) * 0.02, a = hash(id + 7) * Math.PI * 2;
  return [s[0] + r * Math.sin(a), s[1] + r * Math.cos(a), 'city'];
}
module.exports = { locate };
