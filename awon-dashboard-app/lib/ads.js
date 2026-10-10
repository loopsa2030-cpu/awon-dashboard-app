// Per-platform ad spend via the Supermetrics API (env SUPERMETRICS_API_KEY), split by campaign objective:
// lead-gen campaigns (website leads or WhatsApp) count as Paid; everything else is branding (reported under Organic).
const PLATFORMS = {
  google:   { ds: 'AW',  account: process.env.SM_GOOGLE_ACCOUNT || '5059563249', fields: ['Date', 'AdvertisingChannelType', 'Cost', 'Conversions'],
              leadgen: /^(SEARCH|PERFORMANCE_MAX|MULTI_CHANNEL)$/i },
  snapchat: { ds: 'SCM', account: process.env.SM_SNAP_ACCOUNT || 'd73ea452-c58a-44e5-aa37-29e3205fcebe', fields: ['date', 'campaign_objective', 'cost', 'conversion_sign_ups'],
              leadgen: /LEAD|CONVERSION|SALES/i },
  meta:     { ds: 'FA',  account: process.env.SM_META_ACCOUNT || 'act_1219983855612087', fields: ['date', 'campaignobjective', 'cost', 'new_messaging_conversations_7d'],
              leadgen: /LEADS|ENGAGEMENT|SALES|MESSAGES|CONVERSIONS|LEAD_GENERATION/i },   // Meta runs WhatsApp messaging under Engagement
  tiktok:   { ds: 'TIK', account: process.env.SM_TIKTOK_ACCOUNT || '7282306257200005121', fields: ['date', 'campaign_objective_type', 'cost', 'conversion'],
              leadgen: /LEAD|CONVERSION|SALES|MESSAGE/i },
};
const FX = Number(process.env.ADS_FX_TO_USD || 1);   // set if ad accounts bill in SAR (e.g. 0.2667)
const cache = new Map();

function configured() { return !!process.env.SUPERMETRICS_API_KEY; }

// Returns [[date, leadgenSpend, brandingSpend, platformLeads(lead-gen campaigns only)]]
async function queryPlatform(name, from, to) {
  const p = PLATFORMS[name];
  const accounts = String(p.account).split(',').map(s => s.trim()).filter(Boolean);
  const body = { ds_id: p.ds, ds_accounts: accounts, start_date: from, end_date: to, fields: p.fields, max_rows: 20000, api_key: process.env.SUPERMETRICS_API_KEY };
  const url = 'https://api.supermetrics.com/enterprise/v2/query/data/json?json=' + encodeURIComponent(JSON.stringify(body));
  const res = await fetch(url);
  const j = await res.json();
  if (!res.ok || j.error) throw new Error(`Supermetrics ${p.ds}: ${(j.error && (j.error.message || j.error.description)) || res.status}`);
  const byDate = new Map();
  for (const r of (j.data || []).slice(1)) {
    const date = String(r[0]).slice(0, 10), obj = String(r[1] || ''), spend = (Number(r[2]) || 0) * FX, leads = Number(r[3]) || 0;
    const a = byDate.get(date) || [date, 0, 0, 0];
    if (p.leadgen.test(obj)) { a[1] += spend; a[3] += leads; } else a[2] += spend;
    byDate.set(date, a);
  }
  return [...byDate.values()].map(a => [a[0], Math.round(a[1] * 100) / 100, Math.round(a[2] * 100) / 100, a[3]]);
}

async function dailySpend(from, to) {
  if (!configured()) return { source: 'not configured', platforms: {}, errors: ['SUPERMETRICS_API_KEY is not set.'] };
  const ck = `${from}|${to}`;
  const hit = cache.get(ck);
  if (hit && Date.now() - hit.at < 15 * 60 * 1000) return hit.value;
  const entries = await Promise.all(Object.keys(PLATFORMS).map(async k => {
    try { return [k, await queryPlatform(k, from, to), null]; } catch (e) { return [k, [], e.message]; }
  }));
  const value = { source: 'live', platforms: Object.fromEntries(entries.map(([k, v]) => [k, v])),
    errors: entries.filter(e => e[2]).map(e => `${e[0]}: ${e[2]}`) };
  cache.set(ck, { at: Date.now(), value });
  return value;
}

module.exports = { dailySpend, configured, PLATFORMS };
