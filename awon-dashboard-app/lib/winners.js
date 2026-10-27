// Winning ads per platform (Meta, TikTok, Snapchat) with a creative preview, from Windsor.ai ad-level data.
// Winner = lead-gen ad with the lowest cost per platform lead among ads that spent enough to be meaningful.
// Preview links from the platforms are signed and expire (Snapchat about a day), so results are cached for 30 minutes only.
const ads = require('./ads');
const { cityFromText } = require('./cities');

const ACC = {
  meta:     { connector: 'facebook', account: process.env.WINDSOR_META_ACCOUNT || '1219983855612087', objective: 'campaign_objective', thumb: 'thumbnail_url', leads: ['actions_offsite_conversion_fb_pixel_lead', 'actions_onsite_conversion_messaging_conversation_started_7d'] },
  tiktok:   { connector: 'tiktok', account: process.env.WINDSOR_TIKTOK_ACCOUNT || '7282306257200005121', objective: 'objective_type', thumb: 'video_thumbnail_url', leads: ['conversions'] },
  snapchat: { connector: 'snapchat', account: process.env.WINDSOR_SNAP_ACCOUNT || 'd73ea452-c58a-44e5-aa37-29e3205fcebe', objective: 'objective', thumb: 'thumbnail_url', leads: ['conversion_sign_ups'] },
};
const FX = Number(process.env.ADS_FX_TO_USD || 1);
const TOP = 3, MIN_SPEND = 25, MIN_SHARE = 0.03;
const r2 = v => Math.round(v * 100) / 100;

async function query(a, fields, from, to) {
  const u = new URL('https://connectors.windsor.ai/' + a.connector);
  u.searchParams.set('api_key', process.env.WINDSOR_API_KEY);
  u.searchParams.set('fields', fields.join(','));
  u.searchParams.set('date_from', from);
  u.searchParams.set('date_to', to);
  u.searchParams.set('select_accounts', a.account);
  u.searchParams.set('refresh_since', '3d');
  u.searchParams.set('refresh_interval', '1h');
  const res = await fetch(u);
  const j = await res.json().catch(() => ({}));
  if (!res.ok || j.error) throw new Error(`Windsor ${a.connector}: ${(j.error && (j.error.message || j.error.code)) || res.status}`);
  return j.data || [];
}

// Same creative can run as several ads (one per ad set / city): group them by the media behind the thumbnail.
function creativeKey(url, fallback) {
  if (!url) return 'ad:' + fallback;
  try {
    const u = new URL(url);
    return u.searchParams.get('media_id') || u.searchParams.get('VideoID') || u.origin + u.pathname.split('~')[0];
  } catch (e) { return url; }
}
const https = u => (u ? String(u).replace(/^http:\/\//i, 'https://') : null);

async function one(name, from, to) {
  const a = ACC[name];
  const raw = await query(a, ['ad_id', 'ad_name', 'campaign', a.objective, a.thumb, 'spend', ...a.leads], from, to);
  let leadgenSpend = 0; const by = new Map();
  for (const r of raw) {
    const camp = String(r.campaign || '').trim();
    if (!ads._isLeadgen(ads.PLATFORMS[name], r[a.objective], camp)) continue;
    const sp = (Number(r.spend) || 0) * FX; if (!sp) continue;
    leadgenSpend += sp;
    const ld = a.leads.reduce((t, f) => t + (Number(r[f]) || 0), 0);
    const k = creativeKey(r[a.thumb], r.ad_id);
    const x = by.get(k) || { name: String(r.ad_name || '').trim(), thumb: null, spend: 0, leads: 0, ads: 0, camps: new Map() };
    if (!x.thumb && r[a.thumb]) x.thumb = https(r[a.thumb]);
    x.spend += sp; x.leads += ld; x.ads++; x.camps.set(camp, (x.camps.get(camp) || 0) + sp);
    by.set(k, x);
  }
  const min = Math.max(MIN_SPEND, leadgenSpend * MIN_SHARE);
  const list = [...by.values()].filter(x => x.spend >= min && x.leads > 0).map(x => {
    const camp = [...x.camps.entries()].sort((p, q) => q[1] - p[1])[0][0];
    return { name: x.name, campaign: camp, city: cityFromText(camp) || '', thumb: x.thumb, spend: r2(x.spend), leads: Math.round(x.leads * 100) / 100, cpl: r2(x.spend / x.leads), ads: x.ads };
  }).sort((p, q) => p.cpl - q.cpl);
  const avgCpl = leadgenSpend && [...by.values()].reduce((t, x) => t + x.leads, 0) ? leadgenSpend / [...by.values()].reduce((t, x) => t + x.leads, 0) : null;
  return { top: list.slice(0, TOP), minSpend: r2(min), leadgenSpend: r2(leadgenSpend), avgCpl: avgCpl && r2(avgCpl), candidates: list.length };
}

const cache = new Map(), TTL = 30 * 60 * 1000;
async function load(from, to) {
  if (!process.env.WINDSOR_API_KEY) return { platforms: {}, errors: ['WINDSOR_API_KEY is not set.'] };
  const ck = from + '|' + to, hit = cache.get(ck);
  if (hit && Date.now() - hit.at < TTL) return hit.value;
  const errors = [], platforms = {};
  await Promise.all(Object.keys(ACC).map(async k => {
    try { platforms[k] = await one(k, from, to); } catch (e) { errors.push(`${k}: ${e.message}`); }
  }));
  const value = { platforms, errors, generatedAt: new Date().toISOString() };
  if (!errors.length) { cache.set(ck, { at: Date.now(), value }); if (cache.size > 20) cache.delete(cache.keys().next().value); }
  return value;
}
module.exports = { load };
