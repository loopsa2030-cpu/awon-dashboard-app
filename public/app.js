/* Awon live dashboard: front end (vanilla JS, EN/AR). */
(() => {
'use strict';
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];

// ---------------- i18n ----------------
const T = {
  en: {
    title: 'Performance dashboard', subtitle: 'Marketing, logistics and donors across Saudi Arabia',
    refresh: 'Refresh', tabPerf: 'Performance', tabMap: 'Donor map',
    all: 'All time', yesterday: 'Yesterday', last7: 'Last 7 days', thisMonth: 'This month', custom: 'Pick dates…',
    northStar: 'North star: cost per kg collected', perKg: 'per kg',
    marketing: 'Marketing', logistics: 'Logistics', vsTarget: 'Actual against the forecast, prorated to the last reported day',
    logiNote: 'Fridays are non-operating days in the target', platforms: 'Paid platforms',
    platNote: 'Spend from Supermetrics; leads, pickups and kg from Odoo landing-page sources',
    cities: 'Cities', trend: 'Daily trend', orders: 'Orders', pickups: 'Pickups', kg: 'Weight (kg)',
    allCities: 'All cities', otherCities: 'Other cities', low: 'Low', high: 'High', topLoc: 'Top districts',
    spend: 'Spend', leads: 'Leads', cpl: 'Cost per lead', cac: 'Cost per pickup', weight: 'Weight collected',
    pickupRate: 'Pickup rate', kgPerPickup: 'kg per pickup', cpk: 'Cost per kg',
    target: 'target', of: 'of', ahead: 'better than target', behind: 'worse than target', onTrack: 'on target',
    paid: 'Paid ads', organic: 'Organic & branding', wa: 'WhatsApp & CRM',
    cpkLine: (a, t, p) => `Target to date is <b>${t}</b>. That is ${p}.`,
    over: p => `${p} over target`, under: p => `${p} under target`,
    groupMeta: (s, kg) => `${s} spent · ${kg} kg`,
    platform: 'Platform', crmLeads: 'CRM leads', platConv: 'Platform-reported', city: 'City',
    reconTxt: (a, b) => `Ad platforms report ${a} spend for this period; the Daily tab records ${b} as paid spend.`,
    lowAttr: 'few CRM leads tagged to this platform',
    updated: 'Updated', live: 'Live', snapshot: 'Partial', from: 'From', to: 'To',
    daysMode: 'Days', weeksMode: 'Weeks', monthsMode: 'Months', apply: 'Apply', pickStart: 'Pick a start and end day',
    nodata: 'No data for this period yet.', districts: 'Districts', totalOrders: 'Orders', totalKg: 'kg collected',
    district: 'District', approx: 'approx. location', unplaced: n => `${n} orders have no district on file and are not on the map.`,
    mapSrc: (m, s) => `Odoo orders (${m === 'live' ? 'live' : 'snapshot ' + s}). Orders = all CRM leads created in the period; pickups = Won; kg = recorded weight.`,
    monthGran: m => `Snapshot mode only holds ${m} (top 320 districts); connect Odoo for exact dates and all districts.`,
    srcLine: (k, m, t) => `${k}: ${m}${t ? ' (' + t + ')' : ''}`,
    srcSheets: 'Google Sheets (Daily + Forecast tabs)', srcOdoo: 'Odoo CRM', srcAds: 'Supermetrics',
    overheadNote: 'Targets include marketing overhead from the forecast, matching the MTD tab. Actual spend is direct media spend from the Daily tab.',
    dates: (a, b) => a === b ? a : `${a} → ${b}`, lastRep: d => `last reported day ${d}`,
    series: { spend: 'Spend', target: 'Spend target', kg: 'kg', cpk: 'CPK (7-day rolling)' },
  },
  ar: {
    title: 'لوحة الأداء', subtitle: 'التسويق واللوجستيات والمتبرعون في المملكة',
    refresh: 'تحديث', tabPerf: 'الأداء', tabMap: 'خريطة المتبرعين',
    all: 'كل الفترات', yesterday: 'أمس', last7: 'آخر ٧ أيام', thisMonth: 'هذا الشهر', custom: 'اختيار التواريخ…',
    northStar: 'المؤشر الأساسي: تكلفة الكيلوغرام المجمّع', perKg: 'لكل كغ',
    marketing: 'التسويق', logistics: 'اللوجستيات', vsTarget: 'الفعلي مقابل المستهدف حتى آخر يوم مُسجّل',
    logiNote: 'أيام الجمعة غير تشغيلية في المستهدف', platforms: 'المنصات الإعلانية',
    platNote: 'الإنفاق من Supermetrics، والعملاء والاستلامات والأوزان من مصادر صفحات الهبوط في Odoo',
    cities: 'المدن', trend: 'الاتجاه اليومي', orders: 'الطلبات', pickups: 'الاستلامات', kg: 'الوزن (كغ)',
    allCities: 'كل المدن', otherCities: 'مدن أخرى', low: 'منخفض', high: 'مرتفع', topLoc: 'أعلى الأحياء',
    spend: 'الإنفاق', leads: 'العملاء المحتملون', cpl: 'تكلفة العميل', cac: 'تكلفة الاستلام', weight: 'الوزن المجمّع',
    pickupRate: 'نسبة الاستلام', kgPerPickup: 'كغ لكل استلام', cpk: 'تكلفة الكيلو',
    target: 'المستهدف', of: 'من', ahead: 'أفضل من المستهدف', behind: 'أسوأ من المستهدف', onTrack: 'ضمن المستهدف',
    paid: 'الإعلانات المدفوعة', organic: 'العضوي والعلامة', wa: 'واتساب وإعادة التفعيل',
    cpkLine: (a, t, p) => `المستهدف حتى الآن <b>${t}</b>، أي ${p}.`,
    over: p => `أعلى من المستهدف بـ ${p}`, under: p => `أقل من المستهدف بـ ${p}`,
    groupMeta: (s, kg) => `إنفاق ${s} · ${kg} كغ`,
    platform: 'المنصة', crmLeads: 'عملاء CRM', platConv: 'تحويلات المنصة', city: 'المدينة',
    reconTxt: (a, b) => `تُظهر المنصات إنفاق ${a} لهذه الفترة، بينما يسجل التبويب اليومي ${b} كإنفاق مدفوع.`,
    lowAttr: 'عدد قليل من العملاء مرتبط بهذه المنصة',
    updated: 'آخر تحديث', live: 'مباشر', snapshot: 'جزئي', from: 'من', to: 'إلى',
    daysMode: 'أيام', weeksMode: 'أسابيع', monthsMode: 'أشهر', apply: 'تطبيق', pickStart: 'اختر يوم البداية والنهاية',
    nodata: 'لا توجد بيانات لهذه الفترة بعد.', districts: 'الأحياء', totalOrders: 'الطلبات', totalKg: 'كغ مجمّعة',
    district: 'الحي', approx: 'موقع تقريبي', unplaced: n => `${n} طلب بلا حي مسجل ولا تظهر على الخريطة.`,
    mapSrc: (m, s) => `طلبات Odoo (${m === 'live' ? 'مباشر' : 'لقطة ' + s}). الطلبات = كل العملاء المسجلين في الفترة، الاستلامات = الناجحة، الكيلو = الوزن المسجل.`,
    monthGran: m => `وضع اللقطة يحتوي على ${m} فقط (أعلى ٣٢٠ حياً)؛ اربط Odoo لعرض كل التواريخ والأحياء.`,
    srcLine: (k, m, t) => `${k}: ${m}${t ? ' (' + t + ')' : ''}`,
    srcSheets: 'Google Sheets (التبويب اليومي والتوقعات)', srcOdoo: 'Odoo CRM', srcAds: 'Supermetrics',
    overheadNote: 'المستهدف يشمل المصاريف التسويقية العامة من التوقعات كما في تبويب MTD، بينما الإنفاق الفعلي هو إنفاق الوسائط من التبويب اليومي.',
    dates: (a, b) => a === b ? a : `${a} ← ${b}`, lastRep: d => `آخر يوم مسجل ${d}`,
    series: { spend: 'الإنفاق', target: 'مستهدف الإنفاق', kg: 'كغ', cpk: 'تكلفة الكيلو (متوسط ٧ أيام)' },
  },
};
const PLAT = { snapchat: ['Snapchat', '#eda737'], meta: ['Meta', '#1d4a4f'], google: ['Google Ads', '#0ca39d'], tiktok: ['TikTok', '#b54e37'] };
let lang = localStorage.getItem('awon-lang') || 'en';
const t = k => T[lang][k];
const t18 = t;

// ---------------- formatting ----------------
const loc = () => (lang === 'ar' ? 'ar-SA-u-nu-latn' : 'en-US');
const fmtN = (v, d = 0) => v == null || !isFinite(v) ? '-' : new Intl.NumberFormat(loc(), { maximumFractionDigits: d, minimumFractionDigits: d }).format(v);
const fmtUSD = (v, d) => v == null || !isFinite(v) ? '-' : '$' + fmtN(v, d ?? (Math.abs(v) < 10 ? 2 : 0));
const fmtC = v => v == null || !isFinite(v) ? '-' : '$' + fmtN(v, v < 1 ? 3 : 2);
const fmtP = v => v == null || !isFinite(v) ? '-' : fmtN(v * 100, 1) + '%';
const num = s => `<span class="num">${s}</span>`;
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// status: kind = 'cost' (lower is better) | 'volume' (higher is better) | 'pace' (close is better)
function status(a, tgt, kind) {
  if (a == null || tgt == null || !tgt) return '';
  const r = a / tgt;
  if (kind === 'cost') return r <= 1.02 ? 'good' : r <= 1.1 ? 'warn' : 'bad';
  if (kind === 'volume') return r >= 0.98 ? 'good' : r >= 0.9 ? 'warn' : 'bad';
  return Math.abs(r - 1) <= 0.1 ? 'good' : Math.abs(r - 1) <= 0.2 ? 'warn' : 'bad';
}

// ---------------- dates / range ----------------
const todayKSA = () => new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 10);
const addD = (iso, n) => { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const FIRST = '2026-02-01';
let state = JSON.parse(sessionStorage.getItem('awon-range') || 'null') || { preset: 'month' };
function resolve(s) {
  const tdy = todayKSA();
  switch (s.preset) {
    case 'all': return { from: FIRST, to: tdy };
    case 'yesterday': { const y = addD(tdy, -1); return { from: y, to: y }; }
    case '7d': return { from: addD(tdy, -7), to: addD(tdy, -1) };
    case 'month': return { from: tdy.slice(0, 8) + '01', to: tdy };
    default: return { from: s.from, to: s.to };
  }
}

// ---------------- data ----------------
let perf = null, heat = null, chart = null, map = null, heatLayer = null, markers = null;
let metric = 'orders', mcity = 'all';
async function getJSON(u) {
  const r = await fetch(u, { credentials: 'same-origin' });
  const j = await r.json().catch(() => ({ error: `HTTP ${r.status}` }));
  if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
  return j;
}
// Data flow: /api/dataset is fetched once (and every 5 min); every timeframe is then computed in the
// browser, so switching dates is instant. The map fetches per range, lazily, and caches per range.
let dataset = null, dataErr = null;
const heatCache = new Map();
async function fetchDataset(force) {
  document.body.classList.add('loading');
  try { dataset = await getJSON('/api/dataset' + (force ? '?t=' + Date.now() : '')); dataErr = null; }
  catch (e) { dataErr = e.message; }
  document.body.classList.remove('loading');
}
function recompute() {
  const { from, to } = resolve(state);
  $('#perfErr').innerHTML = dataErr ? `<div class="err">${esc(dataErr)}</div>` : '';
  perf = dataset && window.AwonCalc ? AwonCalc.compute(dataset, from, to) : null;
  if (perf && !perf.range.lastReported && !dataErr) $('#perfErr').innerHTML = `<div class="err" style="color:var(--muted);background:#fff;border-color:var(--line)">${esc(lang === 'ar' ? 'لا توجد بيانات مسجلة لهذه الفترة بعد: يُحدَّث الشيت يومياً.' : 'Nothing reported for this period yet: the sheet is updated daily.')}</div>`;
  const key = from + '|' + to;
  heat = heatCache.get(key) || null;
  render();
  if (!heat && !$('#view-map').hidden) loadHeat(key, from, to);
}
async function loadHeat(key, from, to) {
  if (heatCache.has(key)) return;
  heatCache.set(key, null);
  $('#mapNotes').innerHTML = `<li>${esc(lang === 'ar' ? 'جارٍ تحميل الخريطة…' : 'Loading map…')}</li>`;
  let h;
  try { h = await getJSON(`/api/heatmap?from=${from}&to=${to}`); } catch (e) { h = { error: e.message, points: [] }; }
  heatCache.set(key, h);
  const cur = resolve(state);
  if (cur.from + '|' + cur.to === key) { heat = h; renderMap(); }
}
async function load(force) { await fetchDataset(force); if (force) heatCache.clear(); recompute(); }

// ---------------- render ----------------
function render() {
  document.documentElement.lang = lang; document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  $$('[data-i18n]').forEach(el => { const v = t(el.dataset.i18n); if (typeof v === 'string') el.textContent = v; });
  $('#lang').textContent = lang === 'ar' ? 'English' : 'العربية';
  $('#lang').lang = lang === 'ar' ? 'en' : 'ar';
  $$('[data-preset]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.preset === state.preset)));
  $$('[data-mcity]').forEach(b => { if (b.dataset.mcity === 'riyadh') b.textContent = lang === 'ar' ? 'الرياض' : 'Riyadh'; if (b.dataset.mcity === 'jeddah') b.textContent = lang === 'ar' ? 'جدة' : 'Jeddah'; });
  const { from, to } = resolve(state);
  $('#rangeLabel').innerHTML = `<b>${num(esc(t('dates')(from, to)))}</b>${perf?.range?.lastReported ? ' · ' + esc(t('lastRep')(perf.range.lastReported)) : ''}`;
  renderFresh(); renderPerf(); renderMap();
}

function renderFresh() {
  const modes = perf ? [perf.sources.sheets.mode, perf.sources.odoo.mode, perf.sources.ads.mode] : [];
  const allLive = modes.length && modes.every(m => m === 'live');
  $('#fresh .dot').classList.toggle('snap', !allLive);
  const tm = new Intl.DateTimeFormat(loc(), { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Riyadh' }).format(new Date());
  $('#freshTxt').textContent = `${allLive ? t('live') : t('snapshot')} · ${t('updated')} ${tm}`;
}

function kpi(label, val, tgtVal, fmt, kind) {
  const a = val, g = tgtVal;
  const st = status(a, g, kind);
  const pct = g ? Math.max(0, Math.min(100, (a / g) * 100)) : 0;
  const diff = g ? (a / g - 1) : null;
  const dtxt = diff == null ? '' : `${diff >= 0 ? '+' : '−'}${fmtN(Math.abs(diff) * 100, 0)}%`;
  return `<div class="kpi"><div class="k">${esc(label)}</div><div class="v">${num(fmt(a))}</div>
    <div class="bar"><i class="${st}" style="width:${pct}%"></i></div>
    <div class="t"><span>${esc(t('target'))} ${num(fmt(g))}</span><span class="d ${st}">${num(dtxt)}</span></div></div>`;
}

function renderPerf() {
  if (!perf) return;
  const T0 = perf.totals, G = perf.groups;
  // north star
  $('#cpk').textContent = fmtC(T0.cpk);
  const st = status(T0.cpk, T0.cpkT, 'cost');
  const diff = T0.cpkT ? T0.cpk / T0.cpkT - 1 : null;
  const p = diff == null ? '' : (diff > 0 ? t('over')(num(fmtN(diff * 100, 0) + '%')) : t('under')(num(fmtN(-diff * 100, 0) + '%')));
  $('#cpkTxt').innerHTML = T0.cpkT ? t('cpkLine')(fmtC(T0.cpk), num(fmtC(T0.cpkT)), p) : '';
  const v = $('#cpkVerdict'); v.className = 'verdict ' + st;
  v.textContent = st === 'good' ? t('onTrack') : st ? t('behind') : '';
  $('#groups').innerHTML = ['paid', 'organic', 'wa'].map(g => {
    const x = G[g]; const s = status(x.cpk, x.cpkT, 'cost');
    return `<div class="sg"><h3>${esc(t(g))}</h3><div class="meta">${esc(t('groupMeta')(fmtUSD(x.spend), fmtN(x.weight)))}</div>
      <div class="v"><span class="num cpk-cell ${s}">${fmtC(x.cpk)}</span><span class="t">${esc(t('target'))} ${num(fmtC(x.cpkT))}</span></div></div>`;
  }).join('');
  $('#kpiMkt').innerHTML = [
    kpi(t('spend'), T0.spend, T0.spendT, fmtUSD, 'pace'),
    kpi(t('leads'), T0.leads, T0.leadsT, v => fmtN(v), 'volume'),
    kpi(t('cpl'), T0.cpl, T0.cplT, fmtC, 'cost'),
    ...['paid', 'organic', 'wa'].map(g => kpi(`${t(g)}: ${t('leads')}`, G[g].leads, G[g].leadsT, v => fmtN(v), 'volume')),
  ].join('');
  $('#kpiLog').innerHTML = [
    kpi(t('pickups'), T0.pickups, T0.pickupsT, v => fmtN(v), 'volume'),
    kpi(t('weight'), T0.weight, T0.weightT, v => fmtN(v) + (lang === 'ar' ? ' كغ' : ' kg'), 'volume'),
    kpi(t('pickupRate'), T0.pickupRate, T0.pickupRateT, fmtP, 'volume'),
    kpi(t('kgPerPickup'), T0.kgPerPickup, T0.kgPerPickupT, v => fmtN(v, 1), 'volume'),
    kpi(t('cac'), T0.cac, T0.cacT, fmtC, 'cost'),
  ].join('');

  // platforms
  const rows = perf.platforms;
  $('#platTbl').innerHTML = `<thead><tr><th>${t('platform')}</th><th>${t('spend')}</th><th>${t('crmLeads')}</th><th>${t('cpl')}</th><th>${t('pickups')}</th><th>kg</th><th>${t('cpk')}</th><th>${t('platConv')}</th></tr></thead><tbody>` +
    rows.map(r => {
      const low = r.spend > 500 && r.crmLeads < r.spend / 100;
      return `<tr><td><span class="plat"><i style="background:${PLAT[r.platform][1]}"></i>${PLAT[r.platform][0]}</span>${low ? `<span class="flag">${esc(t('lowAttr'))}</span>` : ''}</td>
      <td>${num(fmtUSD(r.spend))}</td><td>${num(fmtN(r.crmLeads))}</td><td>${num(fmtC(r.cpl))}</td><td>${num(fmtN(r.pickups))}</td>
      <td>${num(fmtN(r.weight))}</td><td class="cpk-cell ${status(r.cpk, G.paid.cpkT, 'cost')}">${num(fmtC(r.cpk))}</td><td>${num(fmtN(r.platformLeads))}</td></tr>`;
    }).join('') + '</tbody>' + (() => {
      const t = perf.platforms.reduce((a, r) => ({ spend: a.spend + r.spend, crmLeads: a.crmLeads + r.crmLeads, pickups: a.pickups + r.pickups, weight: a.weight + r.weight, platformLeads: a.platformLeads + r.platformLeads }), { spend: 0, crmLeads: 0, pickups: 0, weight: 0, platformLeads: 0 });
      return `<tfoot><tr><td>${esc(t18('total'))}</td><td>${num(fmtUSD(t.spend))}</td><td>${num(fmtN(t.crmLeads))}</td><td>${num(fmtC(t.crmLeads ? t.spend / t.crmLeads : null))}</td><td>${num(fmtN(t.pickups))}</td><td>${num(fmtN(t.weight))}</td><td>${num(fmtC(t.weight ? t.spend / t.weight : null))}</td><td>${num(fmtN(t.platformLeads))}</td></tr></tfoot>`;
    })();
  const rc = perf.reconciliation;
  $('#recon').textContent = t('reconTxt')(fmtUSD(rc.adPlatformsSpend), fmtUSD(rc.sheetPaidSpend));

  // cities
  const maxKg = Math.max(1, ...perf.cities.map(c => c.weightT || c.weight));
  $('#cityTbl').innerHTML = `<thead><tr><th>${t('city')}</th><th>${t('spend')}</th><th>${t('leads')}</th><th>${t('pickups')}</th><th>kg</th><th>${t('cpk')}</th></tr></thead><tbody>` +
    perf.cities.map(c => `<tr><td>${esc(c.label[lang])}</td>
      <td>${num(fmtUSD(c.spend))}<span class="sub">${esc(t('target'))} ${num(fmtUSD(c.spendT))}</span></td>
      <td>${num(fmtN(c.leads))}<span class="sub">${num(fmtN(c.leadsT))}</span></td>
      <td>${num(fmtN(c.pickups))}<span class="sub">${num(fmtN(c.pickupsT))}</span></td>
      <td>${num(fmtN(c.weight))}<span class="minibar"><i style="width:${Math.min(100, c.weight / maxKg * 100)}%"></i></span><span class="sub">${num(fmtN(c.weightT))}</span></td>
      <td class="cpk-cell ${status(c.cpk, c.cpkT, 'cost')}">${num(fmtC(c.cpk))}<span class="sub">${num(fmtC(c.cpkT))}</span></td></tr>`).join('') + '</tbody>' +
    `<tfoot><tr><td>${esc(t18('total'))}</td>
      <td>${num(fmtUSD(T0.spend))}<span class="sub">${esc(t('target'))} ${num(fmtUSD(T0.spendT))}</span></td>
      <td>${num(fmtN(T0.leads))}<span class="sub">${num(fmtN(T0.leadsT))}</span></td>
      <td>${num(fmtN(T0.pickups))}<span class="sub">${num(fmtN(T0.pickupsT))}</span></td>
      <td>${num(fmtN(T0.weight))}<span class="sub">${num(fmtN(T0.weightT))}</span></td>
      <td class="cpk-cell ${status(T0.cpk, T0.cpkT, 'cost')}">${num(fmtC(T0.cpk))}<span class="sub">${num(fmtC(T0.cpkT))}</span></td></tr></tfoot>`;

  // chart
  const last = perf.range.lastReported || perf.range.to;
  const s = perf.series.filter(x => x.date <= last).map((x, i, arr) => {
    const win = arr.slice(Math.max(0, i - 6), i + 1); const sp = win.reduce((a, y) => a + y.spend, 0), kg = win.reduce((a, y) => a + y.weight, 0);
    return { ...x, cpk7: kg ? sp / kg : null };
  });
  const cfg = {
    data: { labels: s.map(x => x.date.slice(5)), datasets: [
      { type: 'bar', label: t('series').spend, data: s.map(x => x.spend), backgroundColor: '#0ca39d', borderRadius: 4, yAxisID: 'y' },
      { type: 'line', label: t('series').target, data: s.map(x => x.spendT), borderColor: '#1d4a4f', borderDash: [5, 4], pointRadius: 0, borderWidth: 1.5, yAxisID: 'y' },
      { type: 'line', label: t('series').cpk, data: s.map(x => x.cpk7), borderColor: '#eda737', backgroundColor: '#eda737', pointRadius: s.length > 45 ? 0 : 2.5, borderWidth: 2, yAxisID: 'y2', spanGaps: true },
    ] },
    options: { maintainAspectRatio: false, animation: false, interaction: { mode: 'index', intersect: false },
      plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { family: 'IBM Plex Sans Arabic' } } } },
      scales: { x: { reverse: lang === 'ar', grid: { display: false }, ticks: { maxTicksLimit: 12 } },
        y: { position: lang === 'ar' ? 'right' : 'left', grid: { color: 'rgba(29,74,79,.08)' }, ticks: { callback: v => '$' + fmtN(v) } },
        y2: { position: lang === 'ar' ? 'left' : 'right', grid: { display: false }, ticks: { callback: v => '$' + fmtN(v, 2) } } } },
  };
  if (chart) chart.destroy();
  if (window.Chart) chart = new Chart($('#trend'), cfg);

  // notes / sources
  const src = perf.sources;
  const when = x => { const d = x ? new Date(x) : null; return d && !isNaN(d) ? d.toISOString().slice(0, 16).replace('T', ' ') : ''; };
  const lines = [
    t('srcLine')(t('srcSheets'), src.sheets.mode === 'live' ? t('live') : t('snapshot'), src.sheets.mode === 'live' ? when(src.sheets.mtdModified) : when(src.sheets.snapshotAt)),
    t('srcLine')(t('srcOdoo'), src.odoo.mode === 'live' ? t('live') : t('snapshot'), src.odoo.mode === 'live' ? '' : when(src.odoo.snapshotAt)),
    t('srcLine')(t('srcAds'), src.ads.mode === 'live' ? t('live') : t('snapshot'), src.ads.coverage ? `${src.ads.coverage.from} → ${src.ads.coverage.to}` : ''),
    t('overheadNote'), ...(perf.notes || []), ...((src.ads.errors) || []),
  ];
  const tabs = Object.entries(src.sheets.tabs || {}).map(([k, v]) => `${k}: “${(v.daily || '-').trim()}” / “${(v.forecast || '-').trim()}”`);
  $('#notes').innerHTML = lines.map(l => `<li>${esc(l)}</li>`).join('') + (tabs.length ? `<li>${esc(tabs.join(' · '))}</li>` : '');
}

// ---------------- map ----------------
function initMap() {
  if (map || !window.L) return;
  map = L.map('map', { zoomControl: true, attributionControl: true }).setView([23.9, 45.1], 5);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>', maxZoom: 18 }).addTo(map);
  markers = L.layerGroup().addTo(map);
}
function renderMap() {
  if ($('#view-map').hidden) return;
  initMap();
  if (!map) return;
  if (!heat) return;
  const pts = (heat.points || []).filter(p => mcity === 'all' ? true : mcity === 'other' ? !['riyadh', 'jeddah'].includes(p.city) : p.city === mcity);
  const val = p => p[metric];
  const max = Math.max(1, ...pts.map(val));
  if (heatLayer) { map.removeLayer(heatLayer); heatLayer = null; }
  if (L.heatLayer && pts.length) {
    try {
      heatLayer = L.heatLayer(pts.map(p => [p.lat, p.lng, Math.sqrt(val(p) / max)]), { radius: 22, blur: 18, maxZoom: 13,
        gradient: { 0.2: '#b7ece8', 0.45: '#0ca39d', 0.7: '#eda737', 1: '#b54e37' } }).addTo(map);
    } catch (e) { console.warn('heat layer', e); }
  }
  markers.clearLayers();
  pts.slice(0, 400).forEach(p => {
    L.circleMarker([p.lat, p.lng], { radius: 3 + 11 * Math.sqrt(val(p) / max), color: '#1d4a4f', weight: 1, fillColor: '#0ca39d', fillOpacity: .15, opacity: .35 })
      .bindTooltip(`<b>${esc(lang === 'ar' ? p.ar : p.en)}</b>: ${esc(lang === 'ar' ? p.cityAr : p.cityEn)}<br>${t('orders')}: ${fmtN(p.orders)} · ${t('pickups')}: ${fmtN(p.pickups)} · kg: ${fmtN(p.kg)}${p.precision === 'city' ? `<br><span class="approx">${t('approx')}</span>` : ''}`)
      .addTo(markers);
  });
  if (pts.length && mcity !== 'all') map.fitBounds(L.latLngBounds(pts.map(p => [p.lat, p.lng])).pad(0.1), { maxZoom: 11 });
  else if (mcity === 'all') map.setView([23.9, 45.1], 5);
  const tot = pts.reduce((a, p) => ({ o: a.o + p.orders, k: a.k + p.kg, n: a.n + 1 }), { o: 0, k: 0, n: 0 });
  $('#mapStats').innerHTML = `<div class="kpi"><div class="k">${t('totalOrders')}</div><div class="v">${num(fmtN(tot.o))}</div></div>
    <div class="kpi"><div class="k">${t('totalKg')}</div><div class="v">${num(fmtN(tot.k))}</div></div>
    <div class="kpi"><div class="k">${t('districts')}</div><div class="v">${num(fmtN(tot.n))}</div></div>`;
  const top = [...pts].sort((a, b) => val(b) - val(a)).slice(0, 15);
  $('#topTbl').innerHTML = `<thead><tr><th>${t('district')}</th><th>${t('city')}</th><th>${t('orders')}</th><th>kg</th><th>kg/${lang === 'ar' ? 'طلب' : 'order'}</th></tr></thead><tbody>` +
    top.map(p => `<tr><td>${esc(lang === 'ar' ? p.ar : p.en)}${p.precision === 'city' ? ' <span class="approx">•</span>' : ''}</td><td>${esc(lang === 'ar' ? p.cityAr : p.cityEn)}</td><td>${num(fmtN(p.orders))}</td><td>${num(fmtN(p.kg))}</td><td>${num(fmtN(p.orders ? p.kg / p.orders : null, 1))}</td></tr>`).join('') + '</tbody>' + (() => {
      const o = pts.reduce((a, p) => a + p.orders, 0), k = pts.reduce((a, p) => a + p.kg, 0);
      return `<tfoot><tr><td>${esc(t18('totalAll'))}</td><td></td><td>${num(fmtN(o))}</td><td>${num(fmtN(k))}</td><td>${num(fmtN(o ? k / o : null, 1))}</td></tr></tfoot>`;
    })();
  const notes = [];
  if (heat.error) notes.push(heat.error);
  if (heat.source) notes.push(t('mapSrc')(heat.source, (heat.snapshotAt || '').slice(0, 10)));
    if (heat.unplaced?.orders) notes.push(t('unplaced')(fmtN(heat.unplaced.orders)));
  if ((heat.points || []).some(p => p.precision === 'city')) notes.push(`• ${t('approx')}`);
  $('#mapNotes').innerHTML = notes.map(n => `<li>${esc(n)}</li>`).join('');
  setTimeout(() => map.invalidateSize(), 50);
}

// ---------------- date picker ----------------
const picker = $('#picker');
let pk = { mode: 'days', cursor: todayKSA().slice(0, 7), a: null, b: null };
const MONTHS = { en: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'], ar: ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'] };
const DOW = { en: ['Su','Mo','Tu','We','Th','Fr','Sa'], ar: ['ح','ن','ث','ر','خ','ج','س'] };
function openPicker() {
  const r = $('#customBtn').getBoundingClientRect();
  picker.hidden = false;
  const left = lang === 'ar' ? Math.max(8, r.right - 320) : Math.min(r.left, innerWidth - 330);
  picker.style.left = left + scrollX + 'px'; picker.style.top = r.bottom + scrollY + 8 + 'px';
  const cur = resolve(state); pk.a = cur.from; pk.b = cur.to; pk.cursor = cur.to.slice(0, 7);
  drawPicker();
}
function drawPicker() {
  const [y, m] = pk.cursor.split('-').map(Number);
  const tdy = todayKSA();
  const inR = d => pk.a && pk.b && d >= pk.a && d <= pk.b;
  const seg = `<div class="seg">${['days', 'weeks', 'months'].map(md => `<button data-mode="${md}" aria-pressed="${pk.mode === md}">${t(md + 'Mode')}</button>`).join('')}</div>`;
  let head, body;
  if (pk.mode === 'months') {
    head = `<div class="cal-h"><button data-nav="-12">‹</button><b class="num">${y}</b><button data-nav="12">›</button></div>`;
    body = `<div class="cal months">${MONTHS[lang].map((nm, i) => { const k = `${y}-${String(i + 1).padStart(2, '0')}`;
      const dis = k < FIRST.slice(0, 7) || k > tdy.slice(0, 7);
      const sel = pk.a && pk.a.slice(0, 7) <= k && pk.b.slice(0, 7) >= k;
      return `<button data-month="${k}" ${dis ? 'disabled' : ''} class="${sel ? 'in' : ''}">${nm}</button>`; }).join('')}</div>`;
  } else {
    head = `<div class="cal-h"><button data-nav="-1">‹</button><b>${MONTHS[lang][m - 1]} <span class="num">${y}</span></b><button data-nav="1">›</button></div>`;
    const first = new Date(Date.UTC(y, m - 1, 1)); const start = addD(pk.cursor + '-01', -first.getUTCDay());
    const cells = [];
    for (let w = 0; w < 6; w++) {
      const days = Array.from({ length: 7 }, (_, i) => addD(start, w * 7 + i));
      if (w > 3 && days[0].slice(0, 7) !== pk.cursor) break;
      if (pk.mode === 'weeks') {
        const sel = inR(days[0]) && inR(days[6]);
        cells.push(`<button class="row ${sel ? 'in' : ''}" data-week="${days[0]}" ${days[0] > tdy ? 'disabled' : ''}>${days.map(d => `<span style="opacity:${d.slice(0, 7) === pk.cursor ? 1 : .35}">${+d.slice(8)}</span>`).join('')}</button>`);
      } else {
        days.forEach(d => { const cls = (d === pk.a || d === pk.b) ? 'edge' : inR(d) ? 'in' : '';
          cells.push(`<button data-day="${d}" class="${cls}" style="${d.slice(0, 7) !== pk.cursor ? 'opacity:.35' : ''}" ${d > tdy || d < FIRST ? 'disabled' : ''}>${+d.slice(8)}</button>`); });
      }
    }
    body = `<div class="cal ${pk.mode}">${DOW[lang].map(d => `<span class="dow">${d}</span>`).join('')}${cells.join('')}</div>`;
  }
  picker.innerHTML = seg + head + body + `<div class="picker-f"><span class="num">${pk.a ? esc(t('dates')(pk.a, pk.b || pk.a)) : esc(t('pickStart'))}</span><button data-apply>${t('apply')}</button></div>`;
}
picker.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  e.stopPropagation();
  const endOfMonth = k => { const [y, m] = k.split('-').map(Number); const d = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10); return d > todayKSA() ? todayKSA() : d; };
  if (b.dataset.mode) { pk.mode = b.dataset.mode; }
  else if (b.dataset.nav) { const n = +b.dataset.nav; const [y, m] = pk.cursor.split('-').map(Number); const d = new Date(Date.UTC(y, m - 1 + n, 1)); pk.cursor = d.toISOString().slice(0, 7); }
  else if (b.dataset.day) { const d = b.dataset.day; if (!pk.a || (pk.a && pk.b && pk.a !== pk.b) || d < pk.a) { pk.a = d; pk.b = d; } else pk.b = d; }
  else if (b.dataset.week) { const s = b.dataset.week; let e2 = addD(s, 6); if (e2 > todayKSA()) e2 = todayKSA();
    if (e.shiftKey && pk.a) { pk.a = s < pk.a ? s : pk.a; pk.b = e2 > pk.b ? e2 : pk.b; } else { pk.a = s < FIRST ? FIRST : s; pk.b = e2; } }
  else if (b.dataset.month) { const k = b.dataset.month; const s = k + '-01', e2 = endOfMonth(k);
    if (pk.a && pk.b && pk.a.slice(0, 7) !== pk.b.slice(0, 7) || !pk.a || pk.a.slice(8) !== '01' || s < pk.a) { pk.a = s; pk.b = e2; }
    else if (pk.a.slice(0, 7) === k) { pk.a = s; pk.b = e2; } else pk.b = e2; }
  else if ('apply' in b.dataset) { if (pk.a) { state = { preset: 'custom', from: pk.a, to: pk.b || pk.a }; save(); picker.hidden = true; recompute(); } return; }
  drawPicker();
});
document.addEventListener('click', e => { if (!picker.hidden && !picker.contains(e.target) && e.target.id !== 'customBtn') picker.hidden = true; });
function save() { sessionStorage.setItem('awon-range', JSON.stringify(state)); }

// ---------------- events ----------------
$$('[data-preset]').forEach(b => b.addEventListener('click', e => {
  if (b.dataset.preset === 'custom') { e.stopPropagation(); picker.hidden ? openPicker() : (picker.hidden = true); return; }
  state = { preset: b.dataset.preset }; save(); recompute();
}));
$('#lang').addEventListener('click', () => { lang = lang === 'ar' ? 'en' : 'ar'; localStorage.setItem('awon-lang', lang); picker.hidden = true; render(); });
$('#refresh').addEventListener('click', () => load(true));
function showTab(which) {
  const isMap = which === 'map';
  $('#tab-perf').setAttribute('aria-selected', String(!isMap)); $('#tab-map').setAttribute('aria-selected', String(isMap));
  $('#view-perf').hidden = isMap; $('#view-map').hidden = !isMap;
  location.hash = isMap ? 'map' : '';
  if (isMap && !heat) { const r = resolve(state); loadHeat(r.from + '|' + r.to, r.from, r.to); }
  renderMap();
}
$('#tab-perf').addEventListener('click', () => showTab('perf'));
$('#tab-map').addEventListener('click', () => showTab('map'));
$$('[data-metric]').forEach(b => b.addEventListener('click', () => { metric = b.dataset.metric; $$('[data-metric]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); renderMap(); }));
$$('[data-mcity]').forEach(b => b.addEventListener('click', () => { mcity = b.dataset.mcity; $$('[data-mcity]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); renderMap(); }));

if (location.hash === '#map') showTab('map');
render();
load();
setInterval(() => { if (!document.hidden) load(); }, 5 * 60 * 1000);   // background refresh; the CDN serves cached data instantly
})();
