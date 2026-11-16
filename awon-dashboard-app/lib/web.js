// Website and organic social data for the marketing initiatives (Windsor.ai, env WINDSOR_API_KEY):
//  - landing pages (GA4): sessions and lead form submits (event "lead_submit") per day and landing page,
//    for the conversion-rate initiative. Paths like /landingtiktok2/t/<id> or /landingtiktok2/track count as /landingtiktok2.
//  - organic social (TikTok account through Windsor's tiktok_organic connector): daily reached audience, video views,
//    profile views and new followers, for the reach initiative.
// Each part fails on its own; the dashboard keeps the previous copy when a refresh fails.
const windsor = require('./windsor');

const GA4_ACCOUNT = process.env.WINDSOR_GA4_ACCOUNT || '359961543';
const TIKTOK_ORGANIC = process.env.WINDSOR_TIKTOK_ORGANIC_ACCOUNT || '_000R2MAOd9qoElZayVjDXDa39inGaRwZNp9';
const LEAD_EVENT = 'lead_submit';
const TTL = 60 * 60 * 1000;
let cache = null;

// '/landingtiktok2/t/abc' -> 'landingtiktok2'; '/en/landingmeta-en' -> 'en/landingmeta-en'; non landing pages -> null
function pageKey(path) {
  const p = String(path || '').toLowerCase().split('?')[0].replace(/^\/+|\/+$/g, '');
  if (!/landing/.test(p)) return null;
  return p.replace(/\/(t\/[^/]+|track)$/, '');
}
const d10 = v => String(v || '').slice(0, 10);

async function pages(from, to) {
  const [sess, ev] = await Promise.all([
    windsor.query('googleanalytics4', GA4_ACCOUNT, ['date', 'landing_page', 'sessions'], from, to, [['landing_page', 'contains', 'landing']]),
    windsor.query('googleanalytics4', GA4_ACCOUNT, ['date', 'landing_page', 'event_name', 'event_count'], from, to, [['event_name', 'eq', LEAD_EVENT], 'and', ['landing_page', 'contains', 'landing']]),
  ]);
  const agg = new Map();
  const at = (d, k) => { const key = d + '|' + k; return agg.get(key) || agg.set(key, [d, k, 0, 0]).get(key); };
  for (const r of sess) { const k = pageKey(r.landing_page); if (k) at(d10(r.date), k)[2] += Number(r.sessions) || 0; }
  for (const r of ev) { if (r.event_name && r.event_name !== LEAD_EVENT) continue; const k = pageKey(r.landing_page); if (k) at(d10(r.date), k)[3] += Number(r.event_count) || 0; }
  return [...agg.values()].filter(x => x[2] || x[3]).sort((a, b) => (a[0] < b[0] ? -1 : 1));   // [date, page, sessions, leadSubmits]
}

async function social(from, to) {
  const raw = await windsor.query('tiktok_organic', TIKTOK_ORGANIC, ['date', 'unique_video_views', 'video_views', 'profile_views', 'followers_count', 'engaged_audience'], from, to);
  const by = new Map();
  for (const r of raw) {
    const d = d10(r.date), a = by.get(d) || by.set(d, [d, 0, 0, 0, 0, 0]).get(d);
    a[1] += Number(r.unique_video_views) || 0; a[2] += Number(r.video_views) || 0; a[3] += Number(r.profile_views) || 0; a[4] += Number(r.followers_count) || 0; a[5] += Number(r.engaged_audience) || 0;
  }
  // [date, reached audience, video views, profile views, new followers, engaged audience]; TikTok fills reach 1-2 days late (0 until then)
  return { tiktok: [...by.values()].sort((a, b) => (a[0] < b[0] ? -1 : 1)) };
}

async function build(from, to) {
  if (!windsor.configured()) return { mode: 'not configured', pages: [], social: {} };
  if (cache && cache.key === from + '|' + to && Date.now() - cache.at < TTL) return cache.v;
  const errors = [];
  const [pg, so] = await Promise.all([
    pages(from, to).catch(e => { errors.push('Landing pages: ' + e.message); return cache ? cache.v.pages : []; }),
    social(from, to).catch(e => { errors.push('Organic social: ' + e.message); return cache ? cache.v.social : {}; }),
  ]);
  const v = { mode: errors.length ? 'partial' : 'live', from, to, pages: pg, social: so, leadEvent: LEAD_EVENT, errors };
  if (!errors.length) cache = { key: from + '|' + to, at: Date.now(), v };
  else if (errors.length) console.error('web: ' + errors.join(' | '));
  return v;
}

module.exports = { build, pageKey };
