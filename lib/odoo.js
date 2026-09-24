// Minimal Odoo JSON-RPC client (env: ODOO_URL, ODOO_DB, ODOO_LOGIN, ODOO_API_KEY).
const URL_ = (process.env.ODOO_URL || 'https://loopksa-odoo.odoo.com').replace(/\/$/, '');
let DB = process.env.ODOO_DB || null;
let uid = null;
async function db() {
  if (DB) return DB;
  try { const list = await rpc('db', 'list', []); if (Array.isArray(list) && list.length) DB = list[0]; } catch (e) { /* listing disabled */ }
  if (!DB) throw new Error('Odoo database name unknown - set ODOO_DB in Vercel (open ' + URL_ + '/web/session/get_session_info while logged in and copy the "db" value).');
  return DB;
}

function configured() { return !!(process.env.ODOO_LOGIN && process.env.ODOO_API_KEY); }

async function rpc(service, method, args) {
  const res = await fetch(`${URL_}/jsonrpc`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', method: 'call', params: { service, method, args }, id: Date.now() }),
  });
  const j = await res.json();
  if (j.error) throw new Error(`Odoo: ${j.error.data?.message || j.error.message}`);
  return j.result;
}
async function login() {
  if (uid) return uid;
  uid = await rpc('common', 'login', [await db(), process.env.ODOO_LOGIN, process.env.ODOO_API_KEY]);
  if (!uid) throw new Error('Odoo login failed - check ODOO_DB / ODOO_LOGIN / ODOO_API_KEY');
  return uid;
}
async function call(model, method, args, kwargs = {}) {
  const u = await login();
  return rpc('object', 'execute_kw', [await db(), u, process.env.ODOO_API_KEY, model, method, args,
    { ...kwargs, context: { tz: 'Asia/Riyadh', lang: 'en_US', ...(kwargs.context || {}) } }]);
}
async function readGroup(model, domain, fields, groupby, extra = {}) {
  return call(model, 'read_group', [domain, fields, groupby], { lazy: false, ...extra });
}

// Scope: Awon only (exclude Sutra / Cash4Clothes by tag and by source name)
const SCOPE = [
  ['tags', 'not in', ['Sutra', 'Cash4Clothes']],
  ['hubspot_source_name', 'not ilike', 'sutra'],
  ['hubspot_source_name', 'not ilike', 'cash4'],
];
// Odoo stores datetimes in UTC; KSA is UTC+3 with no DST.
function ksaRange(field, from, to) {
  const start = new Date(`${from}T00:00:00+03:00`).toISOString().replace('T', ' ').slice(0, 19);
  const endD = new Date(`${to}T00:00:00+03:00`); endD.setUTCDate(endD.getUTCDate() + 1);
  const end = endD.toISOString().replace('T', ' ').slice(0, 19);
  return [[field, '>=', start], [field, '<', end]];
}

// Source-name -> group / platform classification
function classify(src) {
  const s = String(src || '').toLowerCase();
  let platform = null;
  if (/landinggoogle|google/.test(s)) platform = 'google';
  else if (/landingsnap|snapchat/.test(s)) platform = 'snapchat';
  else if (/landingmeta|facebook|instagram/.test(s) && !/organic/.test(s)) platform = 'meta';
  else if (/landingtiktok/.test(s) || (/tiktok/.test(s) && !/organic/.test(s) && !/whatsapp/.test(s))) platform = 'tiktok';
  let group = 'organic';
  if (/whatsapp|^wa[-_ ]|_wa$|old-customers|new-customers|new customers|loyalist|reminder|retention|-camp$|camp$/.test(s)) group = 'wa';   // WA broadcasts & CRM re-activation
  else if (platform || /paid|^landing/.test(s)) group = 'paid';
  return { group, platform };
}

module.exports = { configured, readGroup, call, SCOPE, ksaRange, classify };
