// Ad platform data via the Supermetrics API (env SUPERMETRICS_API_KEY), per campaign per day.
// Lead-gen campaigns (website leads or WhatsApp) count as Paid; everything else is branding (reported under Organic).
// Campaign names carry the city ("Awon LP Leads Jeddah"), which gives spend, native leads and clicks by city.
const { cityFromText } = require('./cities');

// idx: positions of [date, campaign name, objective, cost, native leads, clicks, campaign id] in `fields`
const PLATFORMS = {
  google:   { ds: 'AW',  account: process.env.SM_GOOGLE_ACCOUNT || '5059563249',
              fields: ['Date', 'Campaignname', 'AdvertisingChannelType', 'Cost', 'Conversions', 'Clicks'], idx: [0, 1, 2, 3, 4, 5, -1],
              legacy: ['Date', 'AdvertisingChannelType', 'Cost', 'Conversions'],
              leadgen: /^(SEARCH|PERFORMANCE[ _]MAX|MULTI[ _]CHANNEL)$/i },
  snapchat: { ds: 'SCM', account: process.env.SM_SNAP_ACCOUNT || 'd73ea452-c58a-44e5-aa37-29e3205fcebe',
              // Supermetrics returns dimensions before metrics, so campaign_id must sit with the dimensions
              fields: ['date', 'campaign_name', 'campaign_id', 'campaign_objective', 'cost', 'conversion_sign_ups', 'swipes'], idx: [0, 1, 3, 4, 5, 6, 2],
              legacy: ['date', 'campaign_objective', 'cost', 'conversion_sign_ups'],
              leadgen: /LEAD|CONVERSION|SALES/i },
  meta:     { ds: 'FA',  account: process.env.SM_META_ACCOUNT || 'act_1219983855612087',
              fields: ['date', 'adcampaign_name', 'campaignobjective', 'cost', 'new_messaging_conversations_7d', 'action_link_click'], idx: [0, 1, 2, 3, 4, 5, -1],
              legacy: ['date', 'campaignobjective', 'cost', 'new_messaging_conversations_7d'],
              leadgen: /LEADS|ENGAGEMENT|SALES|MESSAGES|CONVERSIONS|LEAD_GENERATION/i },   // Meta runs WhatsApp messaging under Engagement
  tiktok:   { ds: 'TIK', account: process.env.SM_TIKTOK_ACCOUNT || '7282306257200005121',
              fields: ['date', 'campaign_name', 'campaign_objective_type', 'cost', 'conversion', 'clicks'], idx: [0, 1, 2, 3, 4, 5, -1],
              legacy: ['date', 'campaign_objective_type', 'cost', 'conversion'],
              leadgen: /LEAD|CONVERSION|SALES|MESSAGE/i },
};
// Campaign names that are clearly awareness even when the objective looks like lead-gen (e.g. Meta video views under Engagement)
const BRANDING_NAME = /video.?views|awareness|profile.?visits|\breach\b|brand/i;
const LEADGEN_NAME = /lead|sales|wa.?msgs|whatsapp/i;
const FX = Number(process.env.ADS_FX_TO_USD || 1);   // set if ad accounts bill in SAR (e.g. 0.2667)
const GA_PROPERTY = process.env.GA4_PROPERTY || '359961543';
const cache = new Map();
const r2 = v => Math.round(v * 100) / 100;

function configured() { return !!process.env.SUPERMETRICS_API_KEY; }

async function smQuery(ds, accounts, fields, from, to) {
  const body = { ds_id: ds, ds_accounts: accounts, start_date: from, end_date: to, fields, max_rows: 100000, api_key: process.env.SUPERMETRICS_API_KEY };
  const url = 'https://api.supermetrics.com/enterprise/v2/query/data/json?json=' + encodeURIComponent(JSON.stringify(body));
  const res = await fetch(url);
  const j = await res.json();
  if (!res.ok || j.error) throw new Error(`Supermetrics ${ds}: ${(j.error && (j.error.message || j.error.description)) || res.status}`);
  return (j.data || []).slice(1);
}

function isLeadgen(p, objective, name) {
  if (name && BRANDING_NAME.test(name) && !LEADGEN_NAME.test(name)) return false;
  if (p.leadgen.test(String(objective || '').replace(/\s+/g, '_'))) return true;
  return !!(name && LEADGEN_NAME.test(name) && !BRANDING_NAME.test(name));
}

// Campaign rows: [date, city|'', leadgen(1/0), spend, nativeLeads, clicks]; plus a campaign-id -> name map (Snapchat ids appear in GA4)
async function queryPlatform(name, from, to) {
  const p = PLATFORMS[name];
  const accounts = String(p.account).split(',').map(s => s.trim()).filter(Boolean);
  const ids = {};
  let rows;
  try {
    const raw = await smQuery(p.ds, accounts, p.fields, from, to);
    const [iD, iN, iO, iC, iL, iK, iI] = p.idx;
    const agg = new Map();
    for (const r of raw) {
      const date = String(r[iD]).slice(0, 10), cname = String(r[iN] || '').trim();
      if (iI >= 0 && r[iI]) ids[String(r[iI])] = cname;
      const city = cityFromText(cname) || '', lg = isLeadgen(p, r[iO], cname) ? 1 : 0;
      const k = date + '|' + city + '|' + lg;
      const a = agg.get(k) || [date, city, lg, 0, 0, 0];
      a[3] += (Number(r[iC]) || 0) * FX; a[4] += Number(r[iL]) || 0; a[5] += Number(r[iK]) || 0;
      agg.set(k, a);
    }
    rows = [...agg.values()].map(a => [a[0], a[1], a[2], r2(a[3]), Math.round(a[4] * 100) / 100, a[5]]);
  } catch (e) {
    // Fall back to the platform-level query so spend never disappears if a campaign field is rejected
    const raw = await smQuery(p.ds, accounts, p.legacy, from, to);
    rows = raw.map(r => [String(r[0]).slice(0, 10), '', isLeadgen(p, r[1], '') ? 1 : 0, r2((Number(r[2]) || 0) * FX), Number(r[3]) || 0, 0]);
    rows.fallback = e.message;
  }
  return { rows, ids };
}

// GA4 sessions: [date, kind('paid'|'organic'), platform, city|'', sessions]
const PAID_CH = /^(paid|cross-network|display)/i;
// Meta ads tagged with utm_source=fb/ig/an/th but no paid medium land in "Organic Social"; a real campaign name marks them as paid
const AD_SRC = /^(fb|ig|an|th|wa|facebook|instagram|snapchat|tiktok)$/i;   // th = Threads, an = Audience Network, wa = WhatsApp placements (all Meta)
const NOT_CAMP = /^\(|^$/;
function gaPlatform(kind, source) {
  const s = String(source || '').toLowerCase();
  if (/snap/.test(s)) return 'snapchat';
  if (/tiktok/.test(s)) return 'tiktok';
  if (/facebook|instagram|^ig$|^fb$|^an$|^th$|^wa$|meta|^m\.facebook|^l\.facebook|^lm\.facebook/.test(s)) return 'meta';
  if (/google|adwords|bing|yahoo|duckduckgo|ecosia/.test(s)) return kind === 'paid' ? 'google' : 'web';
  return kind === 'paid' ? 'other' : 'web';
}
function gaChunks(from, to) {
  // month-sized chunks keep each request well under row caps
  const chunks = [];
  for (let d = new Date(from + 'T00:00:00Z'); d.toISOString().slice(0, 10) <= to;) {
    const s = d.toISOString().slice(0, 10);
    const e = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
    chunks.push([s, e < to ? e : to]);
    d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
  }
  return chunks;
}
const GA_DAYS = Number(process.env.GA4_DAYS || 120);
async function gaRaw(from, to) {
  // Recent window only, one month at a time in sequence: parallel GA4 requests next to the ad platforms hit Supermetrics limits
  const min = new Date(Date.parse(to + 'T00:00:00Z') - GA_DAYS * 864e5).toISOString().slice(0, 10);
  const out = [];
  for (const [s, e] of gaChunks(from > min ? from : min, to)) {
    const rows = await smQuery('GAWA', [GA_PROPERTY], ['date', 'sessionDefaultChannelGrouping', 'sessionSource', 'sessionCampaignName', 'sessions'], s, e);
    out.push(...rows);
  }
  return out;
}
function gaAggregate(raw, campaignNames) {
  const agg = new Map();
  for (const r of raw) {
    const date = String(r[0]).slice(0, 10), ch = String(r[1] || ''), src = r[2], camp = String(r[3] || '');
    const kind = PAID_CH.test(ch) || (AD_SRC.test(String(src || '')) && !NOT_CAMP.test(camp)) ? 'paid' : 'organic';
    const plat = gaPlatform(kind, src);
    const city = kind === 'paid' ? (cityFromText(campaignNames[camp] || camp) || '') : '';
    const k = [date, kind, plat, city].join('|');
    const a = agg.get(k) || [date, kind, plat, city, 0];
    a[4] += Number(r[4]) || 0; agg.set(k, a);
  }
  return [...agg.values()];
}
const timeout = (p, ms, label) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error(label + ' timed out')), ms))]);

async function load(from, to) {
  if (!configured()) return { source: 'not configured', camps: {}, platforms: {}, ga: [], errors: ['SUPERMETRICS_API_KEY is not set.'] };
  const ck = `${from}|${to}`;
  const hit = cache.get(ck);
  if (hit && Date.now() - hit.at < 15 * 60 * 1000) return hit.value;
  const errors = [];
  const gaP = timeout(gaRaw(from, to), 120000, 'GA4').catch(e => { errors.push('GA4: ' + e.message); return []; });   // runs in parallel with the ad platforms
  const entries = await Promise.all(Object.keys(PLATFORMS).map(async k => {
    try { const r = await queryPlatform(k, from, to); if (r.rows.fallback) errors.push(`${k}: campaign detail unavailable (${r.rows.fallback})`); return [k, r]; }
    catch (e) { errors.push(`${k}: ${e.message}`); return [k, { rows: [], ids: {} }]; }
  }));
  const camps = {}, platforms = {}, names = {};
  for (const [k, r] of entries) {
    camps[k] = r.rows; Object.assign(names, r.ids);
    // platform-level daily rows kept for the Performance tab: [date, leadgenSpend, brandingSpend, platformLeads]
    const byDate = new Map();
    for (const [d, , lg, sp, ld] of r.rows) {
      const a = byDate.get(d) || [d, 0, 0, 0];
      if (lg) { a[1] += sp; a[3] += ld; } else a[2] += sp;
      byDate.set(d, a);
    }
    platforms[k] = [...byDate.values()].map(a => [a[0], r2(a[1]), r2(a[2]), Math.round(a[3])]);
  }
  const ga = gaAggregate(await gaP, names);
  const value = { source: 'live', camps, platforms, ga, errors };
  cache.set(ck, { at: Date.now(), value });
  return value;
}

// Back-compat
async function dailySpend(from, to) { return load(from, to); }

module.exports = { load, dailySpend, configured, PLATFORMS, _isLeadgen: isLeadgen, _gaPlatform: gaPlatform };
