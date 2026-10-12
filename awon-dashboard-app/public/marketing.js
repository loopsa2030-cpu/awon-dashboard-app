/* Awon dashboard: Marketing tab (source-level performance for the marketing team). EN/AR, all computed in the browser. */
(function () {
'use strict';
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];

// ---------------- strings ----------------
const T = {
  en: {
    insights: 'What changed and what to do', insightsSub: (a, b) => `Selected period compared with the ${a} days before it (${b})`,
    noInsights: 'No big moves against the previous period. Keep budgets steady and keep testing creatives.',
    paid: 'Paid ads', organic: 'Organic', wa: 'WhatsApp & CRM', cities: 'Cities (daily sheet view)', daily: 'Daily sheet',
    cohorts: 'Weekly cohorts and breakdowns',
    spend: 'Spend', crmLeads: 'CRM leads', nativeLeads: 'Native leads', crmCpl: 'CRM CPL', nativeCpl: 'Native CPL', gap: 'Native vs CRM',
    visits: 'Website visits', paidVisits: 'Paid website visits', orgVisits: 'Organic website visits', cvr: 'CVR', clicks: 'Clicks', clickToVisit: 'Clicks to visits',
    leads: 'Leads', cpl: 'CPL', share: 'Share', platform: 'Platform', source: 'Source', city: 'City', date: 'Date', total: 'Total', week: 'Week',
    vsPrev: 'vs previous period', national: 'All cities / national', untagged: 'Untagged paid (no platform)',
    snapchat: 'Snapchat', google: 'Google Ads', meta: 'Meta', tiktok: 'TikTok',
    o_web: 'Website organic', o_meta: 'Organic Meta', o_tiktok: 'Organic TikTok', o_snap: 'Organic Snapchat', o_other: 'Partners, PR and other',
    waSrc: 'WhatsApp & CRM',
    allPlat: 'All platforms', allCities: 'All cities',
    vLeads: 'Leads by platform', vCpl: 'CPL by platform', vGap: 'CRM vs native leads', vVisits: 'Visits and CVR', vSpend: 'Spend and CPL',
    mCpl: 'CPL', mLeads: 'Leads', mSpend: 'Spend',
    cohortTitle: 'Week by week per source', weekdayTitle: 'Day of week (average per day)', cityPlatTitle: 'Paid CRM CPL by city and platform',
    cohortNote: 'Weeks start on Sunday. Darker green = better than that source\'s average, darker red = worse.',
    notes: 'How these numbers work',
    n1: 'CRM leads come from Odoo sources; native leads are what each ad platform reports (Meta = WhatsApp conversations started).',
    n2: 'Paid spend and native leads come from the ad platforms (lead-gen campaigns only). City comes from the campaign name; campaigns for all cities show as national.',
    n3: 'Website visits are GA4 sessions. GA4 has no city data for this site, so paid visits get their city from the campaign name and organic visits have no city.',
    n4: 'Organic CPL: Meta, TikTok and Snapchat use the branding spend on that platform; website organic uses the organic budget from the Daily tab; partners and PR have no direct spend.',
    n5: 'City tables use the Daily tab, so they match the sheet the team fills in every day.',
    n6: 'Insights compare the selected period with the same number of days just before it, and ignore sources with too little volume to judge.',
    up: 'up', down: 'down',
    // insight templates
    iCplGood: (s, p, a, b) => `${s}: CRM CPL ${p} lower (${a} vs ${b})`,
    iCplBad: (s, p, a, b) => `${s}: CRM CPL ${p} higher (${a} vs ${b})`,
    iLeadsUp: (s, p, n) => `${s}: leads ${p} higher (${n})`,
    iLeadsDown: (s, p, n) => `${s}: leads ${p} lower (${n})`,
    iGap: (s, p) => `${s}: the platform reports ${p} more leads than reached the CRM`,
    iCvrDown: (s, a, b) => `${s}: website CVR fell to ${a} (from ${b})`,
    iCvrUp: (s, a, b) => `${s}: website CVR rose to ${a} (from ${b})`,
    iLoss: (s, p) => `${s}: only ${p} of ad clicks arrive as website visits`,
    iShift: (a, b, x, y) => `${a} brings CRM leads at ${x}, ${b} at ${y}`,
    aScale: (s) => `Scale ${s} gradually (+15 to 20% budget every 2 to 3 days) while CPL holds; duplicate the best ad sets and keep the same audiences and creatives.`,
    aScaleCity: (s, c) => `Move budget into ${s} in ${c}: raise that city's daily budget step by step and watch CPL daily.`,
    aFix: (s) => `Check ${s} for creative fatigue (frequency, CTR drop), refresh 2 to 3 creatives, tighten audiences and pause the weakest ad sets; cut budget if CPL does not recover in 3 days.`,
    aFixCity: (s, c) => `Review ${s} in ${c}: compare creatives and targeting with the best city, cut the weakest ad sets and reallocate.`,
    aLeadsDown: (s) => `Check ${s} delivery (budget caps, rejected ads, learning phase) and landing page; compare with the previous period's top creatives.`,
    aLeadsUp: (s) => `Find what changed on ${s} (new creative, post, offer, partner) and repeat it; make sure pickups can absorb the extra leads.`,
    aGap: (s) => `Audit tracking on ${s}: test the form and the Odoo source tagging end to end, and check for duplicate or spam leads.`,
    aCvrDown: (s) => `Check the ${s} landing page: load speed, form errors, broken WhatsApp link; compare by device.`,
    aCvrUp: (s) => `Keep the current ${s} landing setup and push more traffic to it.`,
    aLoss: (s) => `Most ${s} clicks are lost before the page loads: speed up the landing page, check UTM tags and accidental clicks.`,
    aShift: (a, b) => `Shift 10 to 20% of ${b} budget to ${a} and review after 3 days.`,
  },
  ar: {
    insights: 'ما الذي تغيّر وماذا نفعل', insightsSub: (a, b) => `الفترة المحددة مقارنة بالـ ${a} يوماً السابقة لها (${b})`,
    noInsights: 'لا تغيرات كبيرة مقارنة بالفترة السابقة. حافظوا على الميزانيات واستمروا في اختبار الإعلانات.',
    paid: 'الإعلانات المدفوعة', organic: 'العضوي', wa: 'واتساب وإعادة التفعيل', cities: 'المدن (عرض الشيت اليومي)', daily: 'الشيت اليومي',
    cohorts: 'المجموعات الأسبوعية والتقسيمات',
    spend: 'الإنفاق', crmLeads: 'عملاء CRM', nativeLeads: 'عملاء المنصة', crmCpl: 'تكلفة عميل CRM', nativeCpl: 'تكلفة عميل المنصة', gap: 'المنصة مقابل CRM',
    visits: 'زيارات الموقع', paidVisits: 'زيارات الموقع المدفوعة', orgVisits: 'زيارات الموقع العضوية', cvr: 'نسبة التحويل', clicks: 'النقرات', clickToVisit: 'النقرات إلى زيارات',
    leads: 'العملاء', cpl: 'تكلفة العميل', share: 'الحصة', platform: 'المنصة', source: 'المصدر', city: 'المدينة', date: 'التاريخ', total: 'الإجمالي', week: 'الأسبوع',
    vsPrev: 'مقارنة بالفترة السابقة', national: 'كل المدن / وطني', untagged: 'مدفوع غير مصنف',
    snapchat: 'سناب شات', google: 'إعلانات جوجل', meta: 'ميتا', tiktok: 'تيك توك',
    o_web: 'الموقع (عضوي)', o_meta: 'ميتا العضوي', o_tiktok: 'تيك توك العضوي', o_snap: 'سناب العضوي', o_other: 'الشركاء والعلاقات العامة وغيرها',
    waSrc: 'واتساب وإعادة التفعيل',
    allPlat: 'كل المنصات', allCities: 'كل المدن',
    vLeads: 'العملاء حسب المنصة', vCpl: 'تكلفة العميل حسب المنصة', vGap: 'CRM مقابل المنصة', vVisits: 'الزيارات والتحويل', vSpend: 'الإنفاق وتكلفة العميل',
    mCpl: 'تكلفة العميل', mLeads: 'العملاء', mSpend: 'الإنفاق',
    cohortTitle: 'أسبوعاً بأسبوع لكل مصدر', weekdayTitle: 'حسب يوم الأسبوع (متوسط يومي)', cityPlatTitle: 'تكلفة عميل CRM المدفوع حسب المدينة والمنصة',
    cohortNote: 'الأسابيع تبدأ يوم الأحد. الأخضر الأغمق أفضل من متوسط المصدر، والأحمر الأغمق أسوأ.',
    notes: 'كيف تُحسب الأرقام',
    n1: 'عملاء CRM من مصادر Odoo؛ عملاء المنصة كما تعلنها كل منصة إعلانية (ميتا = محادثات واتساب).',
    n2: 'الإنفاق المدفوع وعملاء المنصة من المنصات الإعلانية (حملات جلب العملاء فقط). المدينة من اسم الحملة؛ حملات كل المدن تظهر كوطني.',
    n3: 'زيارات الموقع هي جلسات GA4. لا توجد بيانات مدن في GA4 لهذا الموقع، لذلك المدينة للزيارات المدفوعة من اسم الحملة والزيارات العضوية بلا مدينة.',
    n4: 'تكلفة العميل العضوي: ميتا وتيك توك وسناب تستخدم إنفاق العلامة على المنصة نفسها؛ الموقع يستخدم ميزانية العضوي من التبويب اليومي؛ الشركاء والعلاقات العامة بلا إنفاق مباشر.',
    n5: 'جداول المدن من التبويب اليومي لتطابق الشيت الذي يملؤه الفريق يومياً.',
    n6: 'الملاحظات تقارن الفترة المحددة بنفس عدد الأيام قبلها مباشرة، وتتجاهل المصادر ذات الحجم القليل.',
    up: 'ارتفاع', down: 'انخفاض',
    iCplGood: (s, p, a, b) => `${s}: تكلفة عميل CRM أقل بـ ${p} (${a} مقابل ${b})`,
    iCplBad: (s, p, a, b) => `${s}: تكلفة عميل CRM أعلى بـ ${p} (${a} مقابل ${b})`,
    iLeadsUp: (s, p, n) => `${s}: العملاء أعلى بـ ${p} (${n})`,
    iLeadsDown: (s, p, n) => `${s}: العملاء أقل بـ ${p} (${n})`,
    iGap: (s, p) => `${s}: المنصة تعلن عملاء أكثر بـ ${p} مما وصل إلى CRM`,
    iCvrDown: (s, a, b) => `${s}: نسبة تحويل الموقع انخفضت إلى ${a} (من ${b})`,
    iCvrUp: (s, a, b) => `${s}: نسبة تحويل الموقع ارتفعت إلى ${a} (من ${b})`,
    iLoss: (s, p) => `${s}: ${p} فقط من نقرات الإعلانات تصل كزيارات للموقع`,
    iShift: (a, b, x, y) => `${a} يجلب عميل CRM بـ ${x} و${b} بـ ${y}`,
    aScale: (s) => `زيدوا ميزانية ${s} تدريجياً (+١٥ إلى ٢٠٪ كل ٢ إلى ٣ أيام) ما دامت التكلفة ثابتة، وكرروا أفضل المجموعات الإعلانية بنفس الجمهور والإعلانات.`,
    aScaleCity: (s, c) => `انقلوا ميزانية إلى ${s} في ${c}: ارفعوا الميزانية اليومية للمدينة تدريجياً وراقبوا التكلفة يومياً.`,
    aFix: (s) => `افحصوا ${s} من ناحية تشبع الإعلانات (التكرار وانخفاض نسبة النقر)، جددوا ٢ إلى ٣ إعلانات، ضيّقوا الجمهور وأوقفوا أضعف المجموعات؛ خفّضوا الميزانية إن لم تتحسن خلال ٣ أيام.`,
    aFixCity: (s, c) => `راجعوا ${s} في ${c}: قارنوا الإعلانات والاستهداف بأفضل مدينة، أوقفوا الأضعف وأعيدوا التوزيع.`,
    aLeadsDown: (s) => `افحصوا وصول ${s} (حدود الميزانية، الإعلانات المرفوضة، مرحلة التعلم) وصفحة الهبوط، وقارنوا بأفضل إعلانات الفترة السابقة.`,
    aLeadsUp: (s) => `اعرفوا ما الذي تغيّر في ${s} (إعلان جديد، منشور، عرض، شريك) وكرروه، وتأكدوا أن الاستلام يستوعب العملاء الإضافيين.`,
    aGap: (s) => `دققوا التتبع في ${s}: اختبروا النموذج وتصنيف المصدر في Odoo من البداية للنهاية، وتحققوا من العملاء المكررين أو الوهميين.`,
    aCvrDown: (s) => `افحصوا صفحة هبوط ${s}: سرعة التحميل، أخطاء النموذج، رابط واتساب؛ وقارنوا حسب الجهاز.`,
    aCvrUp: (s) => `حافظوا على إعداد صفحة هبوط ${s} الحالي ووجهوا لها زيارات أكثر.`,
    aLoss: (s) => `معظم نقرات ${s} تضيع قبل تحميل الصفحة: سرّعوا صفحة الهبوط وتحققوا من وسوم UTM والنقرات العرضية.`,
    aShift: (a, b) => `انقلوا ١٠ إلى ٢٠٪ من ميزانية ${b} إلى ${a} وراجعوا بعد ٣ أيام.`,
  },
};
const CITY = {
  riyadh: ['Riyadh', 'الرياض'], jeddah: ['Jeddah', 'جدة'], mecca: ['Makkah', 'مكة'], taif: ['Taif', 'الطائف'], madina: ['Madinah', 'المدينة'],
  sharqia: ['Eastern Province', 'الشرقية'], asir: ['Asir', 'عسير'], hail: ['Hail', 'حائل'], qassim: ['Qassim', 'القصيم'], kharj: ['Al Kharj', 'الخرج'], yanbu: ['Yanbu', 'ينبع'],
};
const PAID = ['snapchat', 'google', 'meta', 'tiktok'];
const ORG = ['o_web', 'o_meta', 'o_tiktok', 'o_snap', 'o_other'];
const COL = { snapchat: '#eda737', google: '#0ca39d', meta: '#1d4a4f', tiktok: '#b54e37', untagged: '#9bb7b9',
  o_web: '#0ca39d', o_meta: '#1d4a4f', o_tiktok: '#b54e37', o_snap: '#eda737', o_other: '#9bb7b9', wa: '#24595f' };
const ORG_GA = { o_web: 'web', o_meta: 'meta', o_tiktok: 'tiktok', o_snap: 'snapchat' };       // organic platform -> GA4 platform
const ORG_BRAND = { o_meta: 'meta', o_tiktok: 'tiktok', o_snap: 'snapchat' };                    // organic platform -> branding spend platform

let L = 'en', t = k => T[L][k];
const ui = { paidView: 'leads', orgView: 'leads', cityPlat: 'all', dayCity: 'all', cohortMetric: 'cpl' };
try { Object.assign(ui, JSON.parse(localStorage.getItem('awon-mkt-ui') || '{}')); } catch (e) {}
const saveUi = () => { try { localStorage.setItem('awon-mkt-ui', JSON.stringify(ui)); } catch (e) {} };

// ---------------- format ----------------
const loc = () => (L === 'ar' ? 'ar-SA-u-nu-latn' : 'en-US');
const fN = (v, d = 0) => v == null || !isFinite(v) ? '-' : new Intl.NumberFormat(loc(), { maximumFractionDigits: d, minimumFractionDigits: d }).format(v);
const fU = v => v == null || !isFinite(v) ? '-' : '$' + fN(v, Math.abs(v) < 10 ? 2 : 0);
const fC = v => v == null || !isFinite(v) ? '-' : '$' + fN(v, 2);
const fP = (v, d = 1) => v == null || !isFinite(v) ? '-' : fN(v * 100, d) + '%';
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const num = s => `<span class="num">${s}</span>`;
const div = (a, b) => (b ? a / b : null);
const cplOf = (s, l) => (s > 0 && l ? s / l : null);       // no CPL when nothing was spent
const addD = (iso, n) => { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const days = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5) + 1;
const cityName = k => (CITY[k] ? CITY[k][L === 'ar' ? 1 : 0] : k ? k : t('national'));
const pName = p => (p === 'wa' ? t('waSrc') : p === 'untagged' ? t('untagged') : t(p));
// change badge; good = direction that is good for this metric ('up' or 'down')
function delta(cur, prev, good = 'up', minBase = 0) {
  if (cur == null || prev == null || !isFinite(cur) || !isFinite(prev) || !prev || Math.abs(prev) < minBase) return '';
  const r = cur / prev - 1; if (Math.abs(r) < 0.005) return `<span class="dl flat">${num('0%')}</span>`;
  const isGood = (r > 0) === (good === 'up');
  return `<span class="dl ${good === 'neutral' ? 'flat' : isGood ? 'good' : 'bad'}">${num((r > 0 ? '▲ ' : '▼ ') + fN(Math.abs(r) * 100, 0) + '%')}</span>`;
}

// ---------------- aggregation ----------------
function blankP() { return { spend: 0, native: 0, crm: 0, clicks: 0, visits: 0, won: 0, kg: 0, brand: 0 }; }
function aggregate(ds, from, to) {
  const A = { paid: {}, paidCity: {}, org: {}, wa: { spend: 0, crm: 0 }, waCity: {}, sheetCity: {}, orgSheetSpend: 0, orgVisitsAll: 0, days: {} };
  for (const p of [...PAID, 'untagged']) A.paid[p] = blankP();
  for (const p of ORG) A.org[p] = { leads: 0, visits: 0, spend: 0 };
  const day = d => A.days[d] || (A.days[d] = { paid: {}, org: {}, waSpend: 0, waCrm: 0, paidSpend: 0, paidCrm: 0, paidNative: 0, paidVisits: 0, orgLeads: 0, orgVisits: 0, orgSpend: 0, sheet: {} });
  const pc = (p, c) => { const k = p + '|' + c; return A.paidCity[k] || (A.paidCity[k] = { p, c, ...blankP() }); };
  // ad platforms
  for (const p of PAID) for (const [d, c, lg, sp, nl, ck] of ((ds.ads && ds.ads.camps && ds.ads.camps[p]) || [])) {
    if (d < from || d > to) continue;
    if (!lg) { A.paid[p].brand += sp; continue; }
    const x = A.paid[p]; x.spend += sp; x.native += nl; x.clicks += ck;
    const y = pc(p, c); y.spend += sp; y.native += nl; y.clicks += ck;
    const D = day(d); D.paidSpend += sp; D.paidNative += nl; (D.paid[p] = D.paid[p] || blankP()).spend += sp; D.paid[p].native += nl;
  }
  // GA4 sessions
  for (const [d, kind, plat, c, s] of ((ds.ads && ds.ads.ga) || [])) {
    if (d < from || d > to) continue;
    const D = day(d);
    if (kind === 'paid') {
      const p = PAID.includes(plat) ? plat : 'untagged';
      A.paid[p].visits += s; pc(p, c).visits += s; D.paidVisits += s; (D.paid[p] = D.paid[p] || blankP()).visits += s;
    } else {
      A.orgVisitsAll += s; D.orgVisits += s;
      const op = Object.keys(ORG_GA).find(k => ORG_GA[k] === plat) || 'o_web';
      A.org[op].visits += s; (D.org[op] = D.org[op] || { leads: 0, visits: 0 }).visits += s;
    }
  }
  // Odoo CRM leads
  for (const [d, c, g, plat, won, n, kg] of ((ds.odoo && ds.odoo.rows) || [])) {
    if (d < from || d > to) continue;
    const D = day(d);
    if (g === 'paid') {
      const p = PAID.includes(plat) ? plat : 'untagged';
      const x = A.paid[p]; x.crm += n; if (won) { x.won += n; x.kg += kg; }
      const y = pc(p, c === 'unknown' ? '' : c); y.crm += n;
      D.paidCrm += n; (D.paid[p] = D.paid[p] || blankP()).crm += n;
    } else if (g === 'organic') {
      const op = ORG.includes(plat) ? plat : 'o_other';
      A.org[op].leads += n; D.orgLeads += n; (D.org[op] = D.org[op] || { leads: 0, visits: 0 }).leads += n;
    } else if (g === 'wa') {
      A.wa.crm += n; D.waCrm += n; const w = A.waCity[c] || (A.waCity[c] = { crm: 0 }); w.crm += n;
    }
  }
  // Daily tab (sheet): city-level group numbers + organic and WhatsApp spend
  for (const m of Object.values(ds.months || {})) for (const r of (m.rows || [])) {
    const [d, c, pl, ps, ol, os, wl, ws] = r;
    if (d < from || d > to) continue;
    const s = A.sheetCity[c] || (A.sheetCity[c] = { pl: 0, ps: 0, ol: 0, os: 0, wl: 0, ws: 0 });
    s.pl += pl; s.ps += ps; s.ol += ol; s.os += os; s.wl += wl; s.ws += ws;
    A.orgSheetSpend += os; A.wa.spend += ws;
    const D = day(d); D.waSpend += ws; D.orgSpend += os;
    const sc = D.sheet[c] || (D.sheet[c] = { pl: 0, ps: 0, ol: 0, os: 0, wl: 0, ws: 0 });
    sc.pl += pl; sc.ps += ps; sc.ol += ol; sc.os += os; sc.wl += wl; sc.ws += ws;
    const w = A.waCity[c] || (A.waCity[c] = { crm: 0 }); w.spend = (w.spend || 0) + ws;
  }
  // organic spend per platform
  for (const [op, bp] of Object.entries(ORG_BRAND)) A.org[op].spend = A.paid[bp].brand;
  A.org.o_web.spend = A.orgSheetSpend;
  // totals
  const P = blankP();
  for (const p of [...PAID, 'untagged']) for (const k of Object.keys(P)) P[k] += A.paid[p][k];
  A.paidT = P;
  A.orgT = ORG.reduce((o, p) => { o.leads += A.org[p].leads; o.spend += A.org[p].spend; return o; }, { leads: 0, spend: 0 });
  A.orgT.visits = A.orgVisitsAll;
  A.orgT.webLeads = ['o_web', 'o_meta', 'o_tiktok', 'o_snap'].reduce((a, p) => a + A.org[p].leads, 0);
  return A;
}

// ---------------- insights ----------------
function insights(cur, prev, nDays) {
  const out = [];
  const add = (kind, score, title, action) => out.push({ kind, score, title, action });
  const pc = (a, b) => fN(Math.abs(a / b - 1) * 100, 0) + '%';
  const minLeads = Math.max(10, nDays * 3);
  // paid platforms
  for (const p of PAID) {
    const c = cur.paid[p], q = prev.paid[p], name = pName(p);
    const cc = div(c.spend, c.crm), qc = div(q.spend, q.crm);
    if (c.crm >= minLeads && q.crm >= minLeads && cc && qc) {
      const r = cc / qc - 1;
      if (r <= -0.15) add('good', -r * Math.sqrt(c.spend), t('iCplGood')(name, pc(cc, qc), fC(cc), fC(qc)), t('aScale')(name));
      else if (r >= 0.15) add('bad', r * Math.sqrt(c.spend), t('iCplBad')(name, pc(cc, qc), fC(cc), fC(qc)), t('aFix')(name));
    }
    if (q.crm >= minLeads && c.crm < q.crm * 0.75 && !(cc && qc && cc / qc - 1 >= 0.15)) add('bad', (1 - c.crm / q.crm) * Math.sqrt(q.crm), t('iLeadsDown')(name, pc(c.crm, q.crm), fN(c.crm)), t('aLeadsDown')(name));
    if (c.spend > 300 && c.native > c.crm * 1.5 && c.native - c.crm > 30 && p !== 'meta') add('bad', (c.native / Math.max(1, c.crm)) * 5, t('iGap')(name, fP(c.native / Math.max(1, c.crm) - 1, 0)), t('aGap')(name));
    const cv = div(c.crm, c.visits), qv = div(q.crm, q.visits);
    if (c.visits > 300 && q.visits > 300 && cv && qv) {
      if (cv / qv - 1 <= -0.25) add('bad', (1 - cv / qv) * 10, t('iCvrDown')(name, fP(cv), fP(qv)), t('aCvrDown')(name));
      else if (cv / qv - 1 >= 0.25) add('good', (cv / qv - 1) * 10, t('iCvrUp')(name, fP(cv), fP(qv)), t('aCvrUp')(name));
    }
    if (c.clicks > 500 && c.visits && c.visits / c.clicks < 0.5 && p !== 'meta') add('info', 3, t('iLoss')(name, fP(c.visits / c.clicks, 0)), t('aLoss')(name));
  }
  // best vs worst paid platform
  const ranked = PAID.map(p => ({ p, cpl: div(cur.paid[p].spend, cur.paid[p].crm), n: cur.paid[p].crm })).filter(x => x.cpl && x.n >= minLeads).sort((a, b) => a.cpl - b.cpl);
  if (ranked.length >= 2) {
    const b = ranked[0], w = ranked[ranked.length - 1];
    if (b.cpl < w.cpl * 0.7) add('info', 8, t('iShift')(pName(b.p), pName(w.p), fC(b.cpl), fC(w.cpl)), t('aShift')(pName(b.p), pName(w.p)));
  }
  // platform x city moves
  const cityMoves = [];
  for (const [k, c] of Object.entries(cur.paidCity)) {
    const q = prev.paidCity[k]; if (!q || !c.c) continue;
    const cc = div(c.spend, c.crm), qc = div(q.spend, q.crm);
    if (c.crm >= Math.max(8, nDays * 2) && q.crm >= Math.max(8, nDays * 2) && cc && qc) cityMoves.push({ c, r: cc / qc - 1, cc, qc });
  }
  cityMoves.sort((a, b) => a.r - b.r);
  const best = cityMoves[0], worst = cityMoves[cityMoves.length - 1];
  if (best && best.r <= -0.2) add('good', -best.r * 4, t('iCplGood')(`${pName(best.c.p)} · ${cityName(best.c.c)}`, pc(best.cc, best.qc), fC(best.cc), fC(best.qc)), t('aScaleCity')(pName(best.c.p), cityName(best.c.c)));
  if (worst && worst !== best && worst.r >= 0.2) add('bad', worst.r * 4, t('iCplBad')(`${pName(worst.c.p)} · ${cityName(worst.c.c)}`, pc(worst.cc, worst.qc), fC(worst.cc), fC(worst.qc)), t('aFixCity')(pName(worst.c.p), cityName(worst.c.c)));
  // organic platforms
  for (const p of ORG) {
    const c = cur.org[p].leads, q = prev.org[p].leads, name = pName(p);
    if (q >= minLeads / 2 && c >= q * 1.25) add('good', (c / q - 1) * 3, t('iLeadsUp')(name, pc(c, q), fN(c)), t('aLeadsUp')(name));
    else if (q >= minLeads / 2 && c <= q * 0.75) add('bad', (1 - c / q) * 3, t('iLeadsDown')(name, pc(c, q), fN(c)), t('aLeadsDown')(name));
  }
  // WhatsApp
  { const c = div(cur.wa.spend, cur.wa.crm), q = div(prev.wa.spend, prev.wa.crm), name = pName('wa');
    if (cur.wa.crm >= minLeads && prev.wa.crm >= minLeads && c && q) {
      if (c / q - 1 <= -0.15) add('good', (1 - c / q) * 5, t('iCplGood')(name, pc(c, q), fC(c), fC(q)), t('aScale')(name));
      else if (c / q - 1 >= 0.15) add('bad', (c / q - 1) * 5, t('iCplBad')(name, pc(c, q), fC(c), fC(q)), t('aFix')(name));
    }
    if (prev.wa.crm >= minLeads && cur.wa.crm <= prev.wa.crm * 0.75) add('bad', 3, t('iLeadsDown')(name, pc(cur.wa.crm, prev.wa.crm), fN(cur.wa.crm)), t('aLeadsDown')(name));
  }
  const order = { bad: 0, good: 1, info: 2 };
  return out.sort((a, b) => order[a.kind] - order[b.kind] || b.score - a.score).slice(0, 8);
}

// ---------------- charts ----------------
const charts = {};
function chart(id, cfg) {
  if (charts[id]) { charts[id].destroy(); delete charts[id]; }
  const el = document.getElementById(id); if (!el || !window.Chart) return;
  const rtl = L === 'ar';
  cfg.options = Object.assign({ maintainAspectRatio: false, animation: false, interaction: { mode: 'index', intersect: false },
    plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { family: 'IBM Plex Sans Arabic' } } } } }, cfg.options || {});
  const sc = cfg.options.scales || {};
  if (sc.x) sc.x = Object.assign({ reverse: rtl, grid: { display: false }, ticks: { maxTicksLimit: 14 } }, sc.x);
  for (const k of ['y', 'y2']) if (sc[k]) sc[k] = Object.assign({ position: (k === 'y') !== rtl ? 'left' : 'right', beginAtZero: true, grid: k === 'y' ? { color: 'rgba(29,74,79,.08)' } : { display: false } }, sc[k]);
  charts[id] = new Chart(el, cfg);
}
const chips = (key, opts) => `<div class="trend-tabs">${opts.map(([v, lbl]) => `<button class="chip" data-mk="${key}" data-v="${v}" aria-pressed="${ui[key] === v}">${esc(lbl)}</button>`).join('')}</div>`;

// ---------------- render ----------------
function kpi(label, val, d, sub) {
  return `<div class="kpi"><div class="k">${esc(label)}</div><div class="v">${num(val)}</div><div class="t"><span>${sub ? esc(sub) : ''}</span>${d || ''}</div></div>`;
}
function weekStart(iso) { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() - d.getUTCDay()); return d.toISOString().slice(0, 10); }

function render({ ds, from, to, lang, perf }) {
  L = lang === 'ar' ? 'ar' : 'en';
  const root = $('#mkt'); if (!root) return;
  if (!ds) { root.innerHTML = ''; return; }
  // use complete days only (today is partial)
  const today = new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 10);
  let end = to >= today && from < today ? addD(today, -1) : to;
  // stop at the last day filled in the Daily tab so sheet spend and CRM leads cover the same days
  const lastRep = perf && perf.range && perf.range.lastReported;
  if (lastRep && lastRep < end && lastRep >= from) end = lastRep;
  const n = days(from, end);
  const pFrom = addD(from, -n), pTo = addD(from, -1);
  const C = aggregate(ds, from, end), P = aggregate(ds, pFrom, pTo);
  const pt = C.paidT, pp = P.paidT;

  // --- insights
  const ins = insights(C, P, n);
  const insHtml = ins.length ? ins.map(i => `<div class="ins ${i.kind}"><div class="ins-t">${esc(i.title)}</div><div class="ins-a">${esc(i.action)}</div></div>`).join('')
    : `<div class="ins info"><div class="ins-t">${esc(t('noInsights'))}</div></div>`;

  // --- paid
  const paidRow = (p, x, q, cls = '') => {
    const ccpl = cplOf(x.spend, x.crm), ncpl = cplOf(x.spend, x.native), gap = x.crm && x.native ? x.native / x.crm - 1 : null, cvr = div(x.crm, x.visits);
    return `<tr class="${cls}"><td>${p === 'total' ? esc(t('total')) : `<span class="plat"><i style="background:${COL[p]}"></i>${esc(pName(p))}</span>`}</td>
      <td>${num(fU(x.spend))}${delta(x.spend, q.spend, 'neutral')}</td>
      <td>${num(fN(x.crm))}${delta(x.crm, q.crm, 'up', 5)}</td>
      <td>${num(fN(x.native))}</td>
      <td>${num(fC(ccpl))}${delta(ccpl, cplOf(q.spend, q.crm), 'down')}</td>
      <td>${num(fC(ncpl))}</td>
      <td class="${gap != null && Math.abs(gap) > 0.5 ? 'warnc' : ''}">${num(gap == null ? '-' : (gap > 0 ? '+' : '') + fP(gap, 0))}</td>
      <td>${num(fN(x.clicks))}</td>
      <td>${num(fN(x.visits))}<span class="sub">${num(x.clicks ? fP(x.visits / x.clicks, 0) : '-')} ${esc(t('clickToVisit').toLowerCase())}</span></td>
      <td>${num(fP(cvr, 2))}${delta(cvr, div(q.crm, q.visits), 'up')}</td></tr>`;
  };
  const paidHead = `<thead><tr><th>${t('platform')}</th><th>${t('spend')}</th><th>${t('crmLeads')}</th><th>${t('nativeLeads')}</th><th>${t('crmCpl')}</th><th>${t('nativeCpl')}</th><th>${t('gap')}</th><th>${t('clicks')}</th><th>${t('paidVisits')}</th><th>${t('cvr')}</th></tr></thead>`;
  const paidRows = [...PAID, 'untagged'].filter(p => p !== 'untagged' || C.paid.untagged.crm || C.paid.untagged.visits).map(p => paidRow(p, C.paid[p], P.paid[p])).join('');
  // paid by city
  const cityPlat = ui.cityPlat;
  const pcAgg = {}, pcPrev = {};
  const fold = (src, dst) => { for (const x of Object.values(src)) { if (cityPlat !== 'all' && x.p !== cityPlat) continue; const o = dst[x.c] || (dst[x.c] = blankP()); for (const k of Object.keys(o)) o[k] += x[k] || 0; } };
  fold(C.paidCity, pcAgg); fold(P.paidCity, pcPrev);
  const pcRows = Object.entries(pcAgg).sort((a, b) => b[1].spend - a[1].spend || b[1].crm - a[1].crm).map(([c, x]) => {
    const q = pcPrev[c] || blankP(); const cpl = div(x.spend, x.crm);
    return `<tr><td>${esc(cityName(c))}</td><td>${num(fU(x.spend))}${delta(x.spend, q.spend, 'neutral')}</td><td>${num(fN(x.crm))}${delta(x.crm, q.crm, 'up', 5)}</td><td>${num(fN(x.native))}</td>
      <td>${num(fC(cpl))}${delta(cpl, div(q.spend, q.crm), 'down')}</td><td>${num(fC(div(x.spend, x.native)))}</td><td>${num(fN(x.visits))}</td><td>${num(fP(div(x.crm, x.visits), 2))}</td></tr>`;
  }).join('');
  const pcTot = Object.values(pcAgg).reduce((o, x) => { for (const k of Object.keys(o)) o[k] += x[k]; return o; }, blankP());

  // --- organic
  const ot = C.orgT, op = P.orgT;
  const orgRows = ORG.map(p => {
    const x = C.org[p], q = P.org[p];
    return `<tr><td><span class="plat"><i style="background:${COL[p]}"></i>${esc(pName(p))}</span></td>
      <td>${num(fN(x.leads))}${delta(x.leads, q.leads, 'up', 5)}</td><td>${num(fP(div(x.leads, ot.leads), 0))}</td>
      <td>${p === 'o_other' ? '-' : num(fN(x.visits))}</td><td>${p === 'o_other' ? '-' : num(fP(div(x.leads, x.visits), 2))}</td>
      <td>${p === 'o_other' ? '-' : num(fU(x.spend))}</td><td>${p === 'o_other' ? '-' : num(fC(div(x.spend, x.leads)))}${p === 'o_other' ? '' : delta(div(x.spend, x.leads), div(q.spend, q.leads), 'down')}</td></tr>`;
  }).join('');

  // --- cities (daily sheet style)
  const cityKeys = Object.keys(C.sheetCity).sort((a, b) => (C.sheetCity[b].ps + C.sheetCity[b].os + C.sheetCity[b].ws) - (C.sheetCity[a].ps + C.sheetCity[a].os + C.sheetCity[a].ws));
  const grpCells = (s, q) => [['pl', 'ps'], ['ol', 'os'], ['wl', 'ws']].map(([l, sp]) =>
    `<td class="gs">${num(fU(s[sp]))}</td><td>${num(fN(s[l]))}${q ? delta(s[l], q[l], 'up', 5) : ''}</td><td>${num(fC(div(s[sp], s[l])))}${q ? delta(div(s[sp], s[l]), div(q[sp], q[l]), 'down') : ''}</td>`).join('') +
    `<td class="gs">${num(fU(s.ps + s.os + s.ws))}</td><td>${num(fN(s.pl + s.ol + s.wl))}</td><td>${num(fC(div(s.ps + s.os + s.ws, s.pl + s.ol + s.wl)))}</td>`;
  const sumS = list => list.reduce((o, s) => { for (const k of Object.keys(o)) o[k] += s[k]; return o; }, { pl: 0, ps: 0, ol: 0, os: 0, wl: 0, ws: 0 });
  const grpHead = (first) => `<thead><tr><th rowspan="2">${first}</th><th colspan="3" class="gh paid">${t('paid')}</th><th colspan="3" class="gh org">${t('organic')}</th><th colspan="3" class="gh wa">${t('wa')}</th><th colspan="3" class="gh tot">${t('total')}</th></tr>
    <tr>${[0, 1, 2, 3].map(() => `<th class="gs">${t('spend')}</th><th>${t('leads')}</th><th>${t('cpl')}</th>`).join('')}</tr></thead>`;
  const cityTable = grpHead(t('city')) + '<tbody>' + cityKeys.map(c => `<tr><td>${esc(cityName(c))}</td>${grpCells(C.sheetCity[c], P.sheetCity[c])}</tr>`).join('') + '</tbody>' +
    `<tfoot><tr><td>${esc(t('total'))}</td>${grpCells(sumS(Object.values(C.sheetCity)), sumS(Object.values(P.sheetCity)))}</tr></tfoot>`;
  // daily sheet
  const dayCity = ui.dayCity;
  const dates = Object.keys(C.days).filter(d => d >= from && d <= end).sort().reverse();
  const dayRows = dates.map(d => { const sh = C.days[d].sheet; const s = dayCity === 'all' ? sumS(Object.values(sh)) : (sh[dayCity] || sumS([])); return `<tr><td>${esc(d)}</td>${grpCells(s)}</tr>`; }).join('');
  const dayTotal = dates.reduce((o, d) => { const sh = C.days[d].sheet; const s = dayCity === 'all' ? sumS(Object.values(sh)) : (sh[dayCity] || sumS([])); for (const k of Object.keys(o)) o[k] += s[k]; return o; }, sumS([]));
  const dayCities = [...new Set(Object.values(C.days).flatMap(D => Object.keys(D.sheet)))];

  // --- weekly cohorts (last 8 weeks up to the range end)
  const wEnd = weekStart(end), weeks = Array.from({ length: 8 }, (_, i) => addD(wEnd, -7 * (7 - i)));
  const W = aggregate(ds, weeks[0], end);
  const wk = {}; const srcs = [...PAID, 'o_web', 'o_meta', 'o_tiktok', 'wa'];
  for (const [d, D] of Object.entries(W.days)) {
    const w = weekStart(d); if (w < weeks[0]) continue;
    const o = wk[w] || (wk[w] = {});
    for (const p of PAID) { const x = D.paid[p]; if (!x) continue; const y = o[p] || (o[p] = { s: 0, l: 0 }); y.s += x.spend; y.l += x.crm; }
    for (const p of ['o_web', 'o_meta', 'o_tiktok']) { const x = D.org[p]; const y = o[p] || (o[p] = { s: 0, l: 0 }); if (x) y.l += x.leads; }
    const y = o.wa || (o.wa = { s: 0, l: 0 }); y.s += D.waSpend; y.l += D.waCrm;
  }
  const cm = ui.cohortMetric;
  const cellVal = x => !x ? null : cm === 'cpl' ? cplOf(x.s, x.l) : cm === 'leads' ? x.l : x.s;
  const cohortRows = srcs.map(p => {
    const vals = weeks.map(w => cellVal(wk[w] && wk[w][p]));
    const ok = vals.filter(v => v != null && isFinite(v)); const avg = ok.length ? ok.reduce((a, b) => a + b, 0) / ok.length : null;
    const cell = v => { if (v == null || !avg) return '<td>-</td>'; const r = v / avg - 1; const good = cm === 'cpl' ? r < 0 : r > 0; const a = Math.min(1, Math.abs(r) * 2);
      return `<td style="background:${good ? `rgba(12,163,157,${(0.06 + a * 0.5).toFixed(2)})` : `rgba(181,78,55,${(0.05 + a * 0.4).toFixed(2)})`}">${num(cm === 'cpl' ? fC(v) : cm === 'leads' ? fN(v) : fU(v))}</td>`; };
    if (cm === 'cpl' && ['o_web', 'o_meta', 'o_tiktok'].includes(p)) return '';
    return `<tr><td><span class="plat"><i style="background:${COL[p]}"></i>${esc(pName(p))}</span></td>${vals.map(cell).join('')}</tr>`;
  }).join('');
  // weekday breakdown (selected period)
  const wd = Array.from({ length: 7 }, () => ({ n: 0, paid: 0, paidS: 0, org: 0, wa: 0, waS: 0 }));
  for (const [d, D] of Object.entries(C.days)) { const x = wd[new Date(d + 'T00:00:00Z').getUTCDay()]; x.n++; x.paid += D.paidCrm; x.paidS += D.paidSpend; x.org += D.orgLeads; x.wa += D.waCrm; x.waS += D.waSpend; }
  const wdNames = L === 'ar' ? ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'] : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const wdRow = (lbl, f, fmt) => `<tr><td>${esc(lbl)}</td>${wd.map(x => `<td>${num(x.n ? fmt(f(x)) : '-')}</td>`).join('')}</tr>`;
  // city x platform CPL heat
  const cities2 = [...new Set(Object.values(C.paidCity).map(x => x.c))].filter(Boolean);
  const cpAll = PAID.map(p => div(C.paid[p].spend, C.paid[p].crm));
  const heatCell = (x, ref) => { const v = x ? div(x.spend, x.crm) : null; if (v == null || !ref || !x || x.crm < 5) return `<td>${num(v == null ? '-' : fC(v))}</td>`; const r = v / ref - 1, a = Math.min(1, Math.abs(r) * 2);
    return `<td style="background:${r < 0 ? `rgba(12,163,157,${(0.06 + a * 0.5).toFixed(2)})` : `rgba(181,78,55,${(0.05 + a * 0.4).toFixed(2)})`}">${num(fC(v))}<span class="sub">${num(fN(x.crm))}</span></td>`; };

  root.innerHTML = `
  <section><div class="sec-h"><h2>${t('insights')}</h2><p>${esc(t('insightsSub')(n, `${pFrom} → ${pTo}`))}</p></div><div class="ins-grid">${insHtml}</div></section>

  <section><div class="sec-h"><h2>${t('paid')}</h2><p>${esc(t('vsPrev'))}</p></div>
    <div class="kpis">
      ${kpi(t('spend'), fU(pt.spend), delta(pt.spend, pp.spend, 'neutral'))}
      ${kpi(t('crmLeads'), fN(pt.crm), delta(pt.crm, pp.crm, 'up', 5))}
      ${kpi(t('nativeLeads'), fN(pt.native), delta(pt.native, pp.native, 'up', 5))}
      ${kpi(t('crmCpl'), fC(div(pt.spend, pt.crm)), delta(div(pt.spend, pt.crm), div(pp.spend, pp.crm), 'down'))}
      ${kpi(t('nativeCpl'), fC(div(pt.spend, pt.native)), delta(div(pt.spend, pt.native), div(pp.spend, pp.native), 'down'))}
      ${kpi(t('paidVisits'), fN(pt.visits), delta(pt.visits, pp.visits))}
      ${kpi(t('cvr'), fP(div(pt.crm, pt.visits), 2), delta(div(pt.crm, pt.visits), div(pp.crm, pp.visits)))}
    </div>
    <div class="panel" style="margin-top:14px"><div class="tbl-wrap"><table class="mk">${paidHead}<tbody>${paidRows}</tbody><tfoot>${paidRow('total', pt, pp)}</tfoot></table></div></div>
    <div class="panel trend-panel" style="margin-top:14px">${chips('paidView', [['leads', t('vLeads')], ['cpl', t('vCpl')], ['gap', t('vGap')], ['visits', t('vVisits')]])}<div class="trend-cw"><canvas id="mkPaid"></canvas></div></div>
    <div class="panel" style="margin-top:14px"><div class="tbl-head">${chips('cityPlat', [['all', t('allPlat')], ...PAID.map(p => [p, pName(p)])])}</div>
      <div class="tbl-wrap"><table class="mk"><thead><tr><th>${t('city')}</th><th>${t('spend')}</th><th>${t('crmLeads')}</th><th>${t('nativeLeads')}</th><th>${t('crmCpl')}</th><th>${t('nativeCpl')}</th><th>${t('paidVisits')}</th><th>${t('cvr')}</th></tr></thead>
      <tbody>${pcRows}</tbody><tfoot><tr><td>${esc(t('total'))}</td><td>${num(fU(pcTot.spend))}</td><td>${num(fN(pcTot.crm))}</td><td>${num(fN(pcTot.native))}</td><td>${num(fC(div(pcTot.spend, pcTot.crm)))}</td><td>${num(fC(div(pcTot.spend, pcTot.native)))}</td><td>${num(fN(pcTot.visits))}</td><td>${num(fP(div(pcTot.crm, pcTot.visits), 2))}</td></tr></tfoot></table></div></div>
  </section>

  <section><div class="sec-h"><h2>${t('organic')}</h2><p>${esc(t('vsPrev'))}</p></div>
    <div class="kpis">
      ${kpi(t('spend'), fU(ot.spend), delta(ot.spend, op.spend, 'neutral'))}
      ${kpi(t('orgVisits'), fN(ot.visits), delta(ot.visits, op.visits))}
      ${kpi(t('cvr'), fP(div(ot.webLeads, ot.visits), 2), delta(div(ot.webLeads, ot.visits), div(op.webLeads, op.visits)))}
      ${kpi(t('leads'), fN(ot.leads), delta(ot.leads, op.leads, 'up', 5))}
      ${kpi(t('cpl'), fC(div(ot.spend, ot.leads)), delta(div(ot.spend, ot.leads), div(op.spend, op.leads), 'down'))}
    </div>
    <div class="panel" style="margin-top:14px"><div class="tbl-wrap"><table class="mk"><thead><tr><th>${t('source')}</th><th>${t('leads')}</th><th>${t('share')}</th><th>${t('orgVisits')}</th><th>${t('cvr')}</th><th>${t('spend')}</th><th>${t('cpl')}</th></tr></thead>
      <tbody>${orgRows}</tbody><tfoot><tr><td>${esc(t('total'))}</td><td>${num(fN(ot.leads))}${delta(ot.leads, op.leads, 'up', 5)}</td><td>100%</td><td>${num(fN(ot.visits))}</td><td>${num(fP(div(ot.webLeads, ot.visits), 2))}</td><td>${num(fU(ot.spend))}</td><td>${num(fC(div(ot.spend, ot.leads)))}</td></tr></tfoot></table></div></div>
    <div class="panel trend-panel" style="margin-top:14px">${chips('orgView', [['leads', t('vLeads')], ['visits', t('vVisits')]])}<div class="trend-cw"><canvas id="mkOrg"></canvas></div></div>
  </section>

  <section><div class="sec-h"><h2>${t('wa')}</h2><p>${esc(t('vsPrev'))}</p></div>
    <div class="kpis">
      ${kpi(t('spend'), fU(C.wa.spend), delta(C.wa.spend, P.wa.spend, 'neutral'))}
      ${kpi(t('crmLeads'), fN(C.wa.crm), delta(C.wa.crm, P.wa.crm, 'up', 5))}
      ${kpi(t('cpl'), fC(div(C.wa.spend, C.wa.crm)), delta(div(C.wa.spend, C.wa.crm), div(P.wa.spend, P.wa.crm), 'down'))}
    </div>
    <div class="panel trend-panel" style="margin-top:14px"><div class="trend-cw"><canvas id="mkWa"></canvas></div></div>
  </section>

  <section><div class="sec-h"><h2>${t('cities')}</h2></div>
    <div class="panel"><div class="tbl-wrap"><table class="mk grp">${cityTable}</table></div></div>
    <div class="panel" style="margin-top:14px"><div class="tbl-head"><h3 class="ch">${t('daily')}</h3>${chips('dayCity', [['all', t('allCities')], ...dayCities.map(c => [c, cityName(c)])])}</div>
      <div class="tbl-wrap tall"><table class="mk grp">${grpHead(t('date'))}<tbody>${dayRows}</tbody><tfoot><tr><td>${esc(t('total'))}</td>${grpCells(dayTotal)}</tr></tfoot></table></div></div>
  </section>

  <section><div class="sec-h"><h2>${t('cohorts')}</h2></div>
    <div class="panel"><div class="tbl-head"><h3 class="ch">${t('cohortTitle')}</h3>${chips('cohortMetric', [['cpl', t('mCpl')], ['leads', t('mLeads')], ['spend', t('mSpend')]])}</div>
      <div class="tbl-wrap"><table class="mk cohort"><thead><tr><th>${t('source')}</th>${weeks.map(w => `<th>${num(w.slice(5))}</th>`).join('')}</tr></thead><tbody>${cohortRows}</tbody></table></div>
      <p class="trend-note" style="padding:0 18px 14px">${esc(t('cohortNote'))}</p></div>
    <div class="grid2" style="margin-top:14px">
      <div class="panel"><h3 class="ch" style="padding:16px 18px 0">${t('weekdayTitle')}</h3><div class="tbl-wrap"><table class="mk"><thead><tr><th></th>${wdNames.map(x => `<th>${x}</th>`).join('')}</tr></thead><tbody>
        ${wdRow(t('paid') + ': ' + t('crmLeads'), x => x.paid / x.n, v => fN(v))}
        ${wdRow(t('paid') + ': ' + t('crmCpl'), x => div(x.paidS, x.paid), fC)}
        ${wdRow(t('organic') + ': ' + t('leads'), x => x.org / x.n, v => fN(v))}
        ${wdRow(t('wa') + ': ' + t('crmLeads'), x => x.wa / x.n, v => fN(v))}
        ${wdRow(t('wa') + ': ' + t('cpl'), x => cplOf(x.waS, x.wa), fC)}
      </tbody></table></div></div>
      <div class="panel"><h3 class="ch" style="padding:16px 18px 0">${t('cityPlatTitle')}</h3><div class="tbl-wrap"><table class="mk cohort"><thead><tr><th>${t('city')}</th>${PAID.map(p => `<th>${esc(pName(p))}</th>`).join('')}</tr></thead><tbody>
        ${cities2.map(c => `<tr><td>${esc(cityName(c))}</td>${PAID.map((p, i) => heatCell(C.paidCity[p + '|' + c], cpAll[i])).join('')}</tr>`).join('')}
      </tbody></table></div></div>
    </div>
  </section>
  <ul class="notes">${['n1', 'n2', 'n3', 'n4', 'n5', 'n6'].map(k => `<li>${esc(t(k))}</li>`).join('')}${((ds.sources && ds.sources.ads && ds.sources.ads.errors) || []).map(e => `<li>${esc(e)}</li>`).join('')}</ul>`;

  // --- charts
  const ds_ = Object.keys(C.days).filter(d => d >= from && d <= end).sort();
  const lbl = ds_.map(d => d.slice(5)), dense = ds_.length > 45;
  const line = (label, data, color, axis = 'y', w = 2, dash) => ({ type: 'line', label, data, borderColor: color, backgroundColor: color, pointRadius: dense ? 0 : 2, borderWidth: w, tension: .25, yAxisID: axis, borderDash: dash, spanGaps: true, order: 0 });
  const bar = (label, data, color, stack) => ({ type: 'bar', label, data, backgroundColor: color, borderRadius: 2, stack, order: 1 });
  const G = d => C.days[d];
  if (ui.paidView === 'cpl') chart('mkPaid', { data: { labels: lbl, datasets: [
      line(t('total'), ds_.map(d => div(G(d).paidSpend, G(d).paidCrm)), '#15373a', 'y', 3),
      ...PAID.map(p => line(pName(p), ds_.map(d => { const x = G(d).paid[p]; return x ? div(x.spend, x.crm) : null; }), COL[p], 'y', 1.75))] },
    options: { scales: { x: {}, y: { ticks: { callback: v => '$' + fN(v, 2) } } } } });
  else if (ui.paidView === 'gap') chart('mkPaid', { data: { labels: lbl, datasets: [
      bar(t('crmLeads'), ds_.map(d => G(d).paidCrm), '#0ca39d'), bar(t('nativeLeads'), ds_.map(d => G(d).paidNative), 'rgba(237,167,55,.75)'),
      line(t('crmCpl'), ds_.map(d => div(G(d).paidSpend, G(d).paidCrm)), '#1d4a4f', 'y2'), line(t('nativeCpl'), ds_.map(d => div(G(d).paidSpend, G(d).paidNative)), '#eda737', 'y2', 2, [5, 4])] },
    options: { scales: { x: {}, y: { ticks: { callback: v => fN(v) } }, y2: { ticks: { callback: v => '$' + fN(v, 2) } } } } });
  else if (ui.paidView === 'visits') chart('mkPaid', { data: { labels: lbl, datasets: [
      ...PAID.map(p => bar(pName(p), ds_.map(d => { const x = G(d).paid[p]; return x ? x.visits : 0; }), COL[p], 'v')),
      line(t('cvr'), ds_.map(d => div(G(d).paidCrm, G(d).paidVisits)), '#15373a', 'y2', 2.5)] },
    options: { scales: { x: { stacked: true }, y: { stacked: true, ticks: { callback: v => fN(v) } }, y2: { ticks: { callback: v => fP(v, 0) } } },
      plugins: { legend: { position: 'bottom', labels: { boxWidth: 10 } }, tooltip: { callbacks: { label: c => `${c.dataset.label}: ${c.dataset.yAxisID === 'y2' ? fP(c.raw, 2) : fN(c.raw)}` } } } } });
  else chart('mkPaid', { data: { labels: lbl, datasets: [
      ...[...PAID, 'untagged'].map(p => bar(pName(p), ds_.map(d => { const x = G(d).paid[p]; return x ? x.crm : 0; }), COL[p], 'l')),
      line(t('crmCpl'), ds_.map(d => div(G(d).paidSpend, G(d).paidCrm)), '#15373a', 'y2', 2.5)] },
    options: { scales: { x: { stacked: true }, y: { stacked: true, ticks: { callback: v => fN(v) } }, y2: { ticks: { callback: v => '$' + fN(v, 2) } } } } });

  if (ui.orgView === 'visits') chart('mkOrg', { data: { labels: lbl, datasets: [
      bar(t('orgVisits'), ds_.map(d => G(d).orgVisits), 'rgba(12,163,157,.8)'),
      line(t('cvr'), ds_.map(d => { const D = G(d); const l = ['o_web', 'o_meta', 'o_tiktok', 'o_snap'].reduce((a, p) => a + ((D.org[p] && D.org[p].leads) || 0), 0); return div(l, D.orgVisits); }), '#15373a', 'y2', 2.5)] },
    options: { scales: { x: {}, y: { ticks: { callback: v => fN(v) } }, y2: { ticks: { callback: v => fP(v, 0) } } },
      plugins: { legend: { position: 'bottom', labels: { boxWidth: 10 } }, tooltip: { callbacks: { label: c => `${c.dataset.label}: ${c.dataset.yAxisID === 'y2' ? fP(c.raw, 2) : fN(c.raw)}` } } } } });
  else chart('mkOrg', { data: { labels: lbl, datasets: ORG.map(p => bar(pName(p), ds_.map(d => (G(d).org[p] && G(d).org[p].leads) || 0), COL[p], 'o')) },
    options: { scales: { x: { stacked: true }, y: { stacked: true, ticks: { callback: v => fN(v) } } } } });

  chart('mkWa', { data: { labels: lbl, datasets: [
      bar(t('spend'), ds_.map(d => G(d).waSpend), 'rgba(12,163,157,.75)'),
      line(t('crmLeads'), ds_.map(d => G(d).waCrm), '#1d4a4f', 'y2', 2.5),
      line(t('cpl'), ds_.map(d => cplOf(G(d).waSpend, G(d).waCrm)), '#eda737', 'y3', 2, [5, 4])] },
    options: { scales: { x: { reverse: L === 'ar', grid: { display: false }, ticks: { maxTicksLimit: 14 } },
      y: { position: L === 'ar' ? 'right' : 'left', beginAtZero: true, grid: { color: 'rgba(29,74,79,.08)' }, ticks: { callback: v => '$' + fN(v) } },
      y2: { position: L === 'ar' ? 'left' : 'right', beginAtZero: true, grid: { display: false }, ticks: { callback: v => fN(v) } },
      y3: { display: false, beginAtZero: true } } } });

  $$('[data-mk]').forEach(b => b.addEventListener('click', () => { ui[b.dataset.mk] = b.dataset.v; saveUi(); render({ ds, from, to, lang, perf }); }));
}

window.AwonMkt = { render, _aggregate: aggregate, _insights: insights };
})();
