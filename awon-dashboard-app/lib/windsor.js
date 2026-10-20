// Ad platform + GA4 data via the Windsor.ai API (env WINDSOR_API_KEY). Returns the same shape as ads.load(),
// so the rest of the dashboard does not care which provider is used.
// Docs: https://windsor.ai/api-documentation/  (GET https://connectors.windsor.ai/<connector>?api_key=...&fields=...)
const { cityFromText } = require('./cities');
const ads = require('./ads');

const ACC = {
  google:   { connector: 'google_ads', account: process.env.WINDSOR_GOOGLE_ACCOUNT || '505-956-3249', objective: 'advertising_channel_type', leads: 'conversions', clicks: 'clicks' },
  snapchat: { connector: 'snapchat', account: process.env.WINDSOR_SNAP_ACCOUNT || 'd73ea452-c58a-44e5-aa37-29e3205fcebe', objective: 'objective', leads: 'conversion_sign_ups', clicks: 'swipes' },
  meta:     { connector: 'facebook', account: process.env.WINDSOR_META_ACCOUNT || '1219983855612087', objective: 'campaign_objective', leads: 'actions_onsite_conversion_messaging_conversation_started_7d', clicks: 'actions_link_click' },
  tiktok:   { connector: 'tiktok', account: process.env.WINDSOR_TIKTOK_ACCOUNT || '7282306257200005121', objective: 'objective_type', leads: 'conversions', clicks: 'clicks' },
};
const GA4_ACCOUNT = process.env.WINDSOR_GA4_ACCOUNT || '359961543';
const FX = Number(process.env.ADS_FX_TO_USD || 1);
const r2 = v => Math.round(v * 100) / 100;

function configured() { return !!process.env.WINDSOR_API_KEY; }

async function query(connector, account, fields, from, to) {
  const u = new URL('https://connectors.windsor.ai/' + connector);
  u.searchParams.set('api_key', process.env.WINDSOR_API_KEY);
  u.searchParams.set('fields', fields.join(','));
  u.searchParams.set('date_from', from);
  u.searchParams.set('date_to', to);
  u.searchParams.set('select_accounts', account);
  u.searchParams.set('refresh_since', '3d');
  u.searchParams.set('refresh_interval', '1h');
  const res = await fetch(u);
  const j = await res.json().catch(() => ({}));
  if (!res.ok || j.error) throw new Error(`Windsor ${connector}: ${(j.error && (j.error.message || j.error.code)) || res.status}`);
  return j.data || [];
}

// Campaign rows: [date, city|'', leadgen(1/0), spend, nativeLeads, clicks]; plus a campaign-id -> name map (Snapchat ids appear in GA4)
async function platform(name, from, to) {
  const a = ACC[name];
  const raw = await query(a.connector, a.account, ['date', 'campaign', 'campaign_id', a.objective, 'spend', a.leads, a.clicks], from, to);
  const ids = {}, agg = new Map();
  for (const r of raw) {
    const date = String(r.date).slice(0, 10), cname = String(r.campaign || '').trim();
    if (r.campaign_id) ids[String(r.campaign_id)] = cname;
    const sp = Number(r.spend) || 0, ld = Number(r[a.leads]) || 0, ck = Number(r[a.clicks]) || 0;
    if (!sp && !ld && !ck) continue;
    const city = cityFromText(cname) || '', lg = ads._isLeadgen(ads.PLATFORMS[name], r[a.objective], cname) ? 1 : 0;
    const k = date + '|' + city + '|' + lg;
    const x = agg.get(k) || [date, city, lg, 0, 0, 0];
    x[3] += sp * FX; x[4] += ld; x[5] += ck; agg.set(k, x);
  }
  return { rows: [...agg.values()].map(x => [x[0], x[1], x[2], r2(x[3]), Math.round(x[4] * 100) / 100, x[5]]), ids };
}

async function gaRaw(from, to) {
  const raw = await query('googleanalytics4', GA4_ACCOUNT, ['date', 'session_default_channel_group', 'source', 'campaign', 'sessions'], from, to);
  return raw.map(r => [String(r.date).slice(0, 10), r.session_default_channel_group, r.source, r.campaign, Number(r.sessions) || 0]);
}

async function load(from, to) {
  if (!configured()) return { source: 'windsor', camps: {}, platforms: {}, ga: [], errors: ['WINDSOR_API_KEY is not set.'] };
  const errors = [];
  const gaP = gaRaw(from, to).catch(e => { errors.push('GA4: ' + e.message); return []; });
  const entries = await Promise.all(Object.keys(ACC).map(async k => {
    try { return [k, await platform(k, from, to)]; }
    catch (e) { errors.push(`${k}: ${e.message}`); return [k, { rows: [], ids: {} }]; }
  }));
  const camps = {}, names = {};
  for (const [k, r] of entries) { camps[k] = r.rows; Object.assign(names, r.ids); }
  const ga = ads.gaAggregate(await gaP, names);
  return { source: 'windsor', camps, platforms: {}, ga, errors };
}

module.exports = { load, configured };
