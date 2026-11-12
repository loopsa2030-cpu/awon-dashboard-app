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
  partnerBench: { tiktok: { all: 148, jeddah: 168, riyadh: 128, eastern: 148, madina: 136, asir: 146 }, snapchat: { all: 140, jeddah: 151, riyadh: 141, eastern: 137, madina: 127, asir: 142, taif: 120, mecca: 141 },
    meta: { all: 114, jeddah: 151, riyadh: 111, eastern: 122, madina: 97, asir: 74, taif: 100 }, google: {} },
  partnerCpk: { pick: 2, s: [0.191, 0.206, 0.223], band: 0.03 },
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
  // Paid, branding and WhatsApp budgets: the Settings value when entered, otherwise the month's forecast tab
  const fcCities = (ds.months && ds.months[m] && ds.months[m].forecast && ds.months[m].forecast.cities) || [];
  const fcB = k => fcCities.reduce((a, c) => a + ((c[k] && c[k].budget) || 0), 0) || null;
  const gb = (g, k) => Number(s[g] && s[g].budget) || fcB(k);
  const bPaid = gb('paid', 'paid'), bBrand = gb('branding', 'organic'), bWa = gb('wa', 'wa');
  const spent = ads + wa + oh.total, bsum = (bPaid || 0) + (bBrand || 0) + (bWa || 0) + OH.reduce((a, g) => a + (Number(monthGroup(s, g).budget) || 0), 0), budget = s.budget || bsum || null;
  const brk = [[t('bkPaid'), paid, bPaid], [t('bkBrand'), brand, bBrand], [t('wa'), wa, bWa], ...OH.map(g => [t('g_' + g), oh[g], monthGroup(s, g).budget])];
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

// ---------------- partnerships tab ----------------
// Partnership leads = direct leads (Odoo, partner source) + uplift of partner ads over the benchmark (leads per $1,000).
// Inputs (partners, targets, benchmarks, CPK scenario, non-paid costs) come from Settings; actuals from Odoo; spend from the ad accounts.
Object.assign(T.en, {
  ptTitle: 'Partnership leads', ptSub: 'Direct leads from the partner source + uplift of partner ads over the benchmark',
  ptOfLeads: 'of', ptLeadsU: 'leads', ptShould: 'Should be at by today', ptLeft: 'Left', ptTargetL: 'Target',
  ptDirect: 'Direct leads', ptDirectSub: 'From the partner source in Odoo · the base of the target', ptUplift: 'Uplift over benchmark', ptUpliftSub: 'From partner videos in our ads',
  ptEq: 'Direct leads + uplift = partnership leads', ptKgT: 'Weight received', ptSpendT: 'Partnership spend', ptSpendSub: (a, b) => `Paid ads ${a} + other costs ${b}`,
  ptCards: 'Partners', ptCardsSub: 'Each partner against its own target, prorated to today',
  wfGross: 'With partner source', wfDup: 'Duplicate', wfProh: 'Prohibited items', wfOut: 'Out of coverage', wfValid: 'Valid direct',
  ptAdsN: n => `Uplift from ads (${n} ${n === 1 ? 'ad' : 'ads'})`, ptTotal: 'Partner total', ptOfT: (a, b) => `${a} of ${b} · should be at ${b === '–' ? '–' : ''}`,
  ptPick: 'Pickups received', ptKg: 'Weight received', ptPaid: 'Paid ads', ptOther: 'Other costs', ptSpend: 'Total spend', ptCpl: 'Cost per lead', ptCpk: 'Cost per kg',
  ptOnTrack: 'On track', ptBehind: 'Behind', ptAhead: 'Ahead', ptNoTarget: 'No target set', ptNotStarted: 'Not started',
  ptNone: 'No partners yet. Add each partner in Settings: name, Odoo source, targets, ad names and other costs.', ptGo: 'Open Settings',
  ptAds: 'Partner ads', ptAdsSub: 'Ads whose campaign, ad set or ad name carries the partner name · each ad stands alone · never negative',
  ptAdCols: ['Partner', 'Ad', 'Platform · city', 'Spend', 'Bench. /$1k', 'Expected', 'Actual', 'Counted', 'Status'],
  ptAbove: 'Above expected · counts the increase', ptBelow: 'Below expected · stop spend, counts its leads', ptNoBench: 'No benchmark for this platform',
  ptFuzzy: 'Name close to the partner: check spelling or add an alias', ptMatchedOn: { ad: 'ad', adset: 'ad set', campaign: 'campaign' },
  ptNoAds: 'No ad names match any partner in this period.',
  ptBench: 'Benchmarks', ptBenchSub: 'Leads per $1,000 from our usual lead campaigns, October 2026 · edit in Settings',
  ptAll: 'All cities', ptBenchNote: 'An empty city uses the platform\'s overall number.',
  ptCpkT: 'CPK target', ptScen: 'Scenario', ptSel: 'selected', ptBand: 'band',
  ptCpkRule: 'Raise spend when partner CPK is below the band, keep within it, stop above it. Measured per partner (paid ads ÷ kg) until ads are tagged in Odoo.',
  ptRaise: 'Raise spend', ptKeep: 'Keep spend', ptStop: 'Stop spend',
  ptReady: 'Launch readiness', ptReadySub: 'Must be in place before a partner launches, or its leads cannot be counted',
  rdSrc: 'Odoo source linked in Settings', rdAds: 'Ads named with the partner found', rdPage: 'Partner page ready and launch message agreed', rdPch: 'Partner channels activated', rdAch: 'Awon channels activated',
  rdAuto: 'Automatic', rdManual: 'Ticked in Settings',
  ptNotes: ['Odoo has no ad-level tag (utm_content) on leads, so uplift uses the platform lead count without the Odoo cap, and CPK is per partner, not per ad.', 'Meta counts Website leads here, the number the benchmark is built on.', 'Lost leads with the reasons duplicate, prohibited items and out of coverage are removed from direct leads.'],
  // settings
  sePtBench: 'Partner benchmarks (leads per $1,000)', sePtCpk: 'Partner CPK scenarios (USD per kg)', seEnd: 'End', seCities: 'Cities', seAliases: 'Other spellings in ad names',
  seAliasHint: 'Type a spelling and press Enter', seCityHint: 'Type a city and press Enter', seCosts: 'Other costs (not paid ads)', seCostAdd: 'Add a cost', seCostName: 'Item', seCostAmt: 'Cost this month (USD)',
  seChecks: 'Launch checklist', ckPage: 'Partner page and launch message', ckPch: 'Partner channels', ckAch: 'Awon channels', seBand: 'Band (e.g. 0.03 = ±3%)', seScen: n => `Scenario ${n}`, sePick: 'Selected scenario',
});
Object.assign(T.ar, {
  ptTitle: 'ليدز الشراكات', ptSub: 'الليد المباشر من مصدر الشريك + الزيادة على البنش مارك في إعلانات الشريك',
  ptOfLeads: 'من', ptLeadsU: 'ليد', ptShould: 'المفروض حتى اليوم', ptLeft: 'المتبقي', ptTargetL: 'الهدف',
  ptDirect: 'الليد المباشر', ptDirectSub: 'من مصدر الشريك في أودو · أساس الهدف', ptUplift: 'الزيادة على البنش مارك', ptUpliftSub: 'من فيديوهات الشريك في إعلاناتنا',
  ptEq: 'الليد المباشر + الزيادة = ليدز الشراكات', ptKgT: 'الوزن المستلم', ptSpendT: 'صرف الشراكات', ptSpendSub: (a, b) => `إعلانات ${a} + تكاليف أخرى ${b}`,
  ptCards: 'الشركاء', ptCardsSub: 'كل شريك مقابل هدفه حتى اليوم',
  wfGross: 'بمصدر الشريك', wfDup: 'مكررة', wfProh: 'مواد ممنوعة', wfOut: 'خارج التغطية', wfValid: 'المباشر الصالح',
  ptAdsN: n => `الزيادة من الإعلانات (${n})`, ptTotal: 'إجمالي الشريك', ptOfT: (a, b) => `${a} من ${b}`,
  ptPick: 'الاستلامات', ptKg: 'الوزن المستلم', ptPaid: 'الإعلانات', ptOther: 'تكاليف أخرى', ptSpend: 'إجمالي الصرف', ptCpl: 'تكلفة الليد', ptCpk: 'تكلفة الكيلو',
  ptOnTrack: 'على المسار', ptBehind: 'متأخر', ptAhead: 'متقدم', ptNoTarget: 'لا يوجد هدف', ptNotStarted: 'لم يبدأ',
  ptNone: 'لا يوجد شركاء بعد. أضف كل شريك في الإعدادات: الاسم، مصدر أودو، الأهداف، أسماء الإعلانات والتكاليف الأخرى.', ptGo: 'فتح الإعدادات',
  ptAds: 'إعلانات الشركاء', ptAdsSub: 'إعلانات اسم حملتها أو مجموعتها أو الإعلان نفسه يحمل اسم الشريك · كل إعلان لحاله · لا يوجد سالب',
  ptAdCols: ['الشريك', 'الإعلان', 'المنصة · المدينة', 'الصرف', 'البنش /$1k', 'المتوقع', 'الفعلي', 'المحسوب', 'الحالة'],
  ptAbove: 'فوق المتوقع · تُحسب الزيادة', ptBelow: 'تحت المتوقع · نوقف الصرف وتُحسب ليدزه', ptNoBench: 'لا يوجد بنش مارك لهذه المنصة',
  ptFuzzy: 'الاسم قريب من اسم الشريك: تأكد من الإملاء أو أضفه كاسم بديل', ptMatchedOn: { ad: 'الإعلان', adset: 'المجموعة', campaign: 'الحملة' },
  ptNoAds: 'لا توجد إعلانات بأسماء الشركاء في هذه الفترة.',
  ptBench: 'البنش مارك', ptBenchSub: 'ليدز لكل 1,000$ من حملات الليدز المعتادة، أكتوبر 2026 · يُعدّل من الإعدادات',
  ptAll: 'كل المدن', ptBenchNote: 'المدينة الفارغة تأخذ رقم المنصة الكلي.',
  ptCpkT: 'تكلفة الكيلو المستهدفة', ptScen: 'السيناريو', ptSel: 'المختار', ptBand: 'النطاق',
  ptCpkRule: 'نرفع الصرف إذا تكلفة كيلو الشريك أقل من النطاق، نستمر داخله، ونوقف فوقه. تُقاس لكل شريك (الإعلانات ÷ الكيلو) حتى تُوسم الإعلانات في أودو.',
  ptRaise: 'نرفع الصرف', ptKeep: 'نستمر بنفس الصرف', ptStop: 'نوقف الصرف',
  ptReady: 'جاهزية الإطلاق', ptReadySub: 'لازم تكتمل قبل إطلاق أي شريك حتى يُحسب الليد',
  rdSrc: 'مصدر أودو مربوط في الإعدادات', rdAds: 'إعلانات باسم الشريك موجودة', rdPage: 'صفحة الشريك جاهزة ورسالة الإطلاق متفق عليها', rdPch: 'قنوات الشريك مفعلة', rdAch: 'قنوات عون مفعلة',
  rdAuto: 'تلقائي', rdManual: 'يُحدد في الإعدادات',
  ptNotes: ['أودو لا يحفظ وسم الإعلان (utm_content) على الليد، لذلك الزيادة تعتمد على ليدز المنصة بدون سقف أودو، وتكلفة الكيلو لكل شريك وليس لكل إعلان.', 'ميتا تُحسب هنا بـ Website leads، وهو الرقم الذي بُني عليه البنش مارك.', 'الليدز المفقودة بسبب التكرار أو المواد الممنوعة أو خارج التغطية تُخصم من الليد المباشر.'],
  sePtBench: 'بنش مارك الشراكات (ليدز لكل 1,000$)', sePtCpk: 'سيناريوهات تكلفة الكيلو للشراكات', seEnd: 'النهاية', seCities: 'المدن', seAliases: 'كتابات أخرى للاسم في الإعلانات',
  seAliasHint: 'اكتب الاسم واضغط Enter', seCityHint: 'اكتب المدينة واضغط Enter', seCosts: 'تكاليف أخرى (غير الإعلانات)', seCostAdd: 'إضافة تكلفة', seCostName: 'البند', seCostAmt: 'التكلفة هذا الشهر (دولار)',
  seChecks: 'قائمة الإطلاق', ckPage: 'صفحة الشريك ورسالة الإطلاق', ckPch: 'قنوات الشريك', ckAch: 'قنوات عون', seBand: 'النطاق (0.03 = ±3%)', seScen: n => `السيناريو ${n}`, sePick: 'السيناريو المختار',
});
const PL_STAGES = ['planning', 'communication', 'won', 'lost'];
Object.assign(T.en, { plTitle: 'Partnership flow', plSub: 'Companies at each stage. Nouf keeps the lists up to date in Settings.', pl_planning: 'Planning', pl_communication: 'Communication', pl_won: 'Won', pl_lost: 'Lost',
  plEmpty: 'No companies yet', plEdit: 'Edit in Settings', plSet: 'Partnership flow (companies by stage)', plSetSub: 'Add each company under its stage. Use "Stage" to move it when it progresses.', plCompany: 'Company', plNote: 'Note (optional)', plStage: 'Stage', plAdd: 'Add company', plCount: n => `${n} ${n === 1 ? 'company' : 'companies'}` });
Object.assign(T.ar, { plTitle: 'مسار الشراكات', plSub: 'الشركات في كل مرحلة. نوف تحدّث القوائم من الإعدادات.', pl_planning: 'التخطيط', pl_communication: 'التواصل', pl_won: 'تم الاتفاق', pl_lost: 'لم يتم الاتفاق',
  plEmpty: 'لا توجد شركات بعد', plEdit: 'تعديل من الإعدادات', plSet: 'مسار الشراكات (الشركات حسب المرحلة)', plSetSub: 'أضف كل شركة تحت مرحلتها، واستخدم «المرحلة» لنقلها عند تقدّمها.', plCompany: 'الشركة', plNote: 'ملاحظة (اختياري)', plStage: 'المرحلة', plAdd: 'إضافة شركة', plCount: n => `${n} ${n === 1 ? 'شركة' : 'شركات'}` });
const PB_CITIES = ['jeddah', 'riyadh', 'eastern', 'madina', 'asir', 'taif', 'mecca', 'qassim'];
const PB_PLATS = ['tiktok', 'snapchat', 'meta'];
const CITY_LBL = { en: { jeddah: 'Jeddah', riyadh: 'Riyadh', eastern: 'Eastern', madina: 'Madina', asir: 'Asir', taif: 'Taif', mecca: 'Mecca', qassim: 'Qassim' },
  ar: { jeddah: 'جدة', riyadh: 'الرياض', eastern: 'الشرقية', madina: 'المدينة', asir: 'عسير', taif: 'الطائف', mecca: 'مكة', qassim: 'القصيم' } };
const normName = s => String(s || '').toLowerCase().replace(/[ً-ٰٟـ]/g, '').replace(/[أإآٱ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي')
  .replace(/[^a-z0-9؀-ۿ]+/g, ' ').trim();
function lev(a, b) {
  if (a === b) return 0; let p = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) { const c = [i]; for (let j = 1; j <= b.length; j++) c[j] = Math.min(p[j] + 1, c[j - 1] + 1, p[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); p = c; }
  return p[b.length];
}
// 'exact' when the name contains the term (ignoring case, spaces, symbols and Arabic letter forms), 'fuzzy' when it is 1-2 letters off
function matchTerm(name, term) {
  const n = normName(name), tt = normName(term); if (!n || !tt) return null;
  const toks = n.split(' '), tc = tt.replace(/ /g, '');
  if (tc.length < 4) return toks.some(x => x === tc) || n.includes(tt) && new RegExp('(^| )' + tt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '( |$)').test(n) ? 'exact' : null;
  if (n.replace(/ /g, '').includes(tc)) return 'exact';
  const k = tc.length >= 8 ? 2 : 1, tn = tt.split(' ').length;
  for (let w = Math.max(1, tn - 1); w <= tn + 1; w++) for (let i = 0; i + w <= toks.length; i++) {
    const c = toks.slice(i, i + w).join(''); if (Math.abs(c.length - tc.length) <= k && lev(c, tc) <= k) return 'fuzzy';
  }
  return null;
}
const CITY_RX = [['riyadh', /riyadh|رياض/], ['jeddah', /jeddah|jedda|جده/], ['mecca', /makkah|mecca|makka|مكه/], ['madina', /madina|medina|madinah|medinah|مدينه/],
  ['eastern', /sharqia|sharqiya|eastern|dammam|khobar|شرقيه/], ['asir', /asir|abha|عسير|ابها/], ['taif', /taif|طايف|طائف/], ['qassim', /qassim|buraydah|قصيم/]];
const cityOfText = s => { const n = normName(s); for (const [k, rx] of CITY_RX) if (rx.test(n)) return k; return ''; };

function ptData(ds, from, to) {
  const kp = ds.kpi || {}, P = (settings.partners || []).filter(p => p.name && p.name.trim());
  const inRange = (d, p) => d >= from && d <= to && (!p.start || d >= p.start) && (!p.end || d <= p.end);
  const res = P.map(p => ({ p, srcs: new Set(p.sources || []), valid: 0, dup: 0, proh: 0, out: 0, recv: 0, kg: 0, ads: {}, nonPaid: (p.costs || []).reduce((a, c) => a + (Number(c.cost) || 0), 0) }));
  for (const r of res) {
    for (const [d, id, n] of kp.leads || []) if (r.srcs.has(id) && inRange(d, r.p)) r.valid += n;
    for (const [d, id, rs, n] of kp.lost || []) if (r.srcs.has(id) && inRange(d, r.p)) { if (rs === 36) r.dup += n; else if (rs === 37) r.proh += n; else if (rs === 40) r.out += n; }
    for (const [d, id, n, kg] of kp.recv || []) if (r.srcs.has(id) && inRange(d, r.p)) { r.recv += n; r.kg += kg; }
  }
  const adet = (ds.ads && ds.ads.adet) || {}, terms = res.map(r => [r.p.name, ...(r.p.aliases || [])].filter(Boolean)), memo = new Map();
  const m1 = (nm, i) => { const k = i + '\u0001' + nm; if (!memo.has(k)) { let q = null; for (const tm of terms[i]) { const m = matchTerm(nm, tm); if (m === 'exact') { q = 'exact'; break; } if (m) q = 'fuzzy'; } memo.set(k, q); } return memo.get(k); };
  for (const plat of AD_PLATS) for (const [d, c, as, ad, sp, ld] of adet[plat] || []) {
    if (d < from || d > to) continue;
    let best = null;
    res.forEach((r, i) => {
      if (!inRange(d, r.p)) return;
      for (const [lvl, nm] of [['ad', ad], ['adset', as], ['campaign', c]]) { if (!nm) continue; const q = m1(nm, i); if (q) { if (!best || (q === 'exact' && best.q !== 'exact')) best = { i, q, lvl, nm }; break; } }
    });
    if (!best) continue;
    const r = res[best.i], key = plat + '|' + c + '|' + as + '|' + ad;
    const a = r.ads[key] || (r.ads[key] = { plat, c, as, ad, city: cityOfText(c + ' ' + as + ' ' + ad), spend: 0, leads: 0, q: best.q, lvl: best.lvl, nm: best.nm });
    a.spend += sp; a.leads += ld; if (best.q === 'fuzzy') a.q = 'fuzzy';
  }
  const B = settings.partnerBench || {}, n = res.length, PT = settings.partnerTargets || {};
  for (const r of res) {
    r.adList = Object.values(r.ads).filter(a => a.spend > 0 || a.leads > 0).sort((a, b) => b.spend - a.spend);
    r.paid = 0; r.uplift = 0;
    for (const a of r.adList) {
      r.paid += a.spend;
      const bp = B[a.plat] || {}; a.bench = (a.city && bp[a.city]) || bp.all || null;
      a.expected = a.bench ? a.spend / 1000 * a.bench : null;
      if (a.expected == null) { a.counted = 0; a.state = 'nobench'; }
      else if (a.leads >= a.expected) { a.counted = a.leads - a.expected; a.state = 'above'; }
      else { a.counted = a.leads; a.state = 'below'; }
      r.uplift += a.counted;
    }
    r.uplift = Math.round(r.uplift); r.gross = r.valid + r.dup + r.proh + r.out;
    r.total = r.valid + r.uplift; r.spend = r.paid + r.nonPaid;
    r.tLeads = r.p.leads != null ? r.p.leads : (PT.leads && n ? PT.leads / n : null);
    r.tKg = r.p.kg != null ? r.p.kg : (PT.kg && n ? PT.kg / n : null);
  }
  return res;
}
function ptPace(to) { const m = to.slice(0, 7); return Math.min(1, +to.slice(8) / dim(m)); }
function ptStatus(v, should) {
  if (should == null || !(should > 0)) return ['', t('ptNoTarget'), 'idle'];
  const r = v / should; return [r, r >= 1.1 ? t('ptAhead') : r >= 0.95 ? t('ptOnTrack') : t('ptBehind'), r >= 0.95 ? 'good' : r >= 0.8 ? 'warn' : 'bad'];
}
function cpkAction(cpk) {
  const C = settings.partnerCpk || {}, tg = (C.s || [])[(C.pick || 2) - 1], band = C.band == null ? 0.03 : C.band;
  if (cpk == null || !tg) return null;
  return cpk < tg * (1 - band) ? ['good', t('ptRaise')] : cpk > tg * (1 + band) ? ['bad', t('ptStop')] : ['warn', t('ptKeep')];
}
function pipelineBoard() {
  const P = settings.pipeline || {};
  const col = st => { const L = (P[st] || []).filter(c => c && String(c.name || '').trim());
    return `<div class="panel pl-col pl-${st}"><div class="pl-h"><b>${esc(t('pl_' + st))}</b><span class="pl-n">${num(fN(L.length))}</span></div>
      ${L.length ? `<ul>${L.map(c => `<li><span dir="auto">${esc(c.name)}</span>${c.note ? `<small class="muted" dir="auto">${esc(c.note)}</small>` : ''}</li>`).join('')}</ul>` : `<p class="muted sm">${esc(t('plEmpty'))}</p>`}</div>`; };
  return `<div class="sec-h"><h2>${esc(t('plTitle'))}</h2><p>${esc(t('plSub'))} <a href="#set" data-goset>${esc(t('plEdit'))}</a></p></div><div class="pl-board">${PL_STAGES.map(col).join('')}</div>`;
}
function partnersTab(ds, from, to) {
  const R = ptData(ds, from, to), PT = settings.partnerTargets || {}, f = ptPace(to), CL = CITY_LBL[lang];
  const head = `<div class="sec-h"><h2>${esc(t('ptTitle'))}</h2><p>${esc(fDate(from))} – ${esc(fDate(to))} · ${esc(t('ptSub'))}</p></div>`;
  if (!R.length) return `${head}${pipelineBoard()}<div class="panel"><p class="muted">${esc(t('ptNone'))}</p><a href="#set" class="chip" data-goset>${esc(t('ptGo'))}</a></div>`;
  const tot = k => R.reduce((a, r) => a + (r[k] || 0), 0);
  const total = tot('total'), direct = tot('valid'), uplift = tot('uplift'), kg = tot('kg'), paid = tot('paid'), other = tot('nonPaid'), spend = paid + other;
  const target = PT.leads || R.reduce((a, r) => a + (r.tLeads || 0), 0) || null, kgT = PT.kg || R.reduce((a, r) => a + (r.tKg || 0), 0) || null;
  const should = target ? target * f : null, [pr, pl, pc] = ptStatus(total, should);
  const bar = (v, tg, sh, cls) => tg ? `<div class="bar sp-bar"><i class="${cls === 'bad' ? 'bad' : cls === 'warn' ? 'warn' : ''}" style="width:${Math.min(100, v / tg * 100)}%"></i><b class="mark" style="inset-inline-start:${Math.min(100, sh / tg * 100)}%"></b></div>` : '';
  const hero = `<div class="pt-hero"><div class="panel sp-card"><div class="sp-top"><div class="sp-big">${num(fN(total))}<small>${esc(t('ptOfLeads'))} ${num(fN(target))} ${esc(t('ptLeadsU'))}</small></div>${pr !== '' ? `<span class="dchip ${pc}">${esc(pl)} · ${num(fP(pr))}</span>` : ''}</div>
    ${bar(total, target, should, pc)}<div class="sp-row"><span>${esc(t('ptTargetL'))} ${num(fN(target))}</span><span>${esc(t('ptShould'))} ${num(fN(should))}</span><span>${esc(t('ptLeft'))} ${num(fN(target ? target - total : null))}</span></div></div>
    <div class="pt-tiles"><div class="panel pt-tile dk"><div class="k">① ${esc(t('ptDirect'))}</div><div class="v">${num(fN(direct))}</div><div class="s">${esc(t('ptDirectSub'))}</div></div>
    <div class="panel pt-tile"><div class="k">② ${esc(t('ptUplift'))}</div><div class="v">${num(fN(uplift))}</div><div class="s">${esc(t('ptUpliftSub'))}</div></div>
    <div class="panel pt-tile"><div class="k">${esc(t('ptKgT'))}</div><div class="v">${num(fN(kg))} <small>kg</small></div><div class="s">${kgT ? esc(t('ptTargetL')) + ' ' + num(fN(kgT)) + ' kg · ' + esc(t('ptShould')) + ' ' + num(fN(kgT * f)) : ''}</div></div>
    <div class="panel pt-tile"><div class="k">${esc(t('ptSpendT'))}</div><div class="v">${num(fUSD(spend))}</div><div class="s">${esc(t('ptSpendSub')(fUSD(paid), fUSD(other)))} · ${esc(t('ptCpk'))} ${num(fUSD(div(spend, kg), 3))}</div></div></div></div>
    <p class="muted sm pt-eq">${esc(t('ptEq'))}</p>`;
  const card = r => {
    const p = r.p, sh = r.tLeads ? r.tLeads * f : null, [rr, rl, rc] = (p.start && p.start > to) ? ['', t('ptNotStarted'), 'idle'] : ptStatus(r.total, sh), mx = Math.max(1, r.gross);
    const col = (v, cls, lab) => `<div><span class="num ${cls}">${v}</span><i class="${cls}" style="height:${Math.max(3, Math.abs(+String(v).replace(/[^\d]/g, '')) / mx * 100)}%"></i><em>${esc(lab)}</em></div>`;
    const ca = cpkAction(div(r.paid, r.kg));
    return `<div class="panel pt-card"><div class="pt-ch"><div><h3 dir="auto">${esc(p.name)}</h3><div class="muted sm">${esc((p.cities || []).join(' · ') || '')}${p.start ? ' · ' + esc(fDate(p.start)) : ''}${p.end ? ' – ' + esc(fDate(p.end)) : ''} · ${esc((p.sources || []).map(id => srcName(ds, id)).join(', ') || '–')}</div></div><span class="dchip ${rc}">${esc(rl)}${rr !== '' ? ' · ' + num(fP(rr)) : ''}</span></div>
      <div class="pt-wf">${col(fN(r.gross), 'g', t('wfGross'))}${col('−' + fN(r.dup), 'r', t('wfDup'))}${col('−' + fN(r.proh), 'r', t('wfProh'))}${col('−' + fN(r.out), 'r', t('wfOut'))}${col(fN(r.valid), 't', t('wfValid'))}</div>
      <dl class="pt-kv"><dt>${esc(t('ptDirect'))}</dt><dd>${num(fN(r.valid))}</dd><dt>${esc(t('ptAdsN')(r.adList.length))}</dt><dd>${num(fN(r.uplift))}</dd><dt class="b">${esc(t('ptTotal'))}</dt><dd class="b">${num(fN(r.total))}</dd></dl>
      ${r.tLeads ? `<div class="pt-mini"><i class="${rc}" style="width:${Math.min(100, r.total / r.tLeads * 100)}%"></i><b style="inset-inline-start:${Math.min(100, f * 100)}%"></b></div><div class="muted sm">${num(fN(r.total))} / ${num(fN(r.tLeads))} · ${esc(t('ptShould'))} ${num(fN(sh))}</div>` : ''}
      <dl class="pt-kv"><dt>${esc(t('ptPick'))}</dt><dd>${num(fN(r.recv))}</dd><dt>${esc(t('ptKg'))}</dt><dd>${num(fN(r.kg))} kg${r.tKg ? ` <small class="muted">/ ${num(fN(r.tKg))}</small>` : ''}</dd></dl>
      <dl class="pt-kv"><dt>${esc(t('ptPaid'))}</dt><dd>${num(fUSD(r.paid))}</dd><dt>${esc(t('ptOther'))}</dt><dd>${num(fUSD(r.nonPaid))}</dd><dt class="b">${esc(t('ptSpend'))}</dt><dd class="b">${num(fUSD(r.spend))}</dd>
      <dt>${esc(t('ptCpl'))}</dt><dd>${num(fUSD(div(r.spend, r.total), 2))}</dd><dt>${esc(t('ptCpk'))}</dt><dd>${num(fUSD(div(r.spend, r.kg), 3))}</dd></dl>
      ${ca ? `<div class="pt-act"><span class="dchip ${ca[0]}">${esc(ca[1])}</span> <span class="muted sm">${esc(t('ptCpk'))} (${esc(t('ptPaid'))}) ${num(fUSD(div(r.paid, r.kg), 3))}</span></div>` : ''}</div>`;
  };
  const cards = `<div class="sec-h"><h2>${esc(t('ptCards'))}</h2><p>${esc(t('ptCardsSub'))}</p></div><div class="pt-cards">${R.map(card).join('')}</div>`;
  const ads = R.flatMap(r => r.adList.map(a => ({ ...a, pn: r.p.name })));
  const C = t('ptAdCols');
  const adTable = `<div class="sec-h"><h2>${esc(t('ptAds'))}</h2><p>${esc(t('ptAdsSub'))}</p></div><div class="panel">${ads.length ? `<div class="tbl-wrap"><table class="lst pt-ads"><thead><tr>${C.map((c, i) => `<th${i >= 3 && i <= 7 ? ' class="n"' : ''}>${esc(c)}</th>`).join('')}</tr></thead><tbody>
    ${ads.map(a => `<tr><td dir="auto">${esc(a.pn)}</td><td dir="auto" class="pt-an">${esc([a.c, a.as, a.ad].filter(Boolean).join(' › '))}<small class="muted">${esc(t('ptMatchedOn')[a.lvl])}: ${esc(a.nm)}</small>${a.q === 'fuzzy' ? `<small class="pt-fz">${esc(t('ptFuzzy'))}</small>` : ''}</td>
      <td>${esc(t(a.plat))}${a.city ? ' · ' + esc(CL[a.city]) : ''}</td><td class="n">${num(fUSD(a.spend))}</td><td class="n">${num(fN(a.bench))}</td><td class="n">${num(fN(a.expected))}</td><td class="n">${num(fN(a.leads))}</td><td class="n"><b>${num(fN(a.counted))}</b></td>
      <td><span class="dchip ${a.state === 'above' ? 'good' : a.state === 'below' ? 'bad' : ''}">${esc(a.state === 'above' ? t('ptAbove') : a.state === 'below' ? t('ptBelow') : t('ptNoBench'))}</span></td></tr>`).join('')}
    <tr class="tot"><td>${esc(t('total') || 'Total')}</td><td></td><td></td><td class="n">${num(fUSD(paid))}</td><td></td><td class="n">${num(fN(ads.reduce((s, a) => s + (a.expected || 0), 0)))}</td><td class="n">${num(fN(ads.reduce((s, a) => s + a.leads, 0)))}</td><td class="n"><b>${num(fN(uplift))}</b></td><td></td></tr></tbody></table></div>`
    : `<p class="muted">${esc(t('ptNoAds'))}</p>`}</div>`;
  const B = settings.partnerBench || {}, Cp = settings.partnerCpk || {};
  const vals = PB_PLATS.flatMap(p => PB_CITIES.map(c => (B[p] || {})[c]).filter(v => v != null)), lo = Math.min(...vals), hi = Math.max(...vals);
  const shade = v => { const x = hi > lo ? (v - lo) / (hi - lo) : 1; return `background:rgba(12,163,157,${(0.12 + x * 0.88).toFixed(2)});color:${x > 0.45 ? '#fff' : 'var(--ink)'}`; };
  const bench = `<div class="sec-h"><h2>${esc(t('ptBench'))}</h2><p>${esc(t('ptBenchSub'))}</p></div><div class="pt-g2"><div class="panel"><div class="tbl-wrap"><table class="pt-bm"><tr><th></th>${PB_PLATS.map(p => `<th>${esc(t(p))}</th>`).join('')}</tr>
    ${PB_CITIES.map(c => `<tr><th scope="row">${esc(CL[c])}</th>${PB_PLATS.map(p => { const v = (B[p] || {})[c]; return v != null ? `<td style="${shade(v)}">${num(fN(v))}</td>` : `<td class="fb">${num(fN((B[p] || {}).all))}*</td>`; }).join('')}</tr>`).join('')}
    <tr class="all"><th scope="row">${esc(t('ptAll'))}</th>${PB_PLATS.map(p => `<td>${num(fN((B[p] || {}).all))}</td>`).join('')}</tr></table></div><p class="muted sm">* ${esc(t('ptBenchNote'))}</p></div>
    <div class="panel"><h3 class="ch">${esc(t('ptCpkT'))}</h3><table class="lst"><tr><th>${esc(t('ptScen'))}</th><th class="n">${esc(t('ptCpkT'))}</th><th class="n">±${num(fN((Cp.band == null ? 0.03 : Cp.band) * 100, 0))}% ${esc(t('ptBand'))}</th></tr>
    ${(Cp.s || []).map((v, i) => { const b = Cp.band == null ? 0.03 : Cp.band; return `<tr${(Cp.pick || 2) === i + 1 ? ' class="sel"' : ''}><td>${num(i + 1)}${(Cp.pick || 2) === i + 1 ? ' · ' + esc(t('ptSel')) : ''}</td><td class="n">${num(fUSD(v, 3))}</td><td class="n">${v ? num(fUSD(v * (1 - b), 3) + ' – ' + fUSD(v * (1 + b), 3)) : ''}</td></tr>`; }).join('')}</table>
    <p class="muted sm">${esc(t('ptCpkRule'))}</p></div></div>`;
  const ck = v => v ? '<span class="pt-y">✓</span>' : '<span class="pt-x">✗</span>';
  const ready = `<div class="sec-h"><h2>${esc(t('ptReady'))}</h2><p>${esc(t('ptReadySub'))}</p></div><div class="panel"><div class="tbl-wrap"><table class="lst"><thead><tr><th></th><th></th>${R.map(r => `<th dir="auto">${esc(r.p.name)}</th>`).join('')}</tr></thead><tbody>
    ${[['rdSrc', 'rdAuto', r => (r.p.sources || []).length > 0], ['rdAds', 'rdAuto', r => r.adList.length > 0], ['rdPage', 'rdManual', r => r.p.checks && r.p.checks.page], ['rdPch', 'rdManual', r => r.p.checks && r.p.checks.partnerCh], ['rdAch', 'rdManual', r => r.p.checks && r.p.checks.awonCh]]
      .map(([k, h, fn]) => `<tr><td>${esc(t(k))}</td><td class="muted sm">${esc(t(h))}</td>${R.map(r => `<td>${ck(fn(r))}</td>`).join('')}</tr>`).join('')}</tbody></table></div></div>`;
  const notes = `<ul class="notes">${t('ptNotes').map(x => `<li>${esc(x)}</li>`).join('')}</ul>`;
  return `${head}${hero}${pipelineBoard()}${cards}${adTable}${bench}${ready}${notes}`;
}
function pipelineSettingsHTML() {
  const P = settings.pipeline;
  return `<section class="panel se-card"><h3 class="ch">${esc(t('plSet'))}</h3><p class="muted sm">${esc(t('plSetSub'))}</p>
    ${PL_STAGES.map(st => `<div class="se-sub"><b>${esc(t('pl_' + st))} · ${esc(t('plCount')((P[st] || []).length))}</b>
      ${(P[st] || []).map((c, i) => `<div class="se-grid">${fld(t('plCompany'), inp(`pipeline.${st}.${i}.name`, c.name))}${fld(t('plNote'), inp(`pipeline.${st}.${i}.note`, c.note))}
        ${fld(t('plStage'), `<select data-plmove="${st}.${i}">${PL_STAGES.map(x => `<option value="${x}" ${x === st ? 'selected' : ''}>${esc(t('pl_' + x))}</option>`).join('')}</select>`)}<button class="chip" data-pldel="${st}.${i}">${esc(t('remove'))}</button></div>`).join('')}
      <button class="chip" data-pladd="${st}">+ ${esc(t('plAdd'))}</button></div>`).join('')}</section>`;
}
function partnerSettingsHTML(ds) {
  const B = settings.partnerBench, Cp = settings.partnerCpk, CL = CITY_LBL[lang];
  const cityOpts = Object.values(CITY_LBL.en).concat(Object.values(CITY_LBL.ar)).map(c => `<option value="${esc(c)}">`).join('');
  const chk = (path, v, lab) => `<label class="se-ck"><input type="checkbox" data-path="${path}" ${v ? 'checked' : ''}> ${esc(lab)}</label>`;
  return `<datalist id="dl-city">${cityOpts}</datalist>
  <section class="panel se-card"><h3 class="ch">${esc(t('sePt'))}</h3><div class="se-grid">
    ${fld(t('tgtActive'), inp('partnerTargets.active', settings.partnerTargets.active))}${fld(t('tgtLeads'), inp('partnerTargets.leads', settings.partnerTargets.leads, 'number'))}${fld(t('tgtKg'), inp('partnerTargets.kg', settings.partnerTargets.kg, 'number'))}</div>
    ${(settings.partners || []).map((p, i) => `<div class="se-item"><div class="se-grid">${fld(t('name'), inp(`partners.${i}.name`, p.name))}${fld(t('start'), inp(`partners.${i}.start`, p.start, 'date'))}${fld(t('seEnd'), inp(`partners.${i}.end`, p.end, 'date'))}
      ${fld(t('tgtLeads'), inp(`partners.${i}.leads`, p.leads, 'number'))}${fld(t('tgtKg'), inp(`partners.${i}.kg`, p.kg, 'number'))}</div>
      ${fld(t('sources'), chipsField(`partners.${i}.sources`, p.sources || [], t('srcHint'), 'dl-src'))}
      ${fld(t('seCities'), chipsField(`partners.${i}.cities`, p.cities || [], t('seCityHint'), 'dl-city'))}
      ${fld(t('seAliases'), chipsField(`partners.${i}.aliases`, p.aliases || [], t('seAliasHint'), 'dl-none'))}
      <div class="se-sub"><b>${esc(t('seCosts'))}</b>${(p.costs || []).map((c, j) => `<div class="se-grid">${fld(t('seCostName'), inp(`partners.${i}.costs.${j}.name`, c.name))}${fld(t('seCostAmt'), inp(`partners.${i}.costs.${j}.cost`, c.cost, 'number', 'min="0" step="1" inputmode="decimal"'))}<button class="chip" data-delcost="${i}.${j}">${esc(t('remove'))}</button></div>`).join('')}
        <button class="chip" data-newcost="${i}">+ ${esc(t('seCostAdd'))}</button></div>
      <div class="se-sub"><b>${esc(t('seChecks'))}</b><div class="se-cks">${chk(`partners.${i}.checks.page`, p.checks && p.checks.page, t('ckPage'))}${chk(`partners.${i}.checks.partnerCh`, p.checks && p.checks.partnerCh, t('ckPch'))}${chk(`partners.${i}.checks.awonCh`, p.checks && p.checks.awonCh, t('ckAch'))}</div></div>
      <button class="chip" data-del="partners.${i}">${esc(t('remove'))}</button></div>`).join('')}
    <button class="chip" data-new="partners">+ ${esc(t('add'))}</button>
    <div class="se-sub"><b>${esc(t('sePtBench'))}</b><div class="tbl-wrap"><table class="se-bm"><tr><th></th>${PB_PLATS.map(p => `<th>${esc(t(p))}</th>`).join('')}</tr>
      ${['all', ...PB_CITIES].map(c => `<tr><th scope="row">${esc(c === 'all' ? t('ptAll') : CL[c])}</th>${PB_PLATS.map(p => `<td>${inp(`partnerBench.${p}.${c}`, (B[p] || {})[c], 'number', 'step="any" min="0"')}</td>`).join('')}</tr>`).join('')}</table></div></div>
    <div class="se-sub"><b>${esc(t('sePtCpk'))}</b><div class="se-grid">${[0, 1, 2].map(k => fld(t('seScen')(k + 1), inp(`partnerCpk.s.${k}`, Cp.s[k], 'number', 'step="any" min="0"'))).join('')}
      ${fld(t('sePick'), `<select data-path="partnerCpk.pick">${[1, 2, 3].map(k => `<option value="${k}" ${Cp.pick === k ? 'selected' : ''}>${k}</option>`).join('')}</select>`)}${fld(t('seBand'), inp('partnerCpk.band', Cp.band, 'number', 'step="any" min="0"'))}</div></div></section>`;
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

  ${pipelineSettingsHTML()}

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

  ${partnerSettingsHTML(ds)}

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
    let v = el.value; if (el.type === 'number') v = v === '' ? null : Number(v); if (el.type === 'checkbox') v = el.checked; if (/\.pick$/.test(el.dataset.path)) v = Number(v);
    if (/\.status$|\.owner$|\.metric$|\.dir$/.test(el.dataset.path) || el.type === 'text' || el.type === 'date') { /* keep as string */ }
    setPath(settings, el.dataset.path, v); mark();
    if (/\.metric$/.test(el.dataset.path)) renderSettings();
  });
  root.addEventListener('change', e => {
    const el = e.target;
    if (el.dataset && el.dataset.month != null) { settings._month = el.value; renderSettings(); }
    if (el.dataset && el.dataset.add != null) addChip(el);
    if (el.dataset && el.dataset.plmove) { const [st, i] = el.dataset.plmove.split('.'), to = el.value; if (to !== st && settings.pipeline[to]) { const [c] = settings.pipeline[st].splice(+i, 1); settings.pipeline[to].push(c); mark(); renderSettings(); } }
  });
  root.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.dataset && e.target.dataset.add != null) { e.preventDefault(); addChip(e.target); } });
  root.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.rm != null) { const box = b.closest('.chips'), arr = getPath(settings, box.dataset.path) || [], v = b.dataset.rm; setPath(settings, box.dataset.path, arr.filter(x => String(x) !== v)); mark(); renderSettings(); }
    else if (b.dataset.del) { const [k, i] = b.dataset.del.split('.'); settings[k].splice(+i, 1); mark(); renderSettings(); }
    else if (b.dataset.new) { settings[b.dataset.new].push(b.dataset.new === 'partners' ? { name: '', sources: [], start: '', end: '', leads: null, kg: null, cities: [], aliases: [], costs: [], checks: {} } : { name: '', status: 'planned', start: '', end: '', sources: [], leads: null }); mark(); renderSettings(); }
    else if (b.dataset.pladd) { settings.pipeline[b.dataset.pladd].push({ name: '', note: '' }); mark(); renderSettings(); const L = root.querySelectorAll(`[data-path^="pipeline.${b.dataset.pladd}."][data-path$=".name"]`); if (L.length) L[L.length - 1].focus(); }
    else if (b.dataset.pldel) { const [st, i] = b.dataset.pldel.split('.'); settings.pipeline[st].splice(+i, 1); mark(); renderSettings(); }
    else if (b.dataset.newsvc) { const m = b.dataset.newsvc; settings.months[m] = settings.months[m] || {}; settings.months[m].services = settings.months[m].services || { budget: null, items: [] }; settings.months[m].services.items = settings.months[m].services.items || []; settings.months[m].services.items.push({ name: '', cost: null }); mark(); renderSettings(); }
    else if (b.dataset.newcost != null) { const p = settings.partners[+b.dataset.newcost]; p.costs = p.costs || []; p.costs.push({ name: '', cost: null }); mark(); renderSettings(); }
    else if (b.dataset.delcost) { const [i, j] = b.dataset.delcost.split('.'); settings.partners[+i].costs.splice(+j, 1); mark(); renderSettings(); }
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
  const sb = (s && s.partnerBench) || {};
  settings.partnerBench = Object.fromEntries(Object.keys(d.partnerBench).map(p => { const v = sb[p]; return [p, v && Object.keys(v).length ? { ...v } : { ...d.partnerBench[p] }]; }));
  settings.partnerCpk = Object.assign({}, d.partnerCpk, (s && s.partnerCpk) || {});
  if (!Array.isArray(settings.partnerCpk.s) || settings.partnerCpk.s.every(v => v == null)) settings.partnerCpk.s = d.partnerCpk.s.slice();
  if (settings.partnerCpk.band == null) settings.partnerCpk.band = d.partnerCpk.band;
  settings.partners = (settings.partners || []).map(p => ({ cities: [], aliases: [], costs: [], checks: {}, end: '', ...p }));
  if (!settings.team || !settings.team.length) settings.team = d.team;
  const pl = (s && s.pipeline) || {}; settings.pipeline = Object.fromEntries(PL_STAGES.map(st => [st, Array.isArray(pl[st]) ? pl[st].map(c => ({ name: '', note: '', ...c })) : []]));
  saved = JSON.stringify(settings);
}
function box(id, html) { const el = $('#' + id); if (el) el.innerHTML = html; }
function renderAll() {
  if (!ctx || !settings) return;
  lang = ctx.lang; const { ds, from, to } = ctx;
  const hasKpi = ds && ds.kpi && ds.kpi.mode !== 'error' && ds.kpi.leads;
  const guard = fn => { try { return fn(); } catch (e) { console.error(e); return `<div class="err">${esc(e.message)}</div>`; } };
  const tab = $('#tab-set'); if (tab) tab.textContent = t('tabSet');
  if (!hasKpi) { for (const id of ['kpiSpend', 'kpiPartners', 'kpiInit', 'kpiTeam', 'kpiPt']) box(id, ctx.ds ? `<div class="err warnbar">${esc(t('noKpi'))}</div>` : ''); }
  else {
    if (!ctx.view || ctx.view === 'perf') {
      box('kpiSpend', guard(() => `<div class="kpi-sub"><div class="sec-h sub"><h3>${esc(t('spTitle'))}</h3><p>${esc(t('spSub'))}</p></div>${budgetCard(ds, to)}<div class="sec-h sub"><h3>${esc(t('mxTitle'))}</h3><p>${esc(t('mxSub'))}</p></div>${matrix(ds, from, to)}</div>`));
      box('kpiPartners', '');   // partnerships moved to their own tab
      box('kpiInit', guard(() => `<section class="kpi-sec">${initSection(ds, from, to)}</section>`));
    }
    if (ctx.view === 'pt') box('kpiPt', guard(() => `<section class="kpi-sec pt">${partnersTab(ds, from, to)}</section>`));
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
