/* Awon dashboard: spend quality, partners, marketing initiatives, 1% per team member, and the settings screen.
   Everything is computed in the browser from ds.kpi (Odoo rows by day and UTM source) and ds.ads.cdet (ad spend by campaign),
   with budgets, targets and lists taken from the saved settings (/api/settings). Nothing here is hard-coded except
   the first-run defaults taken from the request document, which the settings screen can change. */
(function () {
'use strict';
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const num = s => `<span class="num">${s}</span>`;

// ---------------- strings ----------------
const T = {
  en: {
    spTitle: 'Spend and spend quality', spSub: 'How much we should spend, how much we spent, and what each dollar brings back',
    budgetTitle: 'Budget against spend', budget: 'Full marketing budget', spent: 'Spent so far', spentPct: 'of budget', left: 'Left', should: 'Should have spent by today', pace: 'Spend pace',
    paceFast: 'Faster than plan', paceSlow: 'Slower than plan', paceOk: 'On plan', noBudget: 'No budget entered for this month yet. Add it in Settings.', setLink: 'Open settings',
    mxTitle: 'Spend quality by platform', mxSub: 'For the selected dates. Green is better than the reference, red is worse, grey has no reference.',
    mainKpi: 'Kilograms per $1,000', mainNote: 'The main number: we are a weight business, not a leads business.', ref: 'Reference',
    openTitle: 'Open orders', openOf: n => `Valid leads in the period: ${n}. Open = leads not yet received.`, withOv: 'With overheads', totalOv: 'Total with overheads', bkPaid: 'Paid ads', bkBrand: 'Branding', ofBudget: 'of', g_tools: 'Tools and subscriptions', g_ugc: 'UGC / IGC', g_production: 'Production', g_services: 'Outsourced services',
    ohNote: 'Tools, UGC/IGC, production and outsourced services are entered per month in Settings and divided by the days of that month. Overheads accrue per completed day (monthly amount / days in the month, up to yesterday) and are included in the Total.', openNote: 'Weight arrives days after the lead, so the last days of the month read lower than the final number.',
    cols: { platform: 'Platform', kgk: 'Kg per $1,000', ldk: 'Leads per $1,000', cpl: 'CPL', cpk: 'Cost per kg', pr: 'Pickup rate', kgo: 'Kg per order', nr: 'Spend with no result', spend: 'Spend', leads: 'Valid leads', kg: 'Kg' },
    dir: { up: 'higher is better', down: 'lower is better' },
    meta: 'Meta', tiktok: 'TikTok', snapchat: 'Snapchat', google: 'Google', wa: 'WhatsApp', total: 'Total', other: 'Not linked to a platform',
    otherHint: 'Sources in Odoo with no ad platform (organic, retention, partners and others). They are never hidden.',
    nrTitle: 'Spend with no result', nrSub: m => `Campaigns that spent $${m} or more in the period and brought nothing back`,
    nrNone: 'No campaign crossed the limit with zero results.', nrCamp: 'Campaign', nrPlat: 'Platform', nrSpend: 'Spend', nrDays: 'Days',
    nrProxy: 'Odoo does not carry the campaign on an order, so "no result" here means the ad platform reported zero leads or conversions for a lead-gen campaign. Meta website campaigns report no lead count, so Meta is not assessed. Exact matching needs a campaign field on the Odoo order.',
    wdNote: 'Pickups and kg per day exclude Fridays. Leads and spend use calendar days.', waNote: 'WhatsApp spend comes from the Daily tab, as before.',
    ptTitle: 'Partnerships', ptSub: 'Partners from the settings list, counted from their Odoo sources',
    ptActive: 'Active partnerships', ptLeads: 'Leads', ptKg: 'Kilograms', ptTarget: 'November target', ptOf: 'of target',
    ptName: 'Partner', ptStart: 'Start', ptRecv: 'Received', ptKgo: 'Kg per order', ptShare: 'Achieved of own target', ptNoSrc: 'No source in Odoo', ptNoSrcFix: 'Cannot be measured until it has a source in Odoo.',
    ptEmpty: 'No partners in the settings list yet. Add them in Settings.', ptNotes: 'No costs and no old partnerships are shown here, only the partners in the settings list.',
    inTitle: 'Marketing initiatives', inSub: 'Top results of each initiative during its dates',
    inNone: 'No initiatives in the settings list yet.', inUnlinked: 'Not linked to a source, cannot be measured.', st_active: 'In progress', st_planned: 'Planned', st_paused: 'Paused', st_done: 'Done',
    inKg: 'Kilograms', inLeads: 'Leads', inSpend: 'Spend', inKk: 'Kg per $1,000', inAch: 'of target', inOwner: 'Owner', inDates: 'Dates', inNoTarget: 'No target set', inSource: 'Odoo source', inRecv: 'Received', inTarget: 'Target',
    tmTitle: '1% per team member', tmSub: 'One number each, improved by 1% every working day',
    tmSummary: 'on plan or ahead', tmNotSet: 'Not set yet', tmNotSetNote: 'The metric this person owns has not been chosen.',
    tmStart: 'Start', tmNow: 'Now', tmTarget: 'Target today', tmImp: 'Improvement', tmPlan: 'Planned', tmAhead: 'Ahead', tmOn: 'On plan', tmBehind: 'Behind', tmDay: n => `Working day ${n}`,
    tmNoData: 'No data for this metric yet.', tmManualNone: 'No value entered yet.',
    // settings
    seTitle: 'Settings', seSub: 'Budgets, targets and lists for the new sections. Saved for everyone who opens the dashboard.', seSave: 'Save', seSaved: 'Saved', seUnsaved: 'Unsaved changes', seFail: 'Could not save', seDemo: 'Demo mode: changes stay in this browser only.',
    seMonth: 'Monthly budget and other marketing costs', seMonthSel: 'Month', seBudget: 'Full marketing budget (USD, leave empty to add up all budgets)', seBudgetPaid: 'Paid ads budget (USD)', seBudgetWa: 'WhatsApp budget (USD)', seBudgetBrand: 'Branding budget (USD)', seBudgetM: 'Monthly budget (USD)', seSpendM: 'Monthly spend (USD)', seSvcName: 'Service name', seSvcCost: 'Monthly cost (USD)', seSvcAdd: 'Add a service', seOhHint: d => `Tools, UGC/IGC, production and services are divided by the ${d} days of the selected month. WhatsApp spend keeps coming from the Daily tab.`, g_tools: 'Tools and subscriptions', g_ugc: 'UGC / IGC', g_production: 'Production', g_services: 'Outsourced services',
    seRefs: 'References and targets for spend quality', seRefKg: 'Kg per $1,000', seRefLd: 'Leads per $1,000 (total)', seRefCpl: 'CPL (USD)', seRefCpk: 'Cost per kg (USD)', seRefPr: 'Pickup rate (%)', seRefKgo: 'Kg per order', seNr: 'Spend-with-no-result limit (USD)',
    sePt: 'Partners', seInit: 'Marketing initiatives', seTeam: '1% per team member', add: 'Add', remove: 'Remove', name: 'Name', sources: 'Odoo sources', srcHint: 'Type a source name and press Enter', campHint: 'Type a campaign name and press Enter', start: 'Start date', end: 'End date',
    status: 'Status', owner: 'Owner', campaigns: 'Linked campaigns', tgtLeads: 'Target leads', tgtKg: 'Target kg', tgtActive: 'Active partners target (e.g. 2-3)', metric: 'Metric', metricManual: 'Manual daily entry', direction: 'Direction', up: 'Higher is better', down: 'Lower is better',
    startVal: 'Start value', days: 'Plan days', manualAdd: 'Add a daily value', date: 'Date', value: 'Value', none: 'Not set yet', partnerGlobal: 'Partner targets for the month',
    mt: { 'kgPer1000:total': 'Kg per $1,000 (total)', 'kgPer1000:meta': 'Kg per $1,000 (Meta)', 'kgPer1000:tiktok': 'Kg per $1,000 (TikTok)', 'kgPer1000:snapchat': 'Kg per $1,000 (Snapchat)', 'kgPer1000:google': 'Kg per $1,000 (Google)',
      'cpl:total': 'CPL (total)', 'cpl:meta': 'CPL (Meta)', 'cpl:tiktok': 'CPL (TikTok)', 'cpl:snapchat': 'CPL (Snapchat)', 'cpl:google': 'CPL (Google)', 'cpk:total': 'Cost per kg (total)', 'pickupRate:total': 'Pickup rate (total)', 'kgPerOrder:total': 'Kg per order (total)', manual: 'Manual daily entry' },
    loading: 'Loading…', noKpi: 'Odoo data for these sections is not available right now.', dash: '—', tabSet: 'Settings', demoTag: 'Demo value',
  },
  ar: {
    spTitle: 'الصرف وجودته', spSub: 'كم لازم نصرف، كم صرفنا، وكم يرجع لنا كل دولار',
    budgetTitle: 'الميزانية مقابل الصرف', budget: 'ميزانية التسويق الكاملة', spent: 'صرفنا حتى اليوم', spentPct: 'من الميزانية', left: 'المتبقي', should: 'المفروض نكون صرفنا اليوم', pace: 'وتيرة الصرف',
    paceFast: 'أسرع من الخطة', paceSlow: 'أبطأ من الخطة', paceOk: 'على الخطة', noBudget: 'لم تُدخل ميزانية لهذا الشهر بعد. أضفها من الإعدادات.', setLink: 'فتح الإعدادات',
    mxTitle: 'جودة الصرف لكل منصة', mxSub: 'للفترة المحددة. الأخضر أفضل من المرجع، والأحمر أسوأ، والرمادي بلا مرجع.',
    mainKpi: 'كيلو لكل 1,000 دولار', mainNote: 'الرقم الرئيسي: نحن في بزنس أوزان، مو بزنس ليدز.', ref: 'المرجع',
    openTitle: 'الطلبات المفتوحة', openOf: n => `الليدز الصالحة في الفترة: ${n}. المفتوح = ليدز لم تُستلم بعد.`, withOv: 'مع التكاليف الأخرى', totalOv: 'الإجمالي مع التكاليف الأخرى', bkPaid: 'الإعلانات المدفوعة', bkBrand: 'البراندنج', ofBudget: 'من', g_tools: 'الأدوات والاشتراكات', g_ugc: 'UGC / IGC', g_production: 'الإنتاج', g_services: 'الخدمات الخارجية',
    ohNote: 'الأدوات وUGC/IGC والإنتاج والخدمات الخارجية تُدخل شهرياً في الإعدادات وتُقسم على أيام ذلك الشهر. وتُحتسب لكل يوم مكتمل (حتى أمس) وتدخل ضمن الإجمالي.', openNote: 'الكيلو يتأخر عن الليد لأن الاستلام يحصل بعد أيام، لذلك تظهر آخر أيام الشهر أقل من حقيقتها.',
    cols: { platform: 'المنصة', kgk: 'كيلو لكل 1,000$', ldk: 'ليدز لكل 1,000$', cpl: 'تكلفة الليد', cpk: 'تكلفة الكيلو', pr: 'نسبة الاستلام', kgo: 'كيلو لكل طلب', nr: 'صرف بلا نتيجة', spend: 'الصرف', leads: 'الليدز الصالحة', kg: 'الكيلو' },
    dir: { up: 'الأعلى أفضل', down: 'الأقل أفضل' },
    meta: 'Meta', tiktok: 'TikTok', snapchat: 'Snapchat', google: 'Google', wa: 'واتساب', total: 'الإجمالي', other: 'غير مربوط بمنصة',
    otherHint: 'مصادر في Odoo بلا منصة إعلانية (عضوي، تذكير، شركاء وغيرها). لا تُخفى أبداً.',
    nrTitle: 'صرف بلا نتيجة', nrSub: m => `حملات صرفت ${m}$ أو أكثر في الفترة ولم تجلب شيئاً`,
    nrNone: 'لا توجد حملة تجاوزت الحد بلا نتيجة.', nrCamp: 'الحملة', nrPlat: 'المنصة', nrSpend: 'الصرف', nrDays: 'الأيام',
    nrProxy: 'Odoo لا يحمل الحملة على الطلب، لذلك «بلا نتيجة» هنا تعني أن المنصة الإعلانية سجلت صفر ليدز أو تحويلات لحملة جمع ليدز. حملات Meta للموقع لا تسجل عدد ليدز، لذلك لا تُقيَّم Meta. المطابقة الدقيقة تحتاج حقل الحملة على طلب Odoo.',
    wdNote: 'الاستلام والكيلو اليومي يستثنيان الجمعة. الليدز والصرف على أيام التقويم.', waNote: 'صرف الواتساب يأتي من التبويب اليومي كما هو.',
    ptTitle: 'الشراكات', ptSub: 'شركاء قائمة الإعدادات، محسوبون من مصادرهم في Odoo',
    ptActive: 'الشراكات الفعالة', ptLeads: 'الليدز', ptKg: 'الكيلو', ptTarget: 'هدف نوفمبر', ptOf: 'من الهدف',
    ptName: 'الشريك', ptStart: 'البداية', ptRecv: 'المستلم', ptKgo: 'كيلو لكل طلب', ptShare: 'الإنجاز من نصيبه في الهدف', ptNoSrc: 'بدون مصدر في Odoo', ptNoSrcFix: 'لا يمكن قياسه حتى يُضاف له مصدر في Odoo.',
    ptEmpty: 'لا يوجد شركاء في قائمة الإعدادات بعد. أضفهم من الإعدادات.', ptNotes: 'لا تُعرض هنا أي تكاليف ولا شراكات قديمة، فقط الشركاء في قائمة الإعدادات.',
    inTitle: 'المبادرات التسويقية', inSub: 'أهم نتائج كل مبادرة خلال فترتها',
    inNone: 'لا توجد مبادرات في قائمة الإعدادات بعد.', inUnlinked: 'غير مربوطة بمصدر، لا يمكن قياسها.', st_active: 'قيد التنفيذ', st_planned: 'مخطط', st_paused: 'متوقف', st_done: 'منتهي',
    inKg: 'الكيلو', inLeads: 'الليدز', inSpend: 'الصرف', inKk: 'كيلو لكل 1,000$', inAch: 'من الهدف', inOwner: 'المسؤول', inDates: 'التواريخ', inNoTarget: 'لا يوجد مستهدف', inSource: 'مصدر Odoo', inRecv: 'المستلم', inTarget: 'المستهدف',
    tmTitle: '١٪ لكل عضو في الفريق', tmSub: 'رقم واحد لكل شخص، يتحسن ١٪ كل يوم عمل',
    tmSummary: 'على الخطة أو متقدمين', tmNotSet: 'لم يُحدد بعد', tmNotSetNote: 'لم يُختر الرقم الذي يتحمل مسؤوليته هذا الشخص.',
    tmStart: 'البداية', tmNow: 'الحالي', tmTarget: 'المستهدف اليوم', tmImp: 'التحسن', tmPlan: 'المخطط', tmAhead: 'متقدم', tmOn: 'على الخطة', tmBehind: 'متأخر', tmDay: n => `يوم العمل ${n}`,
    tmNoData: 'لا توجد بيانات لهذا الرقم بعد.', tmManualNone: 'لم تُدخل قيمة بعد.',
    seTitle: 'الإعدادات', seSub: 'الميزانيات والأهداف والقوائم للأقسام الجديدة. تُحفظ لكل من يفتح الداش بورد.', seSave: 'حفظ', seSaved: 'تم الحفظ', seUnsaved: 'تعديلات غير محفوظة', seFail: 'تعذر الحفظ', seDemo: 'وضع العرض: التعديلات تبقى في هذا المتصفح فقط.',
    seMonth: 'الميزانية الشهرية وتكاليف التسويق الأخرى', seMonthSel: 'الشهر', seBudget: 'ميزانية التسويق الكاملة (دولار، اتركها فارغة لتُجمع كل الميزانيات)', seBudgetPaid: 'ميزانية الإعلانات المدفوعة (دولار)', seBudgetWa: 'ميزانية الواتساب (دولار)', seBudgetBrand: 'ميزانية البراندنج (دولار)', seBudgetM: 'الميزانية الشهرية (دولار)', seSpendM: 'الصرف الشهري (دولار)', seSvcName: 'اسم الخدمة', seSvcCost: 'التكلفة الشهرية (دولار)', seSvcAdd: 'إضافة خدمة', seOhHint: d => `الأدوات وUGC/IGC والإنتاج والخدمات تُقسم على ${d} يوماً هي أيام الشهر المختار. صرف الواتساب يبقى من التبويب اليومي.`,
    seRefs: 'مراجع وأهداف جودة الصرف', seRefKg: 'كيلو لكل 1,000$', seRefLd: 'ليدز لكل 1,000$ (الإجمالي)', seRefCpl: 'تكلفة الليد (دولار)', seRefCpk: 'تكلفة الكيلو (دولار)', seRefPr: 'نسبة الاستلام (%)', seRefKgo: 'كيلو لكل طلب', seNr: 'حد «صرف بلا نتيجة» (دولار)',
    sePt: 'الشركاء', seInit: 'المبادرات التسويقية', seTeam: '١٪ لكل عضو', add: 'إضافة', remove: 'حذف', name: 'الاسم', sources: 'مصادر Odoo', srcHint: 'اكتب اسم المصدر ثم Enter', campHint: 'اكتب اسم الحملة ثم Enter', start: 'تاريخ البداية', end: 'تاريخ النهاية',
    status: 'الحالة', owner: 'المسؤول', campaigns: 'الحملات المرتبطة', tgtLeads: 'مستهدف الليدز', tgtKg: 'مستهدف الكيلو', tgtActive: 'مستهدف الشراكات الفعالة (مثل 2-3)', metric: 'الرقم', metricManual: 'إدخال يومي يدوي', direction: 'الاتجاه', up: 'الأعلى أفضل', down: 'الأقل أفضل',
    startVal: 'رقم البداية', days: 'أيام الخطة', manualAdd: 'إضافة قيمة يومية', date: 'التاريخ', value: 'القيمة', none: 'لم يُحدد بعد', partnerGlobal: 'مستهدفات الشراكات للشهر',
    mt: { 'kgPer1000:total': 'كيلو لكل 1,000$ (الإجمالي)', 'kgPer1000:meta': 'كيلو لكل 1,000$ (Meta)', 'kgPer1000:tiktok': 'كيلو لكل 1,000$ (TikTok)', 'kgPer1000:snapchat': 'كيلو لكل 1,000$ (Snapchat)', 'kgPer1000:google': 'كيلو لكل 1,000$ (Google)',
      'cpl:total': 'تكلفة الليد (الإجمالي)', 'cpl:meta': 'تكلفة الليد (Meta)', 'cpl:tiktok': 'تكلفة الليد (TikTok)', 'cpl:snapchat': 'تكلفة الليد (Snapchat)', 'cpl:google': 'تكلفة الليد (Google)', 'cpk:total': 'تكلفة الكيلو (الإجمالي)', 'pickupRate:total': 'نسبة الاستلام (الإجمالي)', 'kgPerOrder:total': 'كيلو لكل طلب (الإجمالي)', manual: 'إدخال يومي يدوي' },
    loading: 'جارٍ التحميل…', noKpi: 'بيانات Odoo لهذه الأقسام غير متاحة الآن.', dash: '—', tabSet: 'الإعدادات', demoTag: 'قيمة تجريبية',
  },
};

// ---------------- constants ----------------
// UTM source (source_id) -> ad platform. Other sources belong to the "not linked" line.
const SRC_PLAT = { 440: 'google', 679: 'google', 550: 'google', 459: 'snapchat', 622: 'snapchat', 443: 'tiktok', 624: 'tiktok', 458: 'meta', 625: 'meta', 623: 'meta', 4: 'meta', 427: 'wa', 769: 'wa', 770: 'wa' };
const PLATS = ['meta', 'tiktok', 'snapchat', 'google', 'wa'];
const AD_PLATS = ['meta', 'tiktok', 'snapchat', 'google'];
// First-run values from the request document; the settings screen replaces them.
const DEFAULTS = {
  months: {}, refs: { kgPer1000: 5263, leadsPer1000: 137, cpl: 7.29, cpk: 0.19, pickupRate: null, kgPerOrder: null, leadsPer1000By: { meta: 114, tiktok: 148, snapchat: 140, google: null } },
  noResultMin: 50, partnerTargets: { active: '2-3', leads: 2100, kg: null }, partners: [], initiatives: [],
  team: ['Afnan', 'Raghad', 'Jawad', 'Zanoon', 'Haidy', 'Dalia'].map(n => ({ name: n, metric: '', dir: 'up', start: null, startDate: '', days: null, source: '', manual: {} })),
};

let lang = 'en', settings = null, saved = null, persistent = true, dirty = false, status = '', ctx = null, wired = false;
const t = k => T[lang][k];

// ---------------- helpers ----------------
const loc = () => (lang === 'ar' ? 'ar-SA-u-nu-latn' : 'en-US');
const fN = (v, d = 0) => v == null || !isFinite(v) ? t('dash') : new Intl.NumberFormat(loc(), { maximumFractionDigits: d, minimumFractionDigits: d }).format(v);
const fUSD = (v, d = 0) => v == null || !isFinite(v) ? t('dash') : '$' + fN(v, d);
const fP = v => v == null || !isFinite(v) ? t('dash') : fN(v * 100, 0) + '%';
const div = (a, b) => (b > 0 && isFinite(a / b) ? a / b : null);
const addD = (d, n) => new Date(Date.parse(d + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10);
const dim = m => new Date(Date.UTC(+m.slice(0, 4), +m.slice(5, 7), 0)).getUTCDate();
const isFri = d => new Date(d + 'T00:00:00Z').getUTCDay() === 5;
const workDays = (a, b) => { let n = 0; for (let d = a; d <= b; d = addD(d, 1)) if (!isFri(d)) n++; return n; };
const fDate = d => d ? new Intl.DateTimeFormat(lang === 'ar' ? 'ar-SA-u-ca-gregory-nu-latn' : 'en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(d + 'T00:00:00Z')).replace('Sept', 'Sep') : t('dash');
const todayKSA = () => new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 10);

// ---------------- computation ----------------
function sums(ds, from, to) {
  const k = ds.kpi || {}, out = {};
  const g = id => (out[id] || (out[id] = { leads: 0, recv: 0, kg: 0, coh: 0 }));
  for (const [d, id, n] of k.leads || []) if (d >= from && d <= to) g(id).leads += n;
  for (const [d, id, n, kg] of k.recv || []) if (d >= from && d <= to) { g(id).recv += n; g(id).kg += kg; }
  for (const [d, id, n] of k.cohort || []) if (d >= from && d <= to) g(id).coh += n;
  return out;
}
function adSpend(ds, from, to, filter) {
  const cd = (ds.ads && ds.ads.cdet) || {}, out = {};
  for (const p of AD_PLATS) for (const [d, name, sp, nat, lg] of cd[p] || []) {
    if (d < from || d > to || (filter && !filter(p, name))) continue;
    const key = p + '|' + name, a = out[key] || (out[key] = { plat: p, name, spend: 0, native: 0, lg: 0, days: new Set() });
    if (lg) a.lg = 1;
    a.spend += sp; a.native += nat; if (sp > 0) a.days.add(d);
  }
  return out;
}
// WhatsApp spend: the existing way, the Daily tab figures (column 8 of ds.months rows)
function waSpend(ds, from, to) {
  let tot = 0;
  for (const m of Object.values(ds.months || {})) for (const r of m.rows || []) if (r[0] >= from && r[0] <= to) tot += r[7] || 0;
  return tot;
}
// Tools, UGC/IGC, production and outsourced services: entered per month, spread evenly over the days of that month
const OH = ['tools', 'ugc', 'production', 'services'];
const monthGroup = (s, g) => (g === 'services' ? { budget: s.services && s.services.budget, spend: ((s.services && s.services.items) || []).reduce((a, i) => a + (Number(i.cost) || 0), 0) } : { budget: s[g] && s[g].budget, spend: s[g] && s[g].spend });
function overhead(from, to) {
  const out = { tools: 0, ugc: 0, production: 0, services: 0 };
  for (let m = from.slice(0, 7); m <= to.slice(0, 7); m = addD(m + '-01', 32).slice(0, 7)) {
    const s = settings.months[m]; if (!s) continue;
    const ms = m + '-01', me = m + '-' + String(dim(m)).padStart(2, '0'), a = from > ms ? from : ms, y = addD(todayKSA(), -1), b = [to, me, y].sort()[0];
    if (b < a) continue; const share = (Math.round((Date.parse(b) - Date.parse(a)) / 864e5) + 1) / dim(m);
    for (const g of OH) out[g] += (Number(monthGroup(s, g).spend) || 0) * share;
  }
  out.total = OH.reduce((a, g) => a + out[g], 0); return out;
}
function groupData(ds, from, to) {
  const S = sums(ds, from, to), grp = {}, init = () => ({ leads: 0, recv: 0, kg: 0, coh: 0, spend: 0, nr: 0 });
  for (const p of [...PLATS, 'other']) grp[p] = init();
  for (const [id, v] of Object.entries(S)) { const p = SRC_PLAT[id] || 'other'; for (const k of ['leads', 'recv', 'kg', 'coh']) grp[p][k] += v[k]; }
  const camps = adSpend(ds, from, to);
  for (const c of Object.values(camps)) grp[c.plat].spend += c.spend;
  grp.wa.spend = waSpend(ds, from, to);
  const min = settings.noResultMin == null ? 50 : settings.noResultMin;
  // Only lead-gen campaigns on platforms that report a usable lead count (Meta website campaigns report none)
  const noRes = Object.values(camps).filter(c => c.lg && c.plat !== 'meta' && c.spend >= min && c.native === 0).sort((a, b) => b.spend - a.spend);
  for (const c of noRes) grp[c.plat].nr += c.spend;
  const tot = init(); for (const g of Object.values(grp)) for (const k of Object.keys(tot)) tot[k] += g[k];
  grp.total = tot;
  const oh = overhead(from, to);
  tot.spend += oh.total;   // Total = platforms + WhatsApp + overheads
  return { grp, noRes, S, oh };
}
const metricsOf = g => ({
  kgPer1000: g.spend > 0 ? div(g.kg, g.spend / 1000) : null, leadsPer1000: g.spend > 0 ? div(g.leads, g.spend / 1000) : null,
  cpl: div(g.spend, g.leads), cpk: div(g.spend, g.kg), pickupRate: div(g.coh, g.leads), kgPerOrder: div(g.kg, g.recv),
});
// colour class against a reference; direction decides which side is better
function cls(v, ref, dir) { if (v == null || ref == null) return 'na'; return (dir === 'up' ? v >= ref : v <= ref) ? 'good' : 'bad'; }

// ---------------- rendering: spend ----------------
function budgetCard(ds, to) {
  const m = to.slice(0, 7), s = settings.months[m] || {}, ms = m + '-01';
  const adAll = Object.values(adSpend(ds, ms, to)), paid = adAll.filter(c => c.lg).reduce((a, c) => a + c.spend, 0), brand = adAll.filter(c => !c.lg).reduce((a, c) => a + c.spend, 0), ads = paid + brand, wa = waSpend(ds, ms, to), oh = overhead(ms, to);
  const spent = ads + wa + oh.total, bsum = ['paid', 'wa', 'branding'].reduce((a, g) => a + (Number(s[g] && s[g].budget) || 0), 0) + OH.reduce((a, g) => a + (Number(monthGroup(s, g).budget) || 0), 0), budget = s.budget || bsum || null;
  const brk = [[t('bkPaid'), paid, s.paid && s.paid.budget], [t('bkBrand'), brand, s.branding && s.branding.budget], [t('wa'), wa, s.wa && s.wa.budget], ...OH.map(g => [t('g_' + g), oh[g], monthGroup(s, g).budget])];
  const rows = `<div class="sp-brk">${brk.map(([l, v, bd]) => `<div><span>${esc(l)}</span><b>${num(fUSD(v))}</b>${bd ? `<small>${esc(t('ofBudget'))} ${num(fUSD(bd))}</small>` : '<small></small>'}</div>`).join('')}</div>`;
  if (!budget) return `<div class="panel sp-card"><h3 class="ch">${esc(t('budgetTitle'))}</h3><p class="muted">${esc(t('noBudget'))} <a href="#set" data-goset>${esc(t('setLink'))}</a></p><div class="sp-big">${num(fUSD(spent))}<small>${esc(t('spent'))}</small></div>${rows}</div>`;
  const elapsed = +to.slice(8), should = budget * elapsed / dim(m), pace = div(spent, should), pct = Math.min(100, spent / budget * 100);
  const pcls = pace == null ? '' : pace > 1.1 ? 'bad' : pace < 0.9 ? 'warn' : 'good';
  const plabel = pace == null ? '' : pace > 1.1 ? t('paceFast') : pace < 0.9 ? t('paceSlow') : t('paceOk');
  return `<div class="panel sp-card"><h3 class="ch">${esc(t('budgetTitle'))} <span class="muted">· ${esc(fDate(ms))} – ${esc(fDate(to))}</span></h3>
    <div class="sp-top"><div class="sp-big">${num(fUSD(spent))}<small>${esc(t('spent'))} · ${num(fP(spent / budget))} ${esc(t('spentPct'))}</small></div>
    <span class="dchip ${pcls}">${esc(plabel)} · ${num(fP(pace))}</span></div>
    <div class="bar sp-bar"><i class="${pcls === 'bad' ? 'bad' : pcls === 'warn' ? 'warn' : ''}" style="width:${pct}%"></i><b class="mark" style="inset-inline-start:${Math.min(100, should / budget * 100)}%" title="${esc(t('should'))}"></b></div>
    <div class="sp-row"><span>${esc(t('budget'))} ${num(fUSD(budget))}</span><span>${esc(t('should'))} ${num(fUSD(should))}</span><span>${esc(t('left'))} ${num(fUSD(budget - spent))}</span></div>${rows}</div>`;
}
function matrix(ds, from, to) {
  const { grp, noRes } = groupData(ds, from, to), R = settings.refs, by = R.leadsPer1000By || {};
  const refOf = (key, p) => key === 'leadsPer1000' ? (p === 'total' ? R.leadsPer1000 : by[p] ?? null) : key === 'pickupRate' ? (R.pickupRate == null ? null : R.pickupRate / 100) : R[key] ?? null;
  const cols = [['kgPer1000', 'kgk', 'up', v => fN(v, 0)], ['leadsPer1000', 'ldk', 'up', v => fN(v, 0)], ['cpl', 'cpl', 'down', v => fUSD(v, 2)], ['cpk', 'cpk', 'down', v => fUSD(v, 3)], ['pickupRate', 'pr', 'up', fP], ['kgPerOrder', 'kgo', 'up', v => fN(v, 1)], ['nr', 'nr', 'down', v => fUSD(v, 0)]];
  const mx = p => { const g = grp[p], m = metricsOf(g); m.nr = p === 'other' || p === 'wa' || p === 'meta' || p === 'totalOv' ? null : g.nr; return m; };
  const row = p => {
    const m = mx(p), label = p === 'other' ? t('other') : p === 'totalOv' ? t('totalOv') : t(p);
    const hasSpend = grp[p].spend > 0;
    const tds = cols.map(([key, , dir, f]) => {
      if (p === 'other' && !['pickupRate', 'kgPerOrder'].includes(key)) return `<td class="na">${esc(t('dash'))}</td>`;
      let v = m[key]; const ref = key === 'nr' ? 0 : refOf(key, p);
      const c = key === 'nr' ? (v == null ? 'na' : v > 0 ? 'bad' : 'good') : cls(v, ref, dir);
      return `<td class="${c}">${num(f(v))}</td>`;
    }).join('');
    const sub = `<span class="sub">${num(fUSD(grp[p].spend))} · ${num(fN(grp[p].leads))} / ${num(fN(grp[p].kg))} kg</span>`;
    return `<tr class="${p === 'total' ? 'tot' : ''}${p === 'totalOv' ? ' totov' : ''}${p === 'other' ? ' oth' : ''}"><th scope="row">${esc(label)}${sub}</th>${tds}</tr>`;
  };
  const tg = grp.total, mt = metricsOf(tg), mref = R.kgPer1000;
  const open = Math.max(0, tg.leads - tg.coh);
  const main = `<div class="sp-tiles"><div class="panel sp-main ${cls(mt.kgPer1000, mref, 'up')}"><div class="k">${esc(t('mainKpi'))}</div><div class="v">${num(fN(mt.kgPer1000, 0))}</div>
    <div class="t"><span>${esc(t('ref'))} ${num(fN(mref, 0))}</span></div><p class="muted sm">${esc(t('mainNote'))}</p></div>
    <div class="panel sp-open"><div class="k">${esc(t('openTitle'))}</div><div class="v">${num(fN(open))}</div><div class="t"><span>${esc(t('openOf')(fN(tg.leads)))}</span></div><p class="muted sm">${esc(t('openNote'))}</p></div></div>`;
  const head = `<tr><th>${esc(t('cols').platform)}</th>${cols.map(([, k, dir]) => `<th><span>${esc(t('cols')[k])}</span><small>${esc(t('dir')[dir])}</small></th>`).join('')}</tr>`;
  const nr = noRes.length ? `<details class="panel nr"><summary><b>${esc(t('nrTitle'))}</b> <span class="muted">${esc(t('nrSub')(settings.noResultMin ?? 50))} · ${num(fUSD(noRes.reduce((a, c) => a + c.spend, 0)))}</span></summary>
      <div class="tbl-wrap"><table class="lst"><tr><th>${esc(t('nrCamp'))}</th><th>${esc(t('nrPlat'))}</th><th>${esc(t('nrSpend'))}</th><th>${esc(t('nrDays'))}</th></tr>${noRes.map(c => `<tr><td dir="auto">${esc(c.name)}</td><td>${esc(t(c.plat))}</td><td>${num(fUSD(c.spend, 0))}</td><td>${num(c.days.size)}</td></tr>`).join('')}</table></div>
      <p class="muted sm pad">${esc(t('nrProxy'))}</p></details>`
    : `<div class="panel nr"><p class="muted pad">${esc(t('nrNone'))}</p></div>`;
  return `${main}<div class="panel"><div class="tbl-wrap"><table class="mx">${head}${[...PLATS.map(row), row('total'), row('other')].join('')}</table></div></div>${nr}
    <ul class="notes"><li>${esc(t('otherHint'))}</li><li>${esc(t('wdNote'))}</li><li>${esc(t('waNote'))}</li><li>${esc(t('ohNote'))}</li></ul>`;
}

// ---------------- rendering: partners ----------------
const pct = (a, b) => (b > 0 && a != null ? a / b : null);
function bar(p, c) { return `<div class="bar"><i class="${c === 'bad' ? 'bad' : c === 'warn' ? 'warn' : ''}" style="width:${Math.max(0, Math.min(100, (p || 0) * 100))}%"></i></div>`; }
function partnerSection(ds, from, to) {
  const S = sums(ds, from, to), P = settings.partners || [], PT = settings.partnerTargets || {};
  const rows = P.map(p => {
    const ids = p.sources || [], measurable = ids.length > 0;
    const eff = p.start && p.start > from ? p.start : from;
    const Se = eff === from ? S : sums(ds, eff, to);
    const a = { leads: 0, recv: 0, kg: 0 }; for (const id of ids) { const v = Se[id]; if (v) { a.leads += v.leads; a.recv += v.recv; a.kg += v.kg; } }
    return { p, measurable, ...a };
  });
  const active = rows.filter(r => r.leads > 0).length, leads = rows.reduce((a, r) => a + r.leads, 0), kg = rows.reduce((a, r) => a + r.kg, 0);
  const actMin = parseFloat(String(PT.active || '').replace('–', '-')), actTxt = PT.active ? String(PT.active) : '';
  const card = (label, val, f, tgt, tf) => { const pr = pct(val, tgt); const c = pr == null ? '' : pr >= 1 ? 'good' : pr >= 0.9 ? 'warn' : 'bad'; return `<div class="kpi"><div class="k">${esc(label)}</div><div class="v">${num(f(val))}</div>${tgt ? bar(pr, c) : ''}<div class="t"><span>${tgt ? esc(t('ptTarget')) + ' ' + num(tf(tgt)) : ''}</span><span class="d ${c}">${pr == null ? '' : num(fP(pr))}</span></div></div>`; };
  const cards = `<div class="kpis">${card(t('ptActive'), active, v => fN(v), isFinite(actMin) ? actMin : null, () => actTxt)}${card(t('ptLeads'), leads, v => fN(v), PT.leads, v => fN(v))}${card(t('ptKg'), kg, v => fN(v), PT.kg, v => fN(v))}</div>`;
  const body = rows.length ? `<div class="panel"><div class="tbl-wrap"><table class="lst"><tr><th>${esc(t('ptName'))}</th><th>${esc(t('ptStart'))}</th><th>${esc(t('ptLeads'))}</th><th>${esc(t('ptRecv'))}</th><th>${esc(t('ptKg'))}</th><th>${esc(t('ptKgo'))}</th><th>${esc(t('ptShare'))}</th></tr>
    ${rows.map(r => { if (!r.measurable) return `<tr class="warnrow"><td><b dir="auto">${esc(r.p.name)}</b></td><td>${esc(fDate(r.p.start))}</td><td colspan="5"><span class="dchip bad">${esc(t('ptNoSrc'))}</span> <span class="muted sm">${esc(t('ptNoSrcFix'))}</span></td></tr>`;
      const sh = r.p.kg ? pct(r.kg, r.p.kg) : r.p.leads ? pct(r.leads, r.p.leads) : null;
      return `<tr><td><b dir="auto">${esc(r.p.name)}</b></td><td>${esc(fDate(r.p.start))}</td><td>${num(fN(r.leads))}</td><td>${num(fN(r.recv))}</td><td>${num(fN(r.kg))}</td><td>${num(fN(div(r.kg, r.recv), 1))}</td><td>${sh == null ? esc(t('dash')) : num(fP(sh))}</td></tr>`; }).join('')}</table></div></div>`
    : `<div class="panel"><p class="muted pad">${esc(t('ptEmpty'))}</p></div>`;
  return `<div class="sec-h"><h2>${esc(t('ptTitle'))}</h2><p>${esc(t('ptSub'))}</p></div>${cards}<div style="height:14px"></div>${body}<ul class="notes"><li>${esc(t('ptNotes'))}</li></ul>`;
}

// ---------------- rendering: initiatives ----------------
function initSection(ds, from, to) {
  const I = settings.initiatives || [], order = { active: 0, planned: 1, paused: 2, done: 3 };
  const list = [...I].sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9));
  const head0 = `<div class="sec-h"><h2>${esc(t('inTitle'))}</h2><p>${esc(t('inSub'))}</p></div>`;
  if (!list.length) return head0 + `<div class="panel"><p class="muted pad">${esc(t('inNone'))}</p></div>`;
  const cards = list.map(i => {
    const a = i.start || from, b = i.end && i.end < to ? i.end : to, ids = i.sources || [];
    const head = `<div class="in-h"><b dir="auto">${esc(i.name)}</b><span class="stt st-${esc(i.status)}">${esc(t('st_' + i.status))}</span></div><div class="muted sm">${esc(fDate(i.start))} – ${esc(fDate(i.end))}</div>`;
    if (!ids.length) return `<div class="kpi in-card">${head}<p class="muted pad0">${esc(t('inUnlinked'))}</p></div>`;
    const S = b >= a ? sums(ds, a, b) : {}, per = ids.map(id => ({ id, ...(S[id] || { leads: 0, recv: 0, kg: 0 }) }));
    const leads = per.reduce((x, r) => x + r.leads, 0), recv = per.reduce((x, r) => x + r.recv, 0), kg = per.reduce((x, r) => x + r.kg, 0);
    const prim = i.leads ? pct(leads, i.leads) : null, c = prim == null ? '' : prim >= 1 ? 'good' : prim >= 0.7 ? 'warn' : 'bad';
    const rows = per.length > 1 || true ? `<table class="lst in-src"><tr><th>${esc(t('inSource'))}</th><th>${esc(t('inLeads'))}</th><th>${esc(t('inRecv'))}</th><th>${esc(t('inKg'))}</th></tr>${per.map(r => `<tr><td dir="auto">${esc(srcName(ds, r.id))}</td><td>${num(fN(r.leads))}</td><td>${num(fN(r.recv))}</td><td>${num(fN(r.kg))}</td></tr>`).join('')}</table>` : '';
    return `<div class="kpi in-card">${head}<div class="in-nums"><div><div class="v">${num(fN(leads))}</div><div class="k">${esc(t('inLeads'))}</div></div><div><div class="v">${num(fN(kg))}</div><div class="k">${esc(t('inKg'))}</div></div></div>
      ${prim == null ? `<p class="muted sm">${esc(t('inNoTarget'))}</p>` : bar(prim, c) + `<div class="t"><span>${esc(t('inTarget'))} ${num(fN(i.leads))} ${esc(t('inLeads'))}</span><span class="d ${c}">${num(fP(prim))} ${esc(t('inAch'))}</span></div>`}
      ${rows}</div>`;
  }).join('');
  return head0 + `<div class="kpis in-grid">${cards}</div>`;
}

// ---------------- rendering: team 1% ----------------
function metricValue(ds, key, from, to) {
  const [name, plat] = key.split(':'); const g = groupData(ds, from, to).grp[plat || 'total'];
  return g ? metricsOf(g)[name] : null;
}
function teamSection(ds, to) {
  const team = settings.team || [];
  const cards = team.map(m => {
    const setUp = m.metric && m.start != null && m.startDate;
    if (!setUp) return { ok: null, html: `<div class="kpi tm-card"><div class="tm-h"><b dir="auto">${esc(m.name)}</b><span class="stt st-planned">${esc(t('tmNotSet'))}</span></div><p class="muted sm pad0">${esc(t('tmNotSetNote'))}</p></div>` };
    const up = m.dir !== 'down', wd = workDays(addD(m.startDate, 1), to), target = m.start * Math.pow(up ? 1.01 : 0.99, wd);
    const val = d => { if (m.metric === 'manual') { const ds_ = Object.keys(m.manual || {}).filter(x => x <= d).sort(); return ds_.length ? m.manual[ds_.pop()] : null; } return metricValue(ds, m.metric, d.slice(0, 8) + '01', d); };
    const cur = val(to);
    const series = []; for (let d = m.startDate, n = 0; d <= to && n < 120; d = addD(d, 1), n++) { if (isFri(d)) continue; const v = val(d); if (v != null) series.push([d, v, m.start * Math.pow(up ? 1.01 : 0.99, workDays(addD(m.startDate, 1), d))]); }
    const imp = cur == null || !m.start ? null : (up ? 1 : -1) * (cur - m.start) / m.start;
    const ratio = cur == null ? null : up ? cur / target : target / cur;
    const st = ratio == null ? null : ratio > 1.02 ? 'ahead' : ratio >= 0.98 ? 'on' : 'behind';
    const stl = { ahead: [t('tmAhead'), 'good'], on: [t('tmOn'), 'good'], behind: [t('tmBehind'), 'bad'] }[st] || [t('tmNoData'), ''];
    const isP = /pickupRate/.test(m.metric), f = v => isP ? fP(v) : /cpk/.test(m.metric) ? fN(v, 3) : /kgPerOrder|cpl/.test(m.metric) ? fN(v, 2) : fN(v, 0);
    const label = (T[lang].mt || {})[m.metric] || m.metric;
    let spark = '';
    if (series.length > 1) {
      const vals = series.flatMap(s => [s[1], s[2]]), lo = Math.min(...vals), hi = Math.max(...vals), W = 220, H = 46, x = i => 4 + i / (series.length - 1) * (W - 8), y = v => hi === lo ? H / 2 : H - 4 - (v - lo) / (hi - lo) * (H - 8);
      spark = `<svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><polyline class="tg" points="${series.map((s, i) => x(i).toFixed(1) + ',' + y(s[2]).toFixed(1)).join(' ')}"/><polyline class="ac" points="${series.map((s, i) => x(i).toFixed(1) + ',' + y(s[1]).toFixed(1)).join(' ')}"/></svg>`;
    }
    return { ok: st === 'ahead' || st === 'on', html: `<div class="kpi tm-card ${st === 'behind' ? 'st-bad' : st ? 'st-good' : ''}"><div class="tm-h"><b dir="auto">${esc(m.name)}</b><span class="dchip ${stl[1]}">${esc(stl[0])}</span></div>
      <div class="k">${esc(label)} · ${esc(t('dir')[up ? 'up' : 'down'])}</div><div class="v">${num(f(cur))}</div>
      <div class="tm-row"><span>${esc(t('tmStart'))} ${num(f(m.start))}</span><span>${esc(t('tmTarget'))} ${num(f(target))}</span></div>
      <div class="t"><span>${esc(t('tmImp'))} ${num(imp == null ? t('dash') : (imp >= 0 ? '+' : '−') + fN(Math.abs(imp) * 100, 1) + '%')} · ${esc(t('tmPlan'))} ${num('+' + fN((Math.pow(1.01, wd) - 1) * 100, 1) + '%')}</span><span>${esc(t('tmDay')(wd))}</span></div>${spark}</div>` };
  });
  const setN = cards.filter(c => c.ok != null).length, okN = cards.filter(c => c.ok).length;
  return `<div class="sec-h"><h2>${esc(t('tmTitle'))}</h2><p>${esc(t('tmSub'))}</p></div>
    <div class="panel tm-sum"><b>${num(okN)} / ${num(team.length)}</b> <span class="muted">${esc(t('tmSummary'))}${setN < team.length ? ' · ' + num(team.length - setN) + ' ' + esc(t('tmNotSet')) : ''}</span></div>
    <div class="kpis tm-grid">${cards.map(c => c.html).join('')}</div>`;
}

// ---------------- settings screen ----------------
const uid = () => Math.random().toString(36).slice(2, 8);
function srcName(ds, id) { const s = ((ds.kpi && ds.kpi.sources) || []).find(x => x[0] === id); return s ? s[1] : '#' + id; }
function chipsField(path, ids, hint, listId) {
  return `<div class="chips" data-path="${path}">${ids.map(v => `<span class="cp">${esc(typeof v === 'number' ? srcName(ctx.ds, v) : v)}<button type="button" data-rm="${esc(String(v))}" aria-label="${esc(t('remove'))}">×</button></span>`).join('')}<input list="${listId}" placeholder="${esc(hint)}" data-add></div>`;
}
function fld(label, input) { return `<label class="fld"><span>${esc(label)}</span>${input}</label>`; }
function inp(path, v, type = 'text', extra = '') { return `<input type="${type}" data-path="${path}" value="${v == null ? '' : esc(v)}" ${extra}>`; }
function settingsHTML(ds) {
  const m = settings._month || (settings._month = (ctx.to || todayKSA()).slice(0, 7)), mm = settings.months[m] || {}, R = settings.refs, by = R.leadsPer1000By || {};
  const srcOpts = ((ds.kpi && ds.kpi.sources) || []).map(s => `<option value="${esc(s[1])}">`).join('');
  const campNames = [...new Set(AD_PLATS.flatMap(p => ((ds.ads && ds.ads.cdet && ds.ads.cdet[p]) || []).map(x => x[1])))].sort();
  const months = [...new Set([m, (ctx.to || todayKSA()).slice(0, 7), ...Object.keys(settings.months)])].sort().reverse();
  const teamNames = (settings.team || []).map(x => x.name);
  return `<datalist id="dl-src">${srcOpts}</datalist><datalist id="dl-camp">${campNames.map(n => `<option value="${esc(n)}">`).join('')}</datalist>
  <div class="sec-h"><h2>${esc(t('seTitle'))}</h2><p>${esc(t('seSub'))}</p></div>
  ${persistent ? '' : `<div class="err warnbar">${esc(t('seDemo'))}</div>`}
  <div class="se-bar"><button class="chip" aria-pressed="true" id="seSave">${esc(t('seSave'))}</button><span id="seStatus" class="muted">${esc(status || (dirty ? t('seUnsaved') : ''))}</span></div>

  <section class="panel se-card"><h3 class="ch">${esc(t('seMonth'))}</h3><div class="se-grid">
    ${fld(t('seMonthSel'), `<select data-month>${months.map(x => `<option value="${x}" ${x === m ? 'selected' : ''}>${x}</option>`).join('')}</select>`)}
    ${fld(t('seBudget'), inp('months.' + m + '.budget', mm.budget, 'number', 'min="0" step="1" inputmode="decimal"'))}</div>
    <div class="se-grid">${fld(t('seBudgetPaid'), inp(`months.${m}.paid.budget`, mm.paid && mm.paid.budget, 'number', 'min="0" step="1" inputmode="decimal"'))}${fld(t('seBudgetWa'), inp(`months.${m}.wa.budget`, mm.wa && mm.wa.budget, 'number', 'min="0" step="1" inputmode="decimal"'))}${fld(t('seBudgetBrand'), inp(`months.${m}.branding.budget`, mm.branding && mm.branding.budget, 'number', 'min="0" step="1" inputmode="decimal"'))}</div>
    <p class="muted sm">${esc(t('seOhHint')(dim(m)))}</p>
    ${['tools', 'ugc', 'production'].map(g => `<div class="se-sub"><b>${esc(t('g_' + g))}</b><div class="se-grid">${fld(t('seBudgetM'), inp(`months.${m}.${g}.budget`, mm[g] && mm[g].budget, 'number', 'min="0" step="1" inputmode="decimal"'))}${fld(t('seSpendM'), inp(`months.${m}.${g}.spend`, mm[g] && mm[g].spend, 'number', 'min="0" step="1" inputmode="decimal"'))}</div></div>`).join('')}
    <div class="se-sub"><b>${esc(t('g_services'))}</b><div class="se-grid">${fld(t('seBudgetM'), inp(`months.${m}.services.budget`, mm.services && mm.services.budget, 'number', 'min="0" step="1" inputmode="decimal"'))}</div>
      ${((mm.services && mm.services.items) || []).map((it, i) => `<div class="se-grid">${fld(t('seSvcName'), inp(`months.${m}.services.items.${i}.name`, it.name))}${fld(t('seSvcCost'), inp(`months.${m}.services.items.${i}.cost`, it.cost, 'number', 'min="0" step="1" inputmode="decimal"'))}<button class="chip" data-delsvc="${m}.${i}">${esc(t('remove'))}</button></div>`).join('')}
      <button class="chip" data-newsvc="${m}">+ ${esc(t('seSvcAdd'))}</button></div></section>

  <section class="panel se-card"><h3 class="ch">${esc(t('seRefs'))}</h3><div class="se-grid">
    ${fld(t('seRefKg'), inp('refs.kgPer1000', R.kgPer1000, 'number', 'step="any"'))}${fld(t('seRefLd'), inp('refs.leadsPer1000', R.leadsPer1000, 'number', 'step="any"'))}
    ${['meta', 'tiktok', 'snapchat', 'google'].map(p => fld(t('seRefLd').replace('(total)', '(' + t(p) + ')').replace('(الإجمالي)', '(' + t(p) + ')'), inp('refs.leadsPer1000By.' + p, by[p], 'number', 'step="any"'))).join('')}
    ${fld(t('seRefCpl'), inp('refs.cpl', R.cpl, 'number', 'step="any"'))}${fld(t('seRefCpk'), inp('refs.cpk', R.cpk, 'number', 'step="any"'))}
    ${fld(t('seRefPr'), inp('refs.pickupRate', R.pickupRate, 'number', 'step="any"'))}${fld(t('seRefKgo'), inp('refs.kgPerOrder', R.kgPerOrder, 'number', 'step="any"'))}
    ${fld(t('seNr'), inp('noResultMin', settings.noResultMin, 'number', 'step="1"'))}</div></section>

  <section class="panel se-card"><h3 class="ch">${esc(t('sePt'))}</h3><div class="se-grid">
    ${fld(t('tgtActive'), inp('partnerTargets.active', settings.partnerTargets.active))}${fld(t('tgtLeads'), inp('partnerTargets.leads', settings.partnerTargets.leads, 'number'))}${fld(t('tgtKg'), inp('partnerTargets.kg', settings.partnerTargets.kg, 'number'))}</div>
    ${(settings.partners || []).map((p, i) => `<div class="se-item"><div class="se-grid">${fld(t('name'), inp(`partners.${i}.name`, p.name))}${fld(t('start'), inp(`partners.${i}.start`, p.start, 'date'))}${fld(t('tgtLeads'), inp(`partners.${i}.leads`, p.leads, 'number'))}${fld(t('tgtKg'), inp(`partners.${i}.kg`, p.kg, 'number'))}</div>
      ${fld(t('sources'), chipsField(`partners.${i}.sources`, p.sources || [], t('srcHint'), 'dl-src'))}<button class="chip" data-del="partners.${i}">${esc(t('remove'))}</button></div>`).join('')}
    <button class="chip" data-new="partners">+ ${esc(t('add'))}</button></section>

  <section class="panel se-card"><h3 class="ch">${esc(t('seInit'))}</h3>
    ${(settings.initiatives || []).map((p, i) => `<div class="se-item"><div class="se-grid">${fld(t('name'), inp(`initiatives.${i}.name`, p.name))}
      ${fld(t('status'), `<select data-path="initiatives.${i}.status">${['planned', 'active', 'paused', 'done'].map(s => `<option value="${s}" ${p.status === s ? 'selected' : ''}>${esc(t('st_' + s))}</option>`).join('')}</select>`)}
      ${fld(t('start'), inp(`initiatives.${i}.start`, p.start, 'date'))}${fld(t('end'), inp(`initiatives.${i}.end`, p.end, 'date'))}
      ${fld(t('tgtLeads'), inp(`initiatives.${i}.leads`, p.leads, 'number'))}</div>
      ${fld(t('sources'), chipsField(`initiatives.${i}.sources`, p.sources || [], t('srcHint'), 'dl-src'))}
      <button class="chip" data-del="initiatives.${i}">${esc(t('remove'))}</button></div>`).join('')}
    <button class="chip" data-new="initiatives">+ ${esc(t('add'))}</button></section>

  <section class="panel se-card"><h3 class="ch">${esc(t('seTeam'))}</h3>
    ${(settings.team || []).map((p, i) => `<div class="se-item"><div class="se-grid">${fld(t('name'), inp(`team.${i}.name`, p.name))}
      ${fld(t('metric'), `<select data-path="team.${i}.metric"><option value="">${esc(t('none'))}</option>${Object.entries(T[lang].mt).map(([k, v]) => `<option value="${k}" ${p.metric === k ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select>`)}
      ${fld(t('direction'), `<select data-path="team.${i}.dir"><option value="up" ${p.dir !== 'down' ? 'selected' : ''}>${esc(t('up'))}</option><option value="down" ${p.dir === 'down' ? 'selected' : ''}>${esc(t('down'))}</option></select>`)}
      ${fld(t('startVal'), inp(`team.${i}.start`, p.start, 'number', 'step="any"'))}${fld(t('start'), inp(`team.${i}.startDate`, p.startDate, 'date'))}${fld(t('days'), inp(`team.${i}.days`, p.days, 'number'))}</div>
      ${p.metric === 'manual' ? `<div class="se-grid">${fld(t('date'), `<input type="date" data-mdate="${i}">`)}${fld(t('value'), `<input type="number" step="any" data-mval="${i}">`)}<button class="chip" data-madd="${i}">+ ${esc(t('manualAdd'))}</button></div><div class="muted sm">${Object.entries(p.manual || {}).sort().map(([d, v]) => `${esc(d)}: ${num(fN(v, 2))}`).join(' · ')}</div>` : ''}</div>`).join('')}</section>`;
}
function setPath(o, path, v) { const k = path.split('.'); let c = o; for (let i = 0; i < k.length - 1; i++) { if (c[k[i]] == null) c[k[i]] = {}; c = c[k[i]]; } c[k[k.length - 1]] = v; }
function getPath(o, path) { return path.split('.').reduce((c, k) => (c == null ? c : c[k]), o); }
function wireSettings(root) {
  const mark = () => { dirty = true; status = ''; const s = $('#seStatus'); if (s) s.textContent = t('seUnsaved'); };
  root.addEventListener('input', e => {
    const el = e.target; if (!el.dataset || !el.dataset.path || el.tagName === 'DIV') return;
    let v = el.value; if (el.type === 'number') v = v === '' ? null : Number(v);
    if (/\.status$|\.owner$|\.metric$|\.dir$/.test(el.dataset.path) || el.type === 'text' || el.type === 'date') { /* keep as string */ }
    setPath(settings, el.dataset.path, v); mark();
    if (/\.metric$/.test(el.dataset.path)) renderSettings();
  });
  root.addEventListener('change', e => {
    const el = e.target;
    if (el.dataset && el.dataset.month != null) { settings._month = el.value; renderSettings(); }
    if (el.dataset && el.dataset.add != null) addChip(el);
  });
  root.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.dataset && e.target.dataset.add != null) { e.preventDefault(); addChip(e.target); } });
  root.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.rm != null) { const box = b.closest('.chips'), arr = getPath(settings, box.dataset.path) || [], v = b.dataset.rm; setPath(settings, box.dataset.path, arr.filter(x => String(x) !== v)); mark(); renderSettings(); }
    else if (b.dataset.del) { const [k, i] = b.dataset.del.split('.'); settings[k].splice(+i, 1); mark(); renderSettings(); }
    else if (b.dataset.new) { settings[b.dataset.new].push(b.dataset.new === 'partners' ? { name: '', sources: [], start: '', leads: null, kg: null } : { name: '', status: 'planned', start: '', end: '', sources: [], leads: null }); mark(); renderSettings(); }
    else if (b.dataset.newsvc) { const m = b.dataset.newsvc; settings.months[m] = settings.months[m] || {}; settings.months[m].services = settings.months[m].services || { budget: null, items: [] }; settings.months[m].services.items = settings.months[m].services.items || []; settings.months[m].services.items.push({ name: '', cost: null }); mark(); renderSettings(); }
    else if (b.dataset.delsvc) { const [m, i] = b.dataset.delsvc.split('.'); settings.months[m].services.items.splice(+i, 1); mark(); renderSettings(); }
    else if (b.dataset.madd != null) { const i = +b.dataset.madd, d = root.querySelector(`[data-mdate="${i}"]`).value, v = root.querySelector(`[data-mval="${i}"]`).value; if (d && v !== '') { settings.team[i].manual = { ...(settings.team[i].manual || {}), [d]: Number(v) }; mark(); renderSettings(); } }
    else if (b.id === 'seSave') save();
  });
}
function addChip(el) {
  const box = el.closest('.chips'), val = el.value.trim(); if (!val) return;
  const path = box.dataset.path, arr = getPath(settings, path) || [];
  if (/sources$/.test(path)) { const s = ((ctx.ds.kpi && ctx.ds.kpi.sources) || []).find(x => x[1].toLowerCase() === val.toLowerCase()); if (!s) { el.value = ''; return; } if (!arr.includes(s[0])) arr.push(s[0]); }
  else if (!arr.includes(val)) arr.push(val);
  setPath(settings, path, arr); dirty = true; status = ''; renderSettings();
}
async function save() {
  const body = JSON.parse(JSON.stringify(settings)); delete body._month;
  try {
    if (persistent) {
      const r = await fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || r.status);
      const j = await r.json(); persistent = j.persistent !== false;
    }
    try { localStorage.setItem('awon-kpi-settings', JSON.stringify(body)); } catch (e) {}
    dirty = false; status = t('seSaved'); const s = $('#seStatus'); if (s) s.textContent = status; renderAll();
  } catch (e) { status = t('seFail') + ': ' + e.message; const s = $('#seStatus'); if (s) s.textContent = status; }
}

// ---------------- load + public API ----------------
async function loadSettings() {
  let s = null;
  try { const r = await fetch('/api/settings', { cache: 'no-store' }); if (r.ok) { const j = await r.json(); s = j.settings; persistent = j.persistent !== false; } else persistent = false; } catch (e) { persistent = false; }
  if (!s) { try { s = JSON.parse(localStorage.getItem('awon-kpi-settings') || 'null'); } catch (e) {} }
  const d = JSON.parse(JSON.stringify(DEFAULTS));
  settings = Object.assign(d, s || {});
  settings.refs = Object.assign({}, d.refs, (s && s.refs) || {}); settings.refs.leadsPer1000By = Object.assign({}, d.refs.leadsPer1000By, (s && s.refs && s.refs.leadsPer1000By) || {});
  settings.partnerTargets = Object.assign({}, d.partnerTargets, (s && s.partnerTargets) || {});
  if (!settings.team || !settings.team.length) settings.team = d.team;
  saved = JSON.stringify(settings);
}
function box(id, html) { const el = $('#' + id); if (el) el.innerHTML = html; }
function renderAll() {
  if (!ctx || !settings) return;
  lang = ctx.lang; const { ds, from, to } = ctx;
  const hasKpi = ds && ds.kpi && ds.kpi.mode !== 'error' && ds.kpi.leads;
  const guard = fn => { try { return fn(); } catch (e) { console.error(e); return `<div class="err">${esc(e.message)}</div>`; } };
  const tab = $('#tab-set'); if (tab) tab.textContent = t('tabSet');
  if (!hasKpi) { for (const id of ['kpiSpend', 'kpiPartners', 'kpiInit', 'kpiTeam']) box(id, ctx.ds ? `<div class="err warnbar">${esc(t('noKpi'))}</div>` : ''); }
  else {
    if (!ctx.view || ctx.view === 'perf') {
      box('kpiSpend', guard(() => `<div class="kpi-sub"><div class="sec-h sub"><h3>${esc(t('spTitle'))}</h3><p>${esc(t('spSub'))}</p></div>${budgetCard(ds, to)}<div class="sec-h sub"><h3>${esc(t('mxTitle'))}</h3><p>${esc(t('mxSub'))}</p></div>${matrix(ds, from, to)}</div>`));
      box('kpiPartners', guard(() => `<section class="kpi-sec">${partnerSection(ds, from, to)}</section>`));
      box('kpiInit', guard(() => `<section class="kpi-sec">${initSection(ds, from, to)}</section>`));
    }
    if (!ctx.view || ctx.view === 'mkt') box('kpiTeam', guard(() => `<section class="kpi-sec">${teamSection(ds, to)}</section>`));
  }
  if (ctx.view === 'set') renderSettings();
}
function renderSettings() {
  const root = $('#kpiSet'); if (!root || !ctx || !settings) return;
  const keep = document.activeElement && document.activeElement.dataset && document.activeElement.dataset.path;
  const y = window.scrollY; root.innerHTML = settingsHTML(ctx.ds);
  if (!root._wired) { wireSettings(root); root._wired = true; }
  window.scrollTo(0, y);
}
async function render(c) {
  ctx = c; lang = c.lang;
  if (!settings) { await loadSettings(); }
  if (!wired) { document.addEventListener('click', e => { if (e.target.closest('[data-goset]')) { e.preventDefault(); const b = $('#tab-set'); if (b) b.click(); } }); wired = true; }
  renderAll();
}
window.AwonKpi = { render, tabLabel: l => T[l].tabSet };
})();
