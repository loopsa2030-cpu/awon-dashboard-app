/* Awon live dashboard: front end (vanilla JS, EN/AR). */
(() => {
'use strict';
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];

// ---------------- i18n ----------------
const T = {
  en: {
    hlWeight: 'Total weight collected', hlSpend: 'Total spend', hlCpk: 'Cost per kg', toDate: 'Target to date', monthTgt: m => `${m} target`, periodTgt: (a, b) => `Full target ${a} to ${b}`,
    hlPace: p => `${p} of target`,
    leadsT: 'Leads target', pickupsT: 'Pickups target', rateT: 'Pickup rate target', kgpT: 'kg per pickup target',
    ratesNote: 'Pickup rate = pickups ÷ leads on the same day. Fridays (no pickups) are left blank.',
    tvSpend: 'Spend and CPK', tvVolume: 'Leads and pickups', tvRates: 'Pickup rate and kg per pickup', tvCpl: 'Cost per lead',
    cplAll: 'CPL overall', cplT: 'CPL target', cplNote: 'Daily cost per lead: spend ÷ leads that day. Paid excludes branding campaigns (moved to Organic). Dashed line = overall target incl. overhead.',
    spendNote: 'Daily spend against the prorated spend target (incl. overhead); CPK is a 7-day rolling average.',
    volNote: 'Dashed lines are the daily targets; the pickup target is spread over operating days only (no Fridays).',
    title: 'Performance dashboard', subtitle: 'Marketing, logistics and donors across Saudi Arabia',
    refresh: 'Refresh', tabPerf: 'Performance', tabMkt: 'Marketing', tabMap: 'Donor map',
    all: 'All time', yesterday: 'Yesterday', last7: 'Last 7 days', thisMonth: 'This month', custom: 'Pick dates…',
    cmpLbl: 'Compare to', cmpPrev: 'Previous period', cmpMonth: 'Same days last month', cmpOff: 'No comparison', cmpCustom: 'Custom dates…', cmpEdit: 'Change dates', cmpLen: (a, b) => `${a} days vs ${b} days, totals not adjusted`, vs: r => `vs ${r}`, cmpNone: 'no earlier data to compare',
    northStar: 'North star: cost per kg collected', perKg: 'per kg',
    marketing: 'Marketing', logistics: 'Logistics', vsTarget: 'Actual against the forecast, prorated to the last reported day',
    logiNote: 'Fridays are non-operating days in the target', platforms: 'Source groups',
    platNote: 'Group totals from the Daily tab; platform spend from Supermetrics; platform leads, pickups and kg from Odoo sources',
    cities: 'Cities', trend: 'Daily trend', orders: 'Orders', pickups: 'Pickups', kg: 'Weight (kg)',
    allCities: 'All cities', otherCities: 'Other cities', low: 'Low', high: 'High', topLoc: 'Top districts',
    spend: 'Spend', leads: 'Leads', cpl: 'Cost per lead', cac: 'Cost per pickup', weight: 'Weight collected',
    pickupRate: 'Pickup rate', kgPerPickup: 'kg per pickup', cpk: 'Cost per kg',
    target: 'target', of: 'of', ahead: 'better than target', behind: 'worse than target', onTrack: 'on target',
    paid: 'Paid ads', organic: 'Organic & branding', wa: 'WhatsApp & CRM',
    cpkLine: (a, t, p) => `Target to date is <b>${t}</b>. That is ${p}.`,
    over: p => `${p} over target`, under: p => `${p} under target`,
    groupMeta: (s, kg) => `${s} spent · ${kg} kg`, cpkLbl: 'CPK', kgAch: 'kg achieved vs target', cpkTgtLbl: 'target CPK',
    donationsRec: 'Donations received', kgPerDonation: 'kg/donation',
    locNote: (n, p) => `Locations come from real order coordinates in the customer data (${n} districts located). ${p} of donations are placed at their district; the rest sit near their city centre (dashed amber).`,
    locLoading: 'District locations are loading from the customer data; pins sit near city centres until then.',
    unmatchedNote: l => `Districts without a location yet: ${l}.`,
    sourceGroup: 'Source group', waMsgs: 'WhatsApp conversations', platConvShort: 'platform leads', brandingCamp: 'branding campaigns',
    metaNote: 'CRM leads = Odoo source "whatsapp paid" (live from 22 Sep; earlier Meta WhatsApp leads sit under WhatsApp)',
    brandingTxt: a => `${a} of ad spend on non lead-gen campaigns is reported as branding under Organic.`,
    brandingNote: 'Paid spend counts lead-gen campaigns only (website leads and WhatsApp). Awareness, traffic and video campaigns are reported as branding under Organic.',
    waPaidNote: 'Meta leads use the Odoo source "whatsapp paid" from 22 Sep 2026; Meta WhatsApp leads before that date are counted under WhatsApp.',
    favNote: f => `Source groups follow the Odoo favourites: ${f}.`,
    unassignedNote: f => `Sources not in any favourite (grouped by name rules until added in Odoo): ${f}.`,
    donorNote: n => `New donor = first-ever received donation (Odoo Won + Received, plus ${n} phones from the old customer data), matched by phone. Returning = donated before the period. Counts are unique people. rCAC uses WhatsApp spend from the Daily tab.`,
    newDonors: 'New donors', retDonors: 'Returning donors', newPk: 'New donors: pickups', newKg: 'New donors: weight', retPk: 'Returning donors: pickups', retKg: 'Returning donors: weight', shareOfPickups: p => `${p} of pickups`, shareOfKg: p => `${p} of weight`, pkNote: 'Pickups and kg from Odoo orders (Won + Received), split by whether the donor had donated before the period.', shareOfDonors: p => `${p} of donors`,
    ncacNote: 'Paid + Organic spend per new donor', rcacNote: 'WhatsApp messages spend per returning donor',
    charts: 'Trends and cohorts', cGroupCpk: 'Cost per kg by source group (7-day rolling)', cCumKg: 'Cumulative kg vs target', cCityKg: 'kg by city vs target',
    cDonors: 'New vs returning donors by month', cCohort: 'Repeat donation by first-donation month (share of each cohort donating again)', kgActual: 'Actual kg', kgTarget: 'Target kg',
    cohortMonth: 'First donation', cohortSize: 'Donors',
    platform: 'Platform', crmLeads: 'CRM leads', platConv: 'Platform-reported', city: 'City',
    reconTxt: (a, b) => `Ad platforms report ${a} spend for this period; the Daily tab records ${b} as paid spend.`,
    lowAttr: 'few CRM leads tagged to this platform',
    updated: 'Updated', refreshing: 'refreshing…', live: 'Live', snapshot: 'Partial', total: 'Total', totalAll: 'All districts', from: 'From', to: 'To',
    daysMode: 'Days', weeksMode: 'Weeks', monthsMode: 'Months', apply: 'Apply', pickStart: 'Pick a start and end day',
    nodata: 'No data for this period yet.', districts: 'Districts', totalOrders: 'Orders', totalKg: 'kg collected',
    district: 'District', approx: 'approx. location', unplaced: n => `${n} donations have no district on file and are not on the map.`,
    mapSrc: 'Odoo orders in the selected period. Donations received = Won and Received; leads = all CRM leads created; kg = recorded weight.',
    monthGran: m => `Snapshot mode only holds ${m} (top 320 districts); connect Odoo for exact dates and all districts.`,
    srcLine: (k, m, t) => `${k}: ${m}${t ? ' (' + t + ')' : ''}`,
    srcSheets: 'Google Sheets (Daily + Forecast tabs)', srcOdoo: 'Odoo CRM', srcAds: 'Supermetrics',
    overheadNote: 'Targets include marketing overhead from the forecast, matching the MTD tab. Actual spend is direct media spend from the Daily tab.',
    dates: (a, b) => a === b ? a : `${a} → ${b}`, lastRep: d => `last reported day ${d}`,
    series: { spend: 'Spend', target: 'Spend target', kg: 'kg', cpk: 'CPK (7-day rolling)' },
  },
  ar: {
    hlWeight: 'إجمالي الوزن المجمّع', hlSpend: 'إجمالي الإنفاق', hlCpk: 'تكلفة الكيلو', toDate: 'المستهدف حتى الآن', monthTgt: m => `مستهدف ${m}`, periodTgt: (a, b) => `المستهدف الكامل ${a} إلى ${b}`,
    hlPace: p => `${p} من المستهدف`,
    leadsT: 'مستهدف العملاء', pickupsT: 'مستهدف الاستلامات', rateT: 'مستهدف نسبة الاستلام', kgpT: 'مستهدف الكيلو لكل استلام',
    ratesNote: 'نسبة الاستلام = الاستلامات ÷ العملاء في اليوم نفسه. أيام الجمعة (بلا استلامات) تُترك فارغة.',
    tvSpend: 'الإنفاق وتكلفة الكيلو', tvVolume: 'العملاء والاستلامات', tvRates: 'نسبة الاستلام والكيلو لكل استلام', tvCpl: 'تكلفة العميل',
    cplAll: 'تكلفة العميل الإجمالية', cplT: 'مستهدف تكلفة العميل', cplNote: 'تكلفة العميل اليومية: الإنفاق ÷ العملاء في اليوم. المدفوع يستثني حملات العلامة (تُحتسب ضمن العضوي). الخط المتقطع = المستهدف الإجمالي شاملاً المصاريف العامة.',
    spendNote: 'الإنفاق اليومي مقابل مستهدف الإنفاق (شاملاً المصاريف العامة)؛ تكلفة الكيلو متوسط ٧ أيام.',
    volNote: 'الخطوط المتقطعة هي المستهدف اليومي؛ مستهدف الاستلامات موزع على أيام التشغيل فقط (بدون الجمعة).',
    title: 'لوحة الأداء', subtitle: 'التسويق واللوجستيات والمتبرعون في المملكة',
    refresh: 'تحديث', tabPerf: 'الأداء', tabMkt: 'التسويق', tabMap: 'خريطة المتبرعين',
    all: 'كل الفترات', yesterday: 'أمس', last7: 'آخر ٧ أيام', thisMonth: 'هذا الشهر', custom: 'اختيار التواريخ…',
    cmpLbl: 'قارن مع', cmpPrev: 'الفترة السابقة', cmpMonth: 'نفس الأيام من الشهر السابق', cmpOff: 'بدون مقارنة', cmpCustom: 'تواريخ مخصصة…', cmpEdit: 'تغيير التواريخ', cmpLen: (a, b) => `${a} يوماً مقابل ${b} يوماً، الإجماليات بدون تعديل`, vs: r => `مقارنة بـ ${r}`, cmpNone: 'لا توجد بيانات سابقة للمقارنة',
    northStar: 'المؤشر الأساسي: تكلفة الكيلوغرام المجمّع', perKg: 'لكل كغ',
    marketing: 'التسويق', logistics: 'اللوجستيات', vsTarget: 'الفعلي مقابل المستهدف حتى آخر يوم مُسجّل',
    logiNote: 'أيام الجمعة غير تشغيلية في المستهدف', platforms: 'مجموعات المصادر',
    platNote: 'إجماليات المجموعات من التبويب اليومي، وإنفاق المنصات من Supermetrics، وعملاء المنصات من مصادر Odoo',
    cities: 'المدن', trend: 'الاتجاه اليومي', orders: 'الطلبات', pickups: 'الاستلامات', kg: 'الوزن (كغ)',
    allCities: 'كل المدن', otherCities: 'مدن أخرى', low: 'منخفض', high: 'مرتفع', topLoc: 'أعلى الأحياء',
    spend: 'الإنفاق', leads: 'العملاء المحتملون', cpl: 'تكلفة العميل', cac: 'تكلفة الاستلام', weight: 'الوزن المجمّع',
    pickupRate: 'نسبة الاستلام', kgPerPickup: 'كغ لكل استلام', cpk: 'تكلفة الكيلو',
    target: 'المستهدف', of: 'من', ahead: 'أفضل من المستهدف', behind: 'أسوأ من المستهدف', onTrack: 'ضمن المستهدف',
    paid: 'الإعلانات المدفوعة', organic: 'العضوي والعلامة', wa: 'واتساب وإعادة التفعيل',
    cpkLine: (a, t, p) => `المستهدف حتى الآن <b>${t}</b>، أي ${p}.`,
    over: p => `أعلى من المستهدف بـ ${p}`, under: p => `أقل من المستهدف بـ ${p}`,
    groupMeta: (s, kg) => `إنفاق ${s} · ${kg} كغ`, cpkLbl: 'تكلفة الكيلو', kgAch: 'نسبة الإنجاز (الأوزان)', cpkTgtLbl: 'المستهدف',
    donationsRec: 'التبرعات المستلمة', kgPerDonation: 'كغ/تبرع',
    locNote: (n, p) => `المواقع مأخوذة من إحداثيات الطلبات الفعلية في بيانات العملاء (${n} حياً). ${p} من التبرعات في موقع حيّها، والباقي قرب مركز المدينة (بإطار متقطع).`,
    locLoading: 'جارٍ تحميل مواقع الأحياء من بيانات العملاء؛ الدبابيس قرب مراكز المدن حتى ذلك.',
    unmatchedNote: l => `أحياء بلا موقع بعد: ${l}.`,
    sourceGroup: 'مجموعة المصدر', waMsgs: 'محادثات واتساب', platConvShort: 'عملاء المنصة', brandingCamp: 'حملات العلامة',
    metaNote: 'عملاء CRM = مصدر "whatsapp paid" في Odoo (يعمل من ٢٢ سبتمبر؛ ما قبله ضمن واتساب)',
    brandingTxt: a => `${a} من الإنفاق الإعلاني على حملات غير موجهة لجلب العملاء يُحتسب كعلامة ضمن العضوي.`,
    brandingNote: 'الإنفاق المدفوع يشمل حملات جلب العملاء فقط (الموقع وواتساب). حملات الوعي والزيارات والفيديو تُحتسب كعلامة ضمن العضوي.',
    waPaidNote: 'عملاء Meta من مصدر "whatsapp paid" في Odoo منذ ٢٢ سبتمبر ٢٠٢٦؛ وما قبل ذلك ضمن واتساب.',
    favNote: f => `مجموعات المصادر تتبع المفضلة في Odoo: ${f}.`,
    unassignedNote: f => `مصادر غير مدرجة في أي مفضلة (تُصنف بالاسم حتى تُضاف في Odoo): ${f}.`,
    donorNote: n => `المتبرع الجديد = أول تبرع مستلم على الإطلاق (Odoo ناجح ومستلم، إضافة إلى ${n} رقماً من بيانات العملاء القديمة) مطابقةً برقم الجوال. العائد = تبرع قبل الفترة. الأعداد أشخاص فريدون. rCAC يستخدم إنفاق واتساب من التبويب اليومي.`,
    newDonors: 'متبرعون جدد', retDonors: 'متبرعون عائدون', newPk: 'المتبرعون الجدد: الاستلامات', newKg: 'المتبرعون الجدد: الوزن', retPk: 'المتبرعون العائدون: الاستلامات', retKg: 'المتبرعون العائدون: الوزن', shareOfPickups: p => `${p} من الاستلامات`, shareOfKg: p => `${p} من الوزن`, pkNote: 'الاستلامات والكيلوغرامات من طلبات أودو (مكتمل + مستلم)، مقسمة حسب ما إذا كان المتبرع قد تبرع قبل الفترة.', shareOfDonors: p => `${p} من المتبرعين`,
    ncacNote: 'إنفاق المدفوع والعضوي لكل متبرع جديد', rcacNote: 'إنفاق رسائل واتساب لكل متبرع عائد',
    charts: 'الاتجاهات والمجموعات', cGroupCpk: 'تكلفة الكيلو حسب مجموعة المصدر (متوسط ٧ أيام)', cCumKg: 'الكيلو التراكمي مقابل المستهدف', cCityKg: 'الكيلو حسب المدينة مقابل المستهدف',
    cDonors: 'المتبرعون الجدد والعائدون شهرياً', cCohort: 'تكرار التبرع حسب شهر أول تبرع', kgActual: 'الكيلو الفعلي', kgTarget: 'الكيلو المستهدف',
    cohortMonth: 'أول تبرع', cohortSize: 'المتبرعون',
    platform: 'المنصة', crmLeads: 'عملاء CRM', platConv: 'تحويلات المنصة', city: 'المدينة',
    reconTxt: (a, b) => `تُظهر المنصات إنفاق ${a} لهذه الفترة، بينما يسجل التبويب اليومي ${b} كإنفاق مدفوع.`,
    lowAttr: 'عدد قليل من العملاء مرتبط بهذه المنصة',
    updated: 'آخر تحديث', refreshing: 'جارٍ التحديث…', live: 'مباشر', snapshot: 'جزئي', total: 'الإجمالي', totalAll: 'كل الأحياء', from: 'من', to: 'إلى',
    daysMode: 'أيام', weeksMode: 'أسابيع', monthsMode: 'أشهر', apply: 'تطبيق', pickStart: 'اختر يوم البداية والنهاية',
    nodata: 'لا توجد بيانات لهذه الفترة بعد.', districts: 'الأحياء', totalOrders: 'الطلبات', totalKg: 'كغ مجمّعة',
    district: 'الحي', approx: 'موقع تقريبي', unplaced: n => `${n} تبرعاً بلا حي مسجل ولا تظهر على الخريطة.`,
    mapSrc: 'طلبات Odoo في الفترة المحددة. التبرعات المستلمة = ناجحة ومستلمة، العملاء = كل العملاء المسجلين، الكيلو = الوزن المسجل.',
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
function mtLabel() {
  const ms = (perf && perf.monthTargets && perf.monthTargets.months) || [];
  if (!ms.length) return '';
  const name = m => new Intl.DateTimeFormat(lang === 'ar' ? 'ar-SA-u-ca-gregory-nu-latn' : 'en-US', { month: 'long', timeZone: 'UTC', ...(ms.length > 1 ? { year: 'numeric' } : {}) }).format(new Date(m + '-01T00:00:00Z'));
  return ms.length === 1 ? t('monthTgt')(name(ms[0])) : t('periodTgt')(name(ms[0]), name(ms[ms.length - 1]));
}
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
// comparison: 'prev' (same length just before), 'month' (same days last month) or 'off'; remembered in this browser
let cmpMode = (() => { try { return localStorage.getItem('awon-cmp') || 'prev'; } catch (e) { return 'prev'; } })();
// custom comparison dates picked in the calendar: { from, to }
let cmpCustom = (() => { try { return JSON.parse(localStorage.getItem('awon-cmp-custom') || 'null'); } catch (e) { return null; } })();
if (cmpMode === 'custom' && !cmpCustom) cmpMode = 'prev';
const nDays = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5) + 1;
let cmpR = null, perfC = null, heatC = null, cmpLen = null;
const fmtDay = d => new Intl.DateTimeFormat(lang === 'ar' ? 'ar-SA-u-ca-gregory-nu-latn' : 'en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(d + 'T00:00:00Z')).replace('Sept', 'Sep');
const fmtRange = (a, b) => a === b ? fmtDay(a) : a.slice(0, 7) === b.slice(0, 7) ? `${+a.slice(8)}–${fmtDay(b)}` : `${fmtDay(a)} – ${fmtDay(b)}`;
const cmpShort = () => cmpR ? t('vs')(fmtRange(cmpR.from, cmpR.to)) : '';
// change vs the comparison period; kind: 'volume' (up is good), 'cost' (down is good), anything else neutral
function dchg(cur, prev, kind, minBase = 0) {
  if (!cmpR || cur == null || prev == null || !isFinite(cur) || !isFinite(prev) || !prev || Math.abs(prev) < minBase) return '';
  const r = cur / prev - 1;
  if (Math.abs(r) < 0.005) return `<span class="dl flat">${num('0%')}</span>`;
  const good = kind === 'cost' ? r < 0 : kind === 'volume' ? r > 0 : null;
  return `<span class="dl ${good == null ? 'flat' : good ? 'good' : 'bad'}">${num((r > 0 ? '▲ ' : '▼ ') + fmtN(Math.abs(r) * 100, 0) + '%')}</span>`;
}
const cmpRow = (cur, prev, kind, minBase) => cmpR ? `<div class="t cmp"><span>${esc(cmpShort())}</span>${dchg(cur, prev, kind, minBase) || `<span class="dl flat">-</span>`}</div>` : '';
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
let metric = 'donations', mcity = 'all';
async function getJSON(u) {
  const r = await fetch(u, { credentials: 'same-origin' });
  const j = await r.json().catch(() => ({ error: `HTTP ${r.status}` }));
  if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
  return j;
}
// Data flow: /api/dataset is fetched once (and every 5 min); every timeframe is then computed in the
// browser, so switching dates is instant. The map fetches per range, lazily, and caches per range.
let dataset = null, dataErr = null, updating = false;
const heatCache = new Map();
// The last dataset is kept in this browser (Cache Storage), so the dashboard opens instantly with it
// while the fresh copy loads in the background. Nothing here is required: if storage is blocked it just loads normally.
const DS_CACHE = 'awon-dataset-v1', DS_KEY = '/api/dataset';
async function readCachedDataset() {
  try { const c = await caches.open(DS_CACHE); const r = await c.match(DS_KEY); return r ? await r.json() : null; } catch (e) { return null; }
}
async function saveCachedDataset(d) {
  try { const c = await caches.open(DS_CACHE); await c.put(DS_KEY, new Response(JSON.stringify(d), { headers: { 'Content-Type': 'application/json' } })); } catch (e) { return; }   // storage blocked
}
async function fetchDataset(force) {
  updating = true;
  if (!dataset) document.body.classList.add('loading');
  renderFresh();
  try { dataset = await getJSON('/api/dataset' + (force ? '?t=' + Date.now() : '')); dataErr = null; saveCachedDataset(dataset); }
  catch (e) { dataErr = dataset ? null : e.message; }
  updating = false;
  document.body.classList.remove('loading');
}
function recompute() {
  const { from, to } = resolve(state);
  $('#perfErr').innerHTML = dataErr ? `<div class="err">${esc(dataErr)}</div>` : '';
  perf = dataset && window.AwonCalc ? AwonCalc.compute(dataset, from, to) : null;
  // the comparison covers as many days as are reported in the selected range
  const lr = perf && perf.range.lastReported;
  const cEnd = lr && lr >= from && lr < to ? lr : to;
  if (cmpMode === 'custom') cmpR = cmpCustom && cmpCustom.to >= FIRST ? { from: cmpCustom.from < FIRST ? FIRST : cmpCustom.from, to: cmpCustom.to } : null;
  else cmpR = window.AwonCalc && AwonCalc.cmpRange ? AwonCalc.cmpRange(cmpMode, from, cEnd, FIRST) : null;
  cmpLen = cmpR ? [nDays(from, cEnd), nDays(cmpR.from, cmpR.to)] : null;
  perfC = dataset && cmpR ? AwonCalc.compute(dataset, cmpR.from, cmpR.to) : null;
  if (perfC && !perfC.range.lastReported) perfC = null;
  if (perf && !perf.range.lastReported && !dataErr) $('#perfErr').innerHTML = `<div class="err" style="color:var(--muted);background:#fff;border-color:var(--line)">${esc(lang === 'ar' ? 'لا توجد بيانات مسجلة لهذه الفترة بعد: يُحدَّث الشيت يومياً.' : 'Nothing reported for this period yet: the sheet is updated daily.')}</div>`;
  syncHeat(false);
  render();
  if (!$('#view-map').hidden) ensureHeat();
}
function syncHeat(draw) {
  const { from, to } = resolve(state);
  heat = heatCache.get(from + '|' + to) || null;
  heatC = cmpR ? heatCache.get(cmpR.from + '|' + cmpR.to) || null : null;
  if (draw) renderMap();
}
function ensureHeat() {
  const r = resolve(state);
  loadHeat(r.from + '|' + r.to, r.from, r.to, true);
  if (cmpR) loadHeat(cmpR.from + '|' + cmpR.to, cmpR.from, cmpR.to, false);
}
async function loadHeat(key, from, to, main) {
  if (heatCache.has(key)) return;
  heatCache.set(key, null);
  if (main) $('#mapNotes').innerHTML = `<li>${esc(lang === 'ar' ? 'جارٍ تحميل الخريطة…' : 'Loading map…')}</li>`;
  let h;
  try { h = await getJSON(`/api/heatmap?from=${from}&to=${to}`); } catch (e) { h = { error: e.message, points: [] }; }
  heatCache.set(key, h);
  syncHeat(true);
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
  $('#cmpSel').value = cmpMode;
  $('#cmpSel option[value=custom]').textContent = cmpMode === 'custom' && cmpCustom ? `${t('cmpCustom').replace('…', '')}: ${fmtRange(cmpCustom.from, cmpCustom.to)}` : t('cmpCustom');
  $('#cmpEdit').hidden = cmpMode !== 'custom';
  const cmpTxt = cmpR ? ' · ' + num(esc(cmpShort())) + (cmpLen && cmpLen[0] !== cmpLen[1] ? ` <span class="len-warn">(${num(esc(t('cmpLen')(cmpLen[0], cmpLen[1])))})</span>` : '') : cmpMode !== 'off' ? ' · ' + esc(t('cmpNone')) : '';
  $('#rangeLabel').innerHTML = `<b>${num(esc(t('dates')(from, to)))}</b>${perf?.range?.lastReported ? ' · ' + esc(t('lastRep')(perf.range.lastReported)) : ''}${cmpTxt}`;
  renderFresh(); renderPerf(); renderMap(); renderMkt();
}

// The donor split needs the customer history sheet; without it the server marks it unavailable rather than guessing
const donorsNA = () => !!(dataset && dataset.donors && (dataset.donors.unavailable || !(dataset.donors.historyPhones > 0)));
function renderFresh() {
  const modes = perf ? [perf.sources.sheets.mode, perf.sources.odoo.mode, perf.sources.ads.mode] : [];
  const allLive = modes.length && modes.every(m => m === 'live');
  $('#fresh .dot').classList.toggle('snap', !allLive);
  const when = dataset && dataset.generatedAt ? new Date(dataset.generatedAt) : new Date();
  const sameDay = new Date().toDateString() === when.toDateString();
  const tm = new Intl.DateTimeFormat(loc(), sameDay ? { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Riyadh' } : { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Riyadh' }).format(when);
  $('#freshTxt').textContent = `${allLive ? t('live') : t('snapshot')} · ${t('updated')} ${tm}${updating ? ' · ' + t('refreshing') : ''}`;
}

function kpi(label, val, tgtVal, fmt, kind, mtv, cv) {
  const a = val, g = tgtVal;
  const st = status(a, g, kind);
  const pct = g ? Math.max(0, Math.min(100, (a / g) * 100)) : 0;
  const diff = g ? (a / g - 1) : null;
  const dtxt = diff == null ? '' : Math.round(Math.abs(diff) * 100) === 0 ? '0%' : `${diff >= 0 ? '+' : '−'}${fmtN(Math.abs(diff) * 100, 0)}%`;
  return `<div class="kpi"><div class="k">${esc(label)}</div><div class="v">${num(fmt(a))}</div>
    <div class="bar"><i class="${st}" style="width:${pct}%"></i></div>
    <div class="t"><span>${esc(t('target'))} ${num(fmt(g))}</span><span class="d ${st}">${num(dtxt)}</span></div>
    ${mtv != null ? `<div class="t mt"><span>${esc(mtLabel())} ${num(fmt(mtv))}</span></div>` : ''}${cv !== undefined ? cmpRow(a, cv, kind) : ''}</div>`;
}

function kpiPlain(label, value, note, cur, prev, kind) {
  return `<div class="kpi"><div class="k">${esc(label)}</div><div class="v">${num(value)}</div><div class="t"><span>${esc(note)}</span></div>${cur !== undefined ? cmpRow(cur, prev, kind) : ''}</div>`;
}
const pc = f => (perfC ? f(perfC) : undefined);

function renderPerf() {
  if (!perf) return;
  const T0 = perf.totals, G = perf.groups;
  // headline: total weight, spend and CPK against the prorated target
  const MT = perf.monthTargets || {};
  const hl = (label, val, tg, fmt, kind, main, unit, mtv, cv) => {
    const st = status(val, tg, kind);
    const r = tg ? val / tg : null;
    const pct = r == null ? 0 : Math.max(0, Math.min(100, r * 100));
    const d = r == null ? '' : Math.round(Math.abs(r - 1) * 100) === 0 ? '0%' : `${r - 1 >= 0 ? '+' : '−'}${fmtN(Math.abs(r - 1) * 100, 0)}%`;
    const art = { main: '<div class="art" aria-hidden="true"><img src="brand/hands.svg" alt=""></div>', teal: '<div class="art mark" aria-hidden="true"></div>', soft: '<div class="art lattice" aria-hidden="true"></div>' }[main] || '';
    return `<div class="hl ${main}">${art}<div class="k"><span>${esc(label)}</span>${d ? `<span class="dchip ${st}">${num(d)}</span>` : ''}</div>
      <div class="v">${num(fmt(val))}${unit ? `<small>${esc(unit)}</small>` : ''}</div>
      <div class="bar"><i class="${st}" style="width:${pct}%"></i></div>
      <div class="t"><span>${esc(t('toDate'))} <b>${num(fmt(tg))}</b></span>${kind !== 'cost' && r != null ? `<span>${t('hlPace')(num(fmtN(r * 100, 0) + '%'))}</span>` : ''}</div>
      ${mtv != null ? `<div class="t mt"><span>${esc(mtLabel())} <b>${num(fmt(mtv))}</b></span>${kind !== 'cost' && mtv ? `<span>${t('hlPace')(num(fmtN(val / mtv * 100, 0) + '%'))}</span>` : ''}</div>` : ''}${cv !== undefined ? cmpRow(val, cv, kind === 'pace' ? 'neutral' : kind) : ''}</div>`;
  };
  $('#headline').innerHTML = [
    hl(t('hlWeight'), T0.weight, T0.weightT, v => fmtN(v), 'volume', 'teal', lang === 'ar' ? 'كغ' : 'kg', MT.weight, pc(p => p.totals.weight)),
    hl(t('hlSpend'), T0.spend, T0.spendT, v => fmtUSD(v, 0), 'pace', 'soft', '', MT.spend, pc(p => p.totals.spend)),
    hl(t('hlCpk'), T0.cpk, T0.cpkT, fmtC, 'cost', 'main', t('perKg'), MT.cpk, pc(p => p.totals.cpk)),
  ].join('');
  // north star sentence under the group cards
  const diff = T0.cpkT ? T0.cpk / T0.cpkT - 1 : null;
  const p = diff == null ? '' : (diff > 0 ? t('over')(num(fmtN(diff * 100, 0) + '%')) : t('under')(num(fmtN(-diff * 100, 0) + '%')));
  $('#cpkTxt').innerHTML = T0.cpkT ? esc(t('northStar')) + '. ' + t('cpkLine')(fmtC(T0.cpk), num(fmtC(T0.cpkT)), p) : '';
  $('#groups').innerHTML = ['paid', 'organic', 'wa'].map(g => {
    const x = G[g]; const s = status(x.cpk, x.cpkT, 'cost');
    return `<div class="sg"><h3>${esc(t(g))}</h3><div class="meta">${esc(t('groupMeta')(fmtUSD(x.spend), fmtN(x.weight)))}</div>
      <div class="v"><span class="lbl">${esc(t('cpkLbl'))}</span><span class="num cpk-cell ${s}">${fmtC(x.cpk)}</span><span class="t">${esc(t('cpkTgtLbl'))} ${num(fmtC(x.cpkT))}</span>${perfC ? `<span class="t">${esc(cmpShort())} ${dchg(x.cpk, perfC.groups[g].cpk, 'cost') || '-'}</span>` : ''}</div></div>`;
  }).join('');
  const gl = g => kpi(`${t(g)}: ${t('leads')}`, G[g].leads, G[g].leadsT, v => fmtN(v), 'volume', MT.groups && MT.groups[g].leadsT, pc(p => p.groups[g].leads));
  const dna = donorsNA(), D0 = perf.donors, DC = perfC && perfC.donors;
  $('#kpiMkt').innerHTML = [
    kpi(t('spend'), T0.spend, T0.spendT, fmtUSD, 'pace', MT.spend, pc(p => p.totals.spend)),
    kpi(t('leads'), T0.leads, T0.leadsT, v => fmtN(v), 'volume', MT.leads, pc(p => p.totals.leads)),
    kpiPlain(t('newDonors'), dna ? '-' : fmtN(D0.newN), dna ? '' : t('shareOfDonors')(fmtP(D0.newShare)), dna || !DC ? undefined : D0.newN, DC && DC.newN, 'volume'),
    kpiPlain(t('retDonors'), dna ? '-' : fmtN(D0.retN), dna ? '' : t('shareOfDonors')(fmtP(D0.newShare == null ? null : 1 - D0.newShare)), dna || !DC ? undefined : D0.retN, DC && DC.retN, 'volume'),
    gl('paid'), gl('organic'), gl('wa'),
    kpi(t('cpl'), T0.cpl, T0.cplT, fmtC, 'cost', MT.cpl, pc(p => p.totals.cpl)),
    kpiPlain('nCAC', fmtC(D0.nCAC), t('ncacNote'), dna || !DC ? undefined : D0.nCAC, DC && DC.nCAC, 'cost'),
    kpiPlain('rCAC', fmtC(D0.rCAC), t('rcacNote'), dna || !DC ? undefined : D0.rCAC, DC && DC.rCAC, 'cost'),
  ].join('');
  $('#kpiLog').innerHTML = [
    kpi(t('pickups'), T0.pickups, T0.pickupsT, v => fmtN(v), 'volume', MT.pickups, pc(p => p.totals.pickups)),
    kpi(t('weight'), T0.weight, T0.weightT, v => fmtN(v) + (lang === 'ar' ? ' كغ' : ' kg'), 'volume', MT.weight, pc(p => p.totals.weight)),
    kpi(t('pickupRate'), T0.pickupRate, T0.pickupRateT, fmtP, 'volume', MT.pickupRate, pc(p => p.totals.pickupRate)),
    kpi(t('kgPerPickup'), T0.kgPerPickup, T0.kgPerPickupT, v => fmtN(v, 1), 'volume', MT.kgPerPickup, pc(p => p.totals.kgPerPickup)),
    kpi(t('cac'), T0.cac, T0.cacT, fmtC, 'cost', MT.cac, pc(p => p.totals.cac)),
    ...(() => {
      const ok = !dna && D0.pkKnown !== false, kgU = ' ' + (lang === 'ar' ? 'كغ' : 'kg'), cc = DC && DC.pkKnown !== false ? DC : null;
      const sh = (a, b) => (a + b) ? a / (a + b) : null;
      return [
        kpiPlain(t('newPk'), ok ? fmtN(D0.newPk) : '-', ok ? t('shareOfPickups')(fmtP(sh(D0.newPk, D0.retPk))) : '', ok && cc ? D0.newPk : undefined, cc && cc.newPk, 'volume'),
        kpiPlain(t('newKg'), ok ? fmtN(D0.newKg) + kgU : '-', ok ? t('shareOfKg')(fmtP(sh(D0.newKg, D0.retKg))) : '', ok && cc ? D0.newKg : undefined, cc && cc.newKg, 'volume'),
        kpiPlain(t('retPk'), ok ? fmtN(D0.retPk) : '-', ok ? t('shareOfPickups')(fmtP(sh(D0.retPk, D0.newPk))) : '', ok && cc ? D0.retPk : undefined, cc && cc.retPk, 'volume'),
        kpiPlain(t('retKg'), ok ? fmtN(D0.retKg) + kgU : '-', ok ? t('shareOfKg')(fmtP(sh(D0.retKg, D0.newKg))) : '', ok && cc ? D0.retKg : undefined, cc && cc.retKg, 'volume'),
      ];
    })(),
  ].join('');

  // cities
  // kg achievement vs the prorated kg target, per city
  const ach = (a, tg) => { if (!tg) return '<td></td>'; const r = a / tg, st = status(a, tg, 'volume');
    return `<td class="ach"><div class="achrow"><span class="minibar"><i class="${st}" style="width:${Math.min(100, r * 100)}%"></i></span><b class="num ${st}">${fmtN(r * 100, 0)}%</b></div></td>`; };
  $('#cityTbl').innerHTML = `<thead><tr><th>${t('city')}</th><th>${t('spend')}</th><th>${t('leads')}</th><th>${t('pickups')}</th><th>kg</th><th>${t('kgAch')}</th><th>${t('cpk')}</th></tr></thead><tbody>` +
    perf.cities.map(c => { const q = perfC && perfC.cities.find(x => x.city === c.city) || {};
      return `<tr><td>${esc(c.label[lang])}</td>
      <td>${num(fmtUSD(c.spend))}<span class="sub">${esc(t('target'))} ${num(fmtUSD(c.spendT))}</span>${dchg(c.spend, q.spend, 'neutral', 20)}</td>
      <td>${num(fmtN(c.leads))}<span class="sub">${num(fmtN(c.leadsT))}</span>${dchg(c.leads, q.leads, 'volume', 5)}</td>
      <td>${num(fmtN(c.pickups))}<span class="sub">${num(fmtN(c.pickupsT))}</span>${dchg(c.pickups, q.pickups, 'volume', 5)}</td>
      <td>${num(fmtN(c.weight))}<span class="sub">${num(fmtN(c.weightT))}</span>${dchg(c.weight, q.weight, 'volume', 50)}</td>${ach(c.weight, c.weightT)}
      <td class="cpk-cell ${status(c.cpk, c.cpkT, 'cost')}">${num(fmtC(c.cpk))}<span class="sub">${num(fmtC(c.cpkT))}</span>${dchg(c.cpk, q.weight >= 50 ? q.cpk : null, 'cost')}</td></tr>`; }).join('') + '</tbody>' +
    `<tfoot><tr><td>${esc(t18('total'))}</td>
      <td>${num(fmtUSD(T0.spend))}<span class="sub">${esc(t('target'))} ${num(fmtUSD(T0.spendT))}</span>${dchg(T0.spend, pc(p => p.totals.spend), 'neutral')}</td>
      <td>${num(fmtN(T0.leads))}<span class="sub">${num(fmtN(T0.leadsT))}</span>${dchg(T0.leads, pc(p => p.totals.leads), 'volume')}</td>
      <td>${num(fmtN(T0.pickups))}<span class="sub">${num(fmtN(T0.pickupsT))}</span>${dchg(T0.pickups, pc(p => p.totals.pickups), 'volume')}</td>
      <td>${num(fmtN(T0.weight))}<span class="sub">${num(fmtN(T0.weightT))}</span>${dchg(T0.weight, pc(p => p.totals.weight), 'volume')}</td>${ach(T0.weight, T0.weightT)}
      <td class="cpk-cell ${status(T0.cpk, T0.cpkT, 'cost')}">${num(fmtC(T0.cpk))}<span class="sub">${num(fmtC(T0.cpkT))}</span>${dchg(T0.cpk, pc(p => p.totals.cpk), 'cost')}</td></tr></tfoot>`;

  // chart
  const last = perf.range.lastReported || perf.range.to;
  const s = perf.series.filter(x => x.date <= last).map((x, i, arr) => {
    const win = arr.slice(Math.max(0, i - 6), i + 1); const sp = win.reduce((a, y) => a + y.spend, 0), kg = win.reduce((a, y) => a + y.weight, 0);
    return { ...x, cpk7: kg ? sp / kg : null };
  });
  trendSeries = s; renderTrend();
  renderCharts(s);

  // notes / sources
  const src = perf.sources;
  const when = x => { const d = x ? new Date(x) : null; return d && !isNaN(d) ? d.toISOString().slice(0, 16).replace('T', ' ') : ''; };
  const lines = [
    t('srcLine')(t('srcSheets'), src.sheets.mode === 'live' ? t('live') : t('snapshot'), src.sheets.mode === 'live' ? when(src.sheets.mtdModified) : when(src.sheets.snapshotAt)),
    t('srcLine')(t('srcOdoo'), src.odoo.mode === 'live' ? t('live') : t('snapshot'), src.odoo.mode === 'live' ? '' : when(src.odoo.snapshotAt)),
    t('srcLine')(t('srcAds'), src.ads.mode === 'live' ? t('live') : t('snapshot'), src.ads.coverage ? `${src.ads.coverage.from} → ${src.ads.coverage.to}` : ''),
    t('overheadNote'), t('brandingNote'), t('waPaidNote'),
    ...(src.odoo.favourites && src.odoo.favourites.length ? [t('favNote')(src.odoo.favourites.join(', '))] : []),
    ...(src.odoo.unassigned && src.odoo.unassigned.length ? [t('unassignedNote')(src.odoo.unassigned.join(', '))] : []),
    t('pkNote'),
    t('donorNote')(fmtN((dataset && dataset.donors && dataset.donors.historyPhones) || 0)),
    ...(dataset && dataset.donors && dataset.donors.note ? [dataset.donors.note] : []),
    ...(perf.notes || []), ...((src.ads.errors) || []),
  ];
  const tabs = Object.entries(src.sheets.tabs || {}).map(([k, v]) => `${k}: “${(v.daily || '-').trim()}” / “${(v.forecast || '-').trim()}”`);
  $('#notes').innerHTML = lines.map(l => `<li>${esc(l)}</li>`).join('') + (tabs.length ? `<li>${esc(tabs.join(' · '))}</li>` : '');
}

// ---------------- daily trend (one chart, four views) ----------------
let trendSeries = [], tview = (() => { try { return localStorage.getItem('awon-tview') || 'spend'; } catch (e) { return 'spend'; } })();
function renderTrend() {
  const s = trendSeries, rtl = lang === 'ar', dense = s.length > 45;
  $$('[data-tview]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.tview === tview)));
  const lbl = s.map(d => d.date.slice(5));
  const xs = { reverse: rtl, grid: { display: false }, ticks: { maxTicksLimit: 14 } };
  const yL = cb => ({ position: rtl ? 'right' : 'left', grid: { color: 'rgba(29,74,79,.08)' }, beginAtZero: true, ticks: { callback: cb } });
  const yR = cb => ({ position: rtl ? 'left' : 'right', grid: { display: false }, beginAtZero: true, ticks: { callback: cb } });
  const dash = (label, data, color, axis = 'y') => ({ type: 'line', label, data, borderColor: color, borderDash: [5, 4], pointRadius: 0, borderWidth: 1.5, yAxisID: axis, order: 0 });
  const line = (label, data, color, axis = 'y', w = 2) => ({ type: 'line', label, data, borderColor: color, backgroundColor: color, pointRadius: dense ? 0 : 2.5, borderWidth: w, tension: .25, yAxisID: axis, order: 0 });
  const div = (a, b) => (a != null && b ? a / b : null);
  let datasets, scales, note, tip;
  if (tview === 'volume') {
    datasets = [
      { type: 'bar', label: t('leads'), data: s.map(d => d.leads), backgroundColor: 'rgba(12,163,157,.85)', borderRadius: 3, order: 1 },
      { type: 'bar', label: t('pickups'), data: s.map(d => d.pickups), backgroundColor: '#1d4a4f', borderRadius: 3, order: 1 },
      dash(t('leadsT'), s.map(d => d.leadsT || null), '#0ca39d'),
      dash(t('pickupsT'), s.map(d => d.pickupsT || null), '#eda737')];
    scales = { x: xs, y: yL(v => fmtN(v)) }; note = t('volNote');
  } else if (tview === 'rates') {
    datasets = [
      line(t('pickupRate'), s.map(d => d.leads && d.pickups ? d.pickups / d.leads : null), '#0ca39d'),
      dash(t('rateT'), s.map(d => div(d.pickupsT, d.leadsT)), '#0ca39d'),
      line(t('kgPerPickup'), s.map(d => div(d.weight, d.pickups)), '#eda737', 'y2'),
      dash(t('kgpT'), s.map(d => div(d.weightT, d.pickupsT)), '#eda737', 'y2')];
    scales = { x: xs, y: yL(v => fmtN(v * 100, 0) + '%'), y2: yR(v => fmtN(v, 0) + ' kg') };
    tip = c => `${c.dataset.label}: ${c.raw == null ? '-' : c.dataset.yAxisID === 'y' ? fmtP(c.raw) : fmtN(c.raw, 1) + ' kg'}`;
    note = t('ratesNote');
  } else if (tview === 'cpl') {
    datasets = [
      line(t('cplAll'), s.map(d => div(d.spend, d.leads)), '#15373a', 'y', 3),
      ...['paid', 'organic', 'wa'].map(g => line(t(g), s.map(d => div(d['sp_' + g], d['ld_' + g])), GCOL[g] === '#1d4a4f' ? '#6fa8ad' : GCOL[g], 'y', 1.75)),
      dash(t('cplT'), s.map(d => div(d.spendT, d.leadsT)), '#eda737')];
    scales = { x: xs, y: yL(v => '$' + fmtN(v, 2)) };
    tip = c => `${c.dataset.label}: ${c.raw == null ? '-' : fmtC(c.raw)}`;
    note = t('cplNote');
  } else {
    const cpk7 = s.map((x, i) => { let sp = 0, kg = 0; for (let j = Math.max(0, i - 6); j <= i; j++) { sp += s[j].spend; kg += s[j].weight; } return kg ? sp / kg : null; });
    datasets = [
      { type: 'bar', label: t('series').spend, data: s.map(x => x.spend), backgroundColor: '#0ca39d', borderRadius: 4, yAxisID: 'y', order: 1 },
      dash(t('series').target, s.map(x => x.spendT), '#1d4a4f'),
      line(t('series').cpk, cpk7, '#eda737', 'y2')];
    datasets[2].spanGaps = true;
    scales = { x: xs, y: yL(v => '$' + fmtN(v)), y2: yR(v => '$' + fmtN(v, 2)) };
    note = t('spendNote');
  }
  const plugins = { legend: { position: 'bottom', labels: { boxWidth: 10, font: { family: 'IBM Plex Sans Arabic' } } } };
  if (tip) plugins.tooltip = { callbacks: { label: tip } };
  if (chart) chart.destroy();
  if (window.Chart && $('#trend')) chart = new Chart($('#trend'), { data: { labels: lbl, datasets },
    options: { maintainAspectRatio: false, animation: false, interaction: { mode: 'index', intersect: false }, plugins, scales } });
  $('#trendNote').textContent = note || '';
}

// ---------------- extra charts ----------------
const charts = {};
const GCOL = { paid: '#b54e37', organic: '#0ca39d', wa: '#1d4a4f' };
function mkChart(id, cfg) {
  if (charts[id]) charts[id].destroy();
  if (!window.Chart || !$('#' + id)) return;
  const base = { maintainAspectRatio: false, animation: false, interaction: { mode: 'index', intersect: false },
    plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { family: 'IBM Plex Sans Arabic' } } } } };
  cfg.options = Object.assign(base, cfg.options || {});
  charts[id] = new Chart($('#' + id), cfg);
}
function weekKey(d) { const x = new Date(d + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() - x.getUTCDay()); return x.toISOString().slice(0, 10); }
function renderCharts(s) {
  const rtl = lang === 'ar';
  const xs = { reverse: rtl, grid: { display: false }, ticks: { maxTicksLimit: 12 } };
  const ys = (cb) => ({ position: rtl ? 'right' : 'left', grid: { color: 'rgba(29,74,79,.08)' }, ticks: { callback: cb } });

  // 1) cost per kg by source group (7-day rolling, so Fridays and quiet days don't spike the line)
  const roll = (g, i) => { let sp = 0, kg = 0; for (let j = Math.max(0, i - 6); j <= i; j++) { sp += s[j]['sp_' + g] || 0; kg += s[j]['kg_' + g] || 0; } return kg > 50 ? sp / kg : null; };
  mkChart('cGroupCpk', { type: 'line', data: { labels: s.map(d => d.date.slice(5)), datasets: ['paid', 'organic', 'wa'].map(g => ({
    label: t(g), data: s.map((d, i) => roll(g, i)), borderColor: GCOL[g], backgroundColor: GCOL[g], pointRadius: s.length > 45 ? 0 : 2, borderWidth: 2, spanGaps: true, tension: .25 })) },
    options: { scales: { x: xs, y: ys(v => '$' + fmtN(v, 2)) } } });

  // 2) cumulative kg vs cumulative target
  let ca = 0, ct = 0;
  const cum = s.map(d => { ca += d.weight; ct += d.weightT; return { d: d.date, a: ca, t: ct }; });
  mkChart('cCumKg', { type: 'line', data: { labels: cum.map(c => c.d.slice(5)), datasets: [
    { label: t('kgActual'), data: cum.map(c => c.a), borderColor: '#0ca39d', backgroundColor: 'rgba(12,163,157,.12)', fill: true, pointRadius: 0, borderWidth: 2.5 },
    { label: t('kgTarget'), data: cum.map(c => c.t), borderColor: '#eda737', borderDash: [6, 4], pointRadius: 0, borderWidth: 2 }] },
    options: { scales: { x: xs, y: ys(v => fmtN(v / 1000) + 'k') } } });

  // 3) kg by city, actual vs target
  const cs = perf.cities;
  mkChart('cCityKg', { type: 'bar', data: { labels: cs.map(c => c.label[lang]), datasets: [
    { label: t('kgActual'), data: cs.map(c => c.weight), backgroundColor: '#0ca39d', borderRadius: 4 },
    { label: t('kgTarget'), data: cs.map(c => c.weightT), backgroundColor: 'rgba(237,167,55,.55)', borderRadius: 4 }] },
    options: { indexAxis: 'y', scales: { x: { reverse: rtl, ticks: { callback: v => fmtN(v / 1000) + 'k' }, grid: { color: 'rgba(29,74,79,.08)' } }, y: { position: rtl ? 'right' : 'left', grid: { display: false } } } } });

  // 4) new vs returning donors by month (unique phones; all months, independent of the date filter)
  const D = (dataset && dataset.donors) || {};
  const rows = D.rows || [];
  const b0 = D.base ? Date.parse(D.base + 'T00:00:00Z') : 0;
  const mOf = d => new Date(b0 + d * 864e5).toISOString().slice(0, 7);
  const byM = new Map();                        // month -> Map(pid -> firstDay)
  for (const [d, pid, fd] of rows) { const m = mOf(d); const x = byM.get(m) || new Map(); if (!x.has(pid)) x.set(pid, fd); byM.set(m, x); }
  const ms = [...byM.keys()].sort();
  const split = m => { let n = 0, r = 0; const start = Math.round((Date.parse(m + '-01T00:00:00Z') - b0) / 864e5); for (const fd of byM.get(m).values()) fd >= start ? n++ : r++; return [n, r]; };
  const sp = ms.map(split);
  mkChart('cDonors', { type: 'bar', data: { labels: ms, datasets: [
    { label: t('newDonors'), data: sp.map(x => x[0]), backgroundColor: '#0ca39d', borderRadius: 3, stack: 'a' },
    { label: t('retDonors'), data: sp.map(x => x[1]), backgroundColor: '#1d4a4f', borderRadius: 3, stack: 'a' }] },
    options: { scales: { x: { ...xs, stacked: true }, y: { ...ys(v => fmtN(v)), stacked: true } } } });

  // 5) cohorts: donors whose first-ever donation was in month M, and how many donated again in M+1, M+2...
  const cohort = new Map();                     // first month -> Set(pid)
  const active = new Map();                     // month -> Set(pid)
  for (const [d, pid, fd] of rows) {
    if (fd >= 0) { const fm = mOf(fd); (cohort.get(fm) || cohort.set(fm, new Set()).get(fm)).add(pid); }
    const m = mOf(d); (active.get(m) || active.set(m, new Set()).get(m)).add(pid);
  }
  const cms = [...cohort.keys()].filter(m => m >= '2026-03').sort();   // Feb 2026 is the first data month: its 'first donations' include earlier donors, so it is left out
  const addM = (m, k) => new Date(Date.UTC(+m.slice(0, 4), +m.slice(5, 7) - 1 + k, 1)).toISOString().slice(0, 7);
  const last = ms[ms.length - 1] || '';
  const maxOff = cms.length ? Math.max(0, ...cms.map(m => { let k = 0; while (addM(m, k + 1) <= last) k++; return k; })) : 0;
  const cell = v => { const a = Math.min(1, v * 3); return `background:rgba(12,163,157,${(0.08 + a * 0.8).toFixed(2)});color:${a > .55 ? '#fff' : 'inherit'}`; };
  $('#cohortTbl').innerHTML = `<thead><tr><th>${t('cohortMonth')}</th><th>${t('cohortSize')}</th>${Array.from({ length: maxOff }, (_, i) => `<th>+${i + 1}</th>`).join('')}</tr></thead><tbody>` +
    cms.map(m => { const set = cohort.get(m); return `<tr><td>${esc(m)}</td><td>${num(fmtN(set.size))}</td>${Array.from({ length: maxOff }, (_, i) => {
      const mm = addM(m, i + 1); if (mm > last) return '<td></td>';
      const act = active.get(mm); let c = 0; if (act) for (const p of set) if (act.has(p)) c++;
      const pct = set.size ? c / set.size : 0; return `<td style="${cell(pct)}">${num(fmtN(pct * 100, 1) + '%')}</td>`; }).join('')}</tr>`; }).join('') + '</tbody>';
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
  pts.slice(0, 600).forEach(p => {
    L.circleMarker([p.lat, p.lng], { radius: 3 + 11 * Math.sqrt(val(p) / max), color: p.precision === 'city' ? '#a8700f' : '#1d4a4f', weight: 1,
      fillColor: p.precision === 'city' ? '#eda737' : '#0ca39d', fillOpacity: .18, opacity: .45, dashArray: p.precision === 'city' ? '2 3' : null })
      .bindTooltip(`<b>${esc(lang === 'ar' ? p.ar : p.en)}</b> · ${esc(lang === 'ar' ? p.cityAr : p.cityEn)}<br>${t('donationsRec')}: ${fmtN(p.donations)} · ${t('leads')}: ${fmtN(p.leads)} · kg: ${fmtN(p.kg)}${p.precision === 'city' ? `<br><span class="approx">${t('approx')}</span>` : ''}`)
      .addTo(markers);
  });
  if (pts.length && mcity !== 'all') map.fitBounds(L.latLngBounds(pts.filter(p => p.precision === 'district').map(p => [p.lat, p.lng]).concat(pts.length ? [[pts[0].lat, pts[0].lng]] : [])).pad(0.1), { maxZoom: 12 });
  else if (mcity === 'all') map.setView([23.9, 45.1], 5);
  const inCity = p => mcity === 'all' ? true : mcity === 'other' ? !['riyadh', 'jeddah'].includes(p.city) : p.city === mcity;
  const sumPts = list => list.reduce((a, p) => ({ d: a.d + p.donations, k: a.k + p.kg, n: a.n + (p.donations ? 1 : 0) }), { d: 0, k: 0, n: 0 });
  const tot = sumPts(pts);
  // comparison period (fetched separately; shows '…' until it arrives)
  const cPts = heatC && !heatC.error ? (heatC.points || []).filter(inCity) : null;
  const ctot = cPts ? sumPts(cPts) : null;
  const pkey = p => p.city + '|' + p.en;
  const cIdx = cPts ? new Map(cPts.map(p => [pkey(p), p])) : null;
  const mrow = (cur, prev) => !cmpR ? '' : `<div class="t cmp"><span>${esc(cmpShort())}</span>${ctot ? dchg(cur, prev, 'volume') || '<span class="dl flat">-</span>' : '<span class="dl flat">…</span>'}</div>`;
  $('#mapStats').innerHTML = `<div class="kpi"><div class="k">${t('donationsRec')}</div><div class="v">${num(fmtN(tot.d))}</div>${mrow(tot.d, ctot && ctot.d)}</div>
    <div class="kpi"><div class="k">${t('totalKg')}</div><div class="v">${num(fmtN(tot.k))}</div>${mrow(tot.k, ctot && ctot.k)}</div>
    <div class="kpi"><div class="k">${t('districts')}</div><div class="v">${num(fmtN(tot.n))}</div>${mrow(tot.n, ctot && ctot.n)}</div>`;
  const top = [...pts].sort((a, b) => val(b) - val(a)).slice(0, 15);
  $('#topTbl').innerHTML = `<thead><tr><th>${t('district')}</th><th>${t('city')}</th><th>${t('donationsRec')}</th><th>kg</th><th>${t('kgPerDonation')}</th></tr></thead><tbody>` +
    top.map(p => `<tr><td>${esc(lang === 'ar' ? p.ar : p.en)}${p.precision === 'city' ? ' <span class="approx">•</span>' : ''}</td><td>${esc(lang === 'ar' ? p.cityAr : p.cityEn)}</td><td>${num(fmtN(p.donations))}${cIdx ? dchg(p.donations, (cIdx.get(pkey(p)) || {}).donations, 'volume', 3) : ''}</td><td>${num(fmtN(p.kg))}</td><td>${num(fmtN(p.donations ? p.kg / p.donations : null, 1))}</td></tr>`).join('') + '</tbody>' +
    `<tfoot><tr><td>${esc(t('totalAll'))}</td><td></td><td>${num(fmtN(tot.d))}${ctot ? dchg(tot.d, ctot.d, 'volume') : ''}</td><td>${num(fmtN(tot.k))}${ctot ? dchg(tot.k, ctot.k, 'volume') : ''}</td><td>${num(fmtN(tot.d ? tot.k / tot.d : null, 1))}</td></tr></tfoot>`;
  const notes = [];
  if (heat.error) notes.push(heat.error); else notes.push(t('mapSrc'));
  if (heat.locationTable != null) notes.push(t('locNote')(fmtN(heat.locationTable), fmtP(heat.placedShare)));
  else notes.push(t('locLoading'));
  if (heat.unmatched && heat.unmatched.length) notes.push(t('unmatchedNote')(heat.unmatched.slice(0, 12).join('، ')));
  if (heat.unplaced && heat.unplaced.donations) notes.push(t('unplaced')(fmtN(heat.unplaced.donations)));
  $('#mapNotes').innerHTML = notes.map(n => `<li>${esc(n)}</li>`).join('');
  setTimeout(() => map.invalidateSize(), 50);
}

// ---------------- date picker ----------------
const picker = $('#picker');
let pk = { mode: 'days', cursor: todayKSA().slice(0, 7), a: null, b: null };
const MONTHS = { en: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'], ar: ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'] };
const DOW = { en: ['Su','Mo','Tu','We','Th','Fr','Sa'], ar: ['ح','ن','ث','ر','خ','ج','س'] };
function openPicker(target) {
  pk.target = target === 'cmp' ? 'cmp' : 'main';
  const r = (pk.target === 'cmp' ? $('#cmpSel') : $('#customBtn')).getBoundingClientRect();
  picker.hidden = false;
  const left = lang === 'ar' ? Math.max(8, r.right - 320) : Math.min(r.left, innerWidth - 330);
  picker.style.left = left + scrollX + 'px'; picker.style.top = r.bottom + scrollY + 8 + 'px';
  const cur = pk.target === 'cmp' ? (cmpCustom || cmpR || resolve(state)) : resolve(state); pk.a = cur.from; pk.b = cur.to; pk.cursor = cur.to.slice(0, 7);
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
  else if ('apply' in b.dataset) { if (pk.a) {
    if (pk.target === 'cmp') { cmpCustom = { from: pk.a, to: pk.b || pk.a }; cmpMode = 'custom'; try { localStorage.setItem('awon-cmp', cmpMode); localStorage.setItem('awon-cmp-custom', JSON.stringify(cmpCustom)); } catch (err) {} }
    else { state = { preset: 'custom', from: pk.a, to: pk.b || pk.a }; save(); }
    picker.hidden = true; recompute(); } return; }
  drawPicker();
});
// closing the calendar without applying leaves the comparison as it was
function closePicker() { picker.hidden = true; $('#cmpSel').value = cmpMode; }
document.addEventListener('click', e => { if (!picker.hidden && !picker.contains(e.target) && e.target.id !== 'customBtn' && !e.target.closest('.cmp-sel')) closePicker(); });
function save() { sessionStorage.setItem('awon-range', JSON.stringify(state)); }

// ---------------- events ----------------
$$('[data-preset]').forEach(b => b.addEventListener('click', e => {
  if (b.dataset.preset === 'custom') { e.stopPropagation(); picker.hidden || pk.target !== 'main' ? openPicker('main') : (picker.hidden = true); return; }
  state = { preset: b.dataset.preset }; save(); recompute();
}));
$('#lang').addEventListener('click', () => { lang = lang === 'ar' ? 'en' : 'ar'; localStorage.setItem('awon-lang', lang); picker.hidden = true; render(); });
$('#refresh').addEventListener('click', () => load(true));
$('#cmpSel').addEventListener('change', e => {
  if (e.target.value === 'custom') { openPicker('cmp'); return; }   // applied from the calendar
  cmpMode = e.target.value; picker.hidden = true; try { localStorage.setItem('awon-cmp', cmpMode); } catch (err) {} recompute();
});
$('#cmpEdit').addEventListener('click', e => { e.stopPropagation(); picker.hidden || pk.target !== 'cmp' ? openPicker('cmp') : closePicker(); });
function showTab(which) {
  for (const k of ['perf', 'mkt', 'map']) { $('#tab-' + k).setAttribute('aria-selected', String(k === which)); $('#view-' + k).hidden = k !== which; }
  location.hash = which === 'perf' ? '' : which;
  if (which === 'map') ensureHeat();
  renderMap(); renderMkt();
}
function renderMkt() {
  if (!window.AwonMkt || $('#view-mkt').hidden) return;
  const { from, to } = resolve(state);
  try { $('#mktErr').innerHTML = ''; AwonMkt.render({ ds: dataset, from, to, lang, perf, cmp: cmpMode === 'custom' ? (cmpR || 'off') : cmpMode }); } catch (e) { console.error(e); $('#mktErr').innerHTML = `<div class="err">${esc(e.message)}</div>`; }
}
$('#tab-perf').addEventListener('click', () => showTab('perf'));
$('#tab-mkt').addEventListener('click', () => showTab('mkt'));
$('#tab-map').addEventListener('click', () => showTab('map'));
$$('[data-tview]').forEach(b => b.addEventListener('click', () => { tview = b.dataset.tview; try { localStorage.setItem('awon-tview', tview); } catch (e) {} renderTrend(); }));
$$('[data-metric]').forEach(b => b.addEventListener('click', () => { metric = b.dataset.metric; $$('[data-metric]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); renderMap(); }));
$$('[data-mcity]').forEach(b => b.addEventListener('click', () => { mcity = b.dataset.mcity; $$('[data-mcity]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); renderMap(); }));

if (location.hash === '#map' || location.hash === '#mkt') showTab(location.hash.slice(1));
render();
// Show the last copy from this browser straight away, then load the fresh one
readCachedDataset().then(d => { if (d && !dataset) { dataset = d; recompute(); } }).finally(() => load());
setInterval(() => { if (!document.hidden) load(); }, 5 * 60 * 1000);   // background refresh; the CDN serves cached data instantly
})();
