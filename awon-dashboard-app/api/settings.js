// Settings for the spend quality, partners, initiatives and team sections (budgets, targets, references, lists).
// Stored as one JSON file in the project's private Blob store; the site-wide password gate (middleware.js) protects it.
const PATH = 'settings/kpi.json';
let blob = null, mem = null;
const sdk = () => blob || (blob = require('@vercel/blob'));
const configured = () => !!(process.env.BLOB_STORE_ID || process.env.BLOB_READ_WRITE_TOKEN);

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  const chunks = []; for await (const c of req) chunks.push(c);
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}
async function load() {
  if (!configured()) return mem;
  const r = await sdk().get(PATH, { access: 'private', useCache: false }).catch(() => null);
  if (!r || r.statusCode !== 200 || !r.stream) return null;
  return JSON.parse(Buffer.from(await new Response(r.stream).arrayBuffer()).toString('utf8'));
}
// Keep only the known shape and sane sizes
function clean(b) {
  const num = v => (v === '' || v == null || !isFinite(Number(v)) ? null : Number(v));
  const str = (v, n = 120) => String(v == null ? '' : v).slice(0, n);
  const ids = a => (Array.isArray(a) ? a : []).map(Number).filter(x => Number.isInteger(x) && x > 0).slice(0, 60);
  const list = (a, n) => (Array.isArray(a) ? a : []).slice(0, n);
  const months = {};
  const grp = g => ({ budget: num(g && g.budget), spend: num(g && g.spend) });
  for (const [k, v] of Object.entries(b.months || {})) if (/^\d{4}-\d{2}$/.test(k)) months[k] = {
    budget: num(v && v.budget), paid: { budget: num(v && v.paid && v.paid.budget) }, wa: { budget: num(v && v.wa && v.wa.budget) }, branding: { budget: num(v && v.branding && v.branding.budget) }, tools: grp(v && v.tools), ugc: grp(v && v.ugc), production: grp(v && v.production),
    services: { budget: num(v && v.services && v.services.budget), items: list(v && v.services && v.services.items, 40).map(i => ({ name: str(i && i.name), cost: num(i && i.cost) })) },
  };
  const refs = b.refs || {};
  return {
    months,
    refs: { kgPer1000: num(refs.kgPer1000), leadsPer1000: num(refs.leadsPer1000), cpl: num(refs.cpl), cpk: num(refs.cpk), pickupRate: num(refs.pickupRate), kgPerOrder: num(refs.kgPerOrder),
      leadsPer1000By: { meta: num(refs.leadsPer1000By && refs.leadsPer1000By.meta), tiktok: num(refs.leadsPer1000By && refs.leadsPer1000By.tiktok), snapchat: num(refs.leadsPer1000By && refs.leadsPer1000By.snapchat), google: num(refs.leadsPer1000By && refs.leadsPer1000By.google) } },
    noResultMin: num(b.noResultMin) == null ? 50 : num(b.noResultMin),
    partnerTargets: { active: str(b.partnerTargets && b.partnerTargets.active, 20), leads: num(b.partnerTargets && b.partnerTargets.leads), kg: num(b.partnerTargets && b.partnerTargets.kg) },
    partners: list(b.partners, 60).map(p => ({ name: str(p.name), sources: ids(p.sources), start: str(p.start, 10), leads: num(p.leads), kg: num(p.kg) })),
    initiatives: list(b.initiatives, 60).map(i => ({ name: str(i.name), status: ['planned', 'active', 'paused', 'done'].includes(i.status) ? i.status : 'planned', start: str(i.start, 10), end: str(i.end, 10), sources: ids(i.sources), leads: num(i.leads) })),
    team: list(b.team, 20).map(m => ({ name: str(m.name), metric: str(m.metric, 40), dir: m.dir === 'down' ? 'down' : 'up', start: num(m.start), startDate: str(m.startDate, 10), days: num(m.days), source: str(m.source, 40), manual: Object.fromEntries(Object.entries(m.manual || {}).filter(([d, v]) => /^\d{4}-\d{2}-\d{2}$/.test(d) && num(v) != null).map(([d, v]) => [d, num(v)])) })),
    updatedAt: new Date().toISOString(),
  };
}
module.exports = async (req, res) => {
  const out = (s, o) => { res.statusCode = s; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('Cache-Control', 'no-store'); res.end(JSON.stringify(o)); };
  try {
    if (req.method === 'GET') return out(200, { settings: await load(), persistent: configured() });
    if (req.method === 'PUT' || req.method === 'POST') {
      const s = clean(await readBody(req));
      if (configured()) await sdk().put(PATH, JSON.stringify(s), { access: 'private', allowOverwrite: true, addRandomSuffix: false, contentType: 'application/json' });
      else mem = s;
      return out(200, { settings: s, persistent: configured() });
    }
    out(405, { error: 'Method not allowed' });
  } catch (e) { console.error(e); out(500, { error: e.message }); }
};
module.exports.clean = clean;
