/* Awon dashboard: Operations tab. Daily logistics view by city and driver.
   Orders and pickups come from the operations sheet (synced nightly from Odoo), or from Odoo (ds.ops) for days not in the sheet yet.
   Weight comes only from the sheet's Weight column, entered by the logistics team.
   Leads come from Odoo too (ds.odoo.rows, valid leads by creation day and city); the daily lead target is the month's
   forecast tab (paid + organic + WhatsApp leads for the city, divided by the days in the month). */
(function () {
'use strict';
const T = {
  en: {
    title: 'Operations', sub: 'Pickups, weight and drivers for one day, with the month so far',
    prev: 'Previous day', next: 'Next day', today: 'Latest complete day',
    tWeight: 'Weight received', tMonth: 'Month so far', tOrders: 'Orders received', tOf: 'of', tRate: 'Receipt rate', tLeads: 'Leads vs target', tKgPick: 'kg per pickup', tDrivers: 'Drivers out',
    wTitle: 'Daily and monthly weight', wSub: 'Weight received in kg by city', wDay: 'Day', wMonth: 'Month so far', city: 'City', total: 'Total',
    rTitle: 'Receipt rate', rSub: 'Received ÷ orders closed that day (received, cancelled, no answer)',
    lTitle: 'Leads vs target', lSub: 'Valid leads created that day in Odoo, against the forecast daily target', lTarget: 'Target', lActual: 'Actual', lDiff: 'Difference', lPct: 'Achieved', lMonth: 'Month so far',
    dTitle: 'Drivers', dSub: 'Orders scheduled for the day by driver (Delivery Person in Odoo)',
    dCols: ['Driver', 'Orders', 'Received', 'Cancelled', 'No answer', 'Postponed', 'Receipt rate', 'Weight (kg)', 'kg / pickup', 'Month (kg)', 'Month rate'],
    hTitle: 'Weight by driver and day', hSub: 'kg received each day this month · Fridays shaded',
    none: 'No operations data for this day yet.', noData: 'Operations data is not available yet. It appears after the next data refresh.',
    notes: ['Orders are counted on their scheduled pickup day. A postponed order moves to its new day, so it is counted there.', 'Cancelled and no-answer orders count even when later archived in Odoo.', 'The daily lead target is the "Daily Leads" column of the month\'s latest forecast tab.'],
    pTitle: 'Selected period', pSub: 'Totals for the dates picked in the filter at the top', pDays: n => `${n} pickup ${n === 1 ? 'day' : 'days'}`, pDrivers: 'Active drivers', pPerDay: 'pickups per day', pClip: d => `Operations data starts on ${d}`, pNone: 'No operations data in the selected dates.', dayTitle: 'Day view', dayHint: 'Pick a day inside the selected dates',
    kgPend: n => `weight not entered for ${n} pickups`, kgNote: 'Weight comes only from the Weight column of the operations sheet, entered by the logistics team. – means not entered yet; * means entered for part of the pickups only. kg per pickup uses only pickups that have a weight.',
    srcSheet: 'From the operations sheet', srcOdoo: 'From Odoo directly: this day is not in the operations sheet yet', srcErr: 'Could not read the operations sheet, showing Odoo:',
    dows: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  },
  ar: {
    title: 'العمليات', sub: 'الاستلامات والوزن والمناديب ليوم واحد، مع الشهر حتى الآن',
    prev: 'اليوم السابق', next: 'اليوم التالي', today: 'آخر يوم مكتمل',
    tWeight: 'الوزن المستلم', tMonth: 'الشهر حتى الآن', tOrders: 'الطلبات المستلمة', tOf: 'من', tRate: 'نسبة الاستلام', tLeads: 'الليدز مقابل الهدف', tKgPick: 'كغ لكل استلام', tDrivers: 'المناديب العاملون',
    wTitle: 'الوزن اليومي والشهري', wSub: 'الوزن المستلم بالكيلو لكل مدينة', wDay: 'اليوم', wMonth: 'الشهر حتى الآن', city: 'المدينة', total: 'الإجمالي',
    rTitle: 'نسبة الاستلام', rSub: 'المستلم ÷ الطلبات المغلقة في اليوم (مستلم، ملغي، لا يرد)',
    lTitle: 'الليدز مقابل الهدف', lSub: 'الليدز الصالحة المسجلة في أودو ذلك اليوم مقابل هدف التوقعات اليومي', lTarget: 'الهدف', lActual: 'الفعلي', lDiff: 'الفرق', lPct: 'المحقق', lMonth: 'الشهر حتى الآن',
    dTitle: 'المناديب', dSub: 'الطلبات المجدولة لليوم لكل مندوب (مندوب التوصيل في أودو)',
    dCols: ['المندوب', 'الطلبات', 'المستلم', 'ملغي', 'لا يرد', 'مؤجل', 'نسبة الاستلام', 'الوزن (كغ)', 'كغ لكل استلام', 'الشهر (كغ)', 'نسبة الشهر'],
    hTitle: 'الوزن لكل مندوب ويوم', hSub: 'الكيلو المستلم كل يوم هذا الشهر · أيام الجمعة مظللة',
    none: 'لا توجد بيانات عمليات لهذا اليوم بعد.', noData: 'بيانات العمليات غير متاحة بعد، وستظهر بعد التحديث القادم.',
    notes: ['الطلبات تُحسب في يوم الاستلام المجدول. الطلب المؤجل ينتقل ليومه الجديد ويُحسب هناك.', 'الطلبات الملغاة وغير المجاب عليها تُحسب حتى لو أُرشفت لاحقاً في أودو.', 'هدف الليدز اليومي هو عمود "Daily Leads" في آخر نسخة من تبويب التوقعات للشهر.'],
    pTitle: 'الفترة المحددة', pSub: 'إجماليات التواريخ المختارة في الفلتر أعلى الصفحة', pDays: n => `${n} يوم استلام`, pDrivers: 'المناديب العاملون', pPerDay: 'استلام في اليوم', pClip: d => `بيانات العمليات تبدأ من ${d}`, pNone: 'لا توجد بيانات عمليات في التواريخ المحددة.', dayTitle: 'عرض اليوم', dayHint: 'اختر يوماً داخل التواريخ المحددة',
    kgPend: n => `لم يُدخل الوزن لـ ${n} استلام`, kgNote: 'الوزن يأتي فقط من عمود الوزن في شيت العمليات ويُدخله فريق اللوجستيات. – تعني لم يُدخل بعد، و* تعني أُدخل لجزء من الاستلامات فقط. كغ لكل استلام يُحسب من الاستلامات التي لها وزن فقط.',
    srcSheet: 'من شيت العمليات', srcOdoo: 'من أودو مباشرة: هذا اليوم لم يُكتب في شيت العمليات بعد', srcErr: 'تعذرت قراءة شيت العمليات، المعروض من أودو:',
    dows: ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
  },
};
const CITY = {
  riyadh: { en: 'Riyadh', ar: 'الرياض' }, jeddah: { en: 'Jeddah', ar: 'جدة' }, mecca: { en: 'Makkah', ar: 'مكة' }, taif: { en: 'Taif', ar: 'الطائف' },
  madina: { en: 'Madinah', ar: 'المدينة' }, sharqia: { en: 'Eastern Province', ar: 'الشرقية' }, asir: { en: 'Asir', ar: 'عسير' }, qassim: { en: 'Qassim', ar: 'القصيم' },
  yanbu: { en: 'Yanbu', ar: 'ينبع' }, kharj: { en: 'Al Kharj', ar: 'الخرج' }, hail: { en: 'Hail', ar: 'حائل' },
};
const ORDER = ['riyadh', 'jeddah', 'mecca', 'taif', 'madina', 'sharqia', 'asir', 'qassim', 'yanbu', 'kharj', 'hail'];
let lang = 'en', day = null, root = null, last = null, sheet = null, sheetAt = 0, loading = false;
// Days in the operations sheet come from the sheet (including the logistics team's corrections); other days from Odoo
function merged(ds) {
  const od = ds.ops || { rows: [], drivers: {} }, S = new Set((sheet && sheet.days) || []);
  const rows = ((sheet && sheet.rows) || []).slice();
  for (const r of od.rows || []) if (!S.has(r[0])) rows.push([r[0], (od.drivers || {})[r[1]] || String(r[1]), ...r.slice(2, 6), null]);   // weight only from the sheet
  const drivers = {}; for (const r of rows) drivers[r[1]] = r[1];
  return { ...ds, ops: { rows, drivers }, _sheetDays: S };
}
async function loadSheet(force) {
  if (loading || (!force && sheet && Date.now() - sheetAt < 110 * 1000)) return;
  loading = true;
  try { const r = await fetch('/api/ops', { cache: 'no-store', credentials: 'same-origin' }); sheet = await r.json(); }
  catch (e) { sheet = { mode: 'error', error: e.message, rows: [], days: [] }; }
  sheetAt = Date.now(); loading = false; draw();
}
const t = k => T[lang][k];
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nf = (v, d = 0) => (v == null || !isFinite(v) ? '–' : new Intl.NumberFormat(lang === 'ar' ? 'ar-SA-u-nu-latn' : 'en-US', { maximumFractionDigits: d, minimumFractionDigits: d }).format(v));
const pf = v => (v == null || !isFinite(v) ? '–' : nf(v * 100, 0) + '%');
const div = (a, b) => (b ? a / b : null);
const cityName = k => (CITY[k] ? CITY[k][lang] : k);
const addD = (iso, n) => { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const dim = m => new Date(Date.UTC(+m.slice(0, 4), +m.slice(5, 7), 0)).getUTCDate();
const dow = iso => new Date(iso + 'T00:00:00Z').getUTCDay();
const todayKSA = () => new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 10);
const fDay = iso => { const d = new Date(iso + 'T00:00:00Z'); return `${t('dows')[d.getUTCDay()]} ${new Intl.DateTimeFormat(lang === 'ar' ? 'ar-SA-u-nu-latn-ca-gregory' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(d)}`; };
const rateCls = r => (r == null ? '' : r >= 0.9 ? 'good' : r >= 0.8 ? 'warn' : 'bad');

function blank() { return { orders: 0, rec: 0, can: 0, na: 0, post: 0, open: 0, kg: 0, recW: 0, kgMiss: 0 }; }
function add(o, st, act, n, kg) {
  if (!act && st !== '4' && st !== '5') return;   // archived orders count only as cancelled / no answer
  o.orders += n;
  if (st === '6') { o.rec += n; if (kg == null) o.kgMiss += n; else { o.kg += kg; o.recW += n; } } else if (st === '5') o.can += n; else if (st === '4') o.na += n; else if (st === '3') o.post += n; else o.open += n;
}
const closed = o => o.rec + o.can + o.na;
// Weight is entered by the logistics team in the sheet: '–' = not entered yet, '*' = entered for part of the pickups only
const kgf = o => (o.recW ? nf(o.kg) + (o.kgMiss ? '*' : '') : o.kgMiss ? '–' : nf(0));
const kgp = o => (o.recW ? nf(o.kg / o.recW, 1) : '–');

function compute(ds, d) {
  const m = d.slice(0, 7), mStart = m + '-01', op = ds.ops || {};
  const byCity = {}, byCityM = {}, byDrv = {}, byDrvM = {}, heat = {}, drvCity = {};
  for (const [date, drv, city, st, act, n, kg] of op.rows || []) {
    if (date < mStart || date > d) continue;
    const cm = byCityM[city] || (byCityM[city] = blank()); add(cm, st, act, n, kg);
    const dm = byDrvM[drv] || (byDrvM[drv] = blank()); add(dm, st, act, n, kg);
    (drvCity[drv] || (drvCity[drv] = {}))[city] = ((drvCity[drv] || {})[city] || 0) + n;
    if (st === '6' && act && kg != null) { const h = heat[drv] || (heat[drv] = {}); h[date] = (h[date] || 0) + kg; }
    if (date !== d) continue;
    add(byCity[city] || (byCity[city] = blank()), st, act, n, kg);
    add(byDrv[drv] || (byDrv[drv] = blank()), st, act, n, kg);
  }
  const home = drv => { const c = drvCity[drv] || {}; return Object.keys(c).sort((a, b) => c[b] - c[a])[0] || 'unknown'; };
  // leads: valid leads created that day / month so far, by city
  const leads = {}, leadsM = {};
  for (const [date, city, , , , n] of (ds.odoo && ds.odoo.rows) || []) {
    if (date < mStart || date > d) continue;
    leadsM[city] = (leadsM[city] || 0) + n; if (date === d) leads[city] = (leads[city] || 0) + n;
  }
  const fc = ds.months && ds.months[m] && ds.months[m].forecast, days = (fc && fc.daysInMonth) || dim(m);
  const target = {};
  for (const c of (fc && fc.cities) || []) target[c.city] = c.dailyLeads ? c.dailyLeads * days : c.totalLeads || (((c.paid && c.paid.leads) || 0) + ((c.organic && c.organic.leads) || 0) + ((c.wa && c.wa.leads) || 0));
  return { m, mStart, byCity, byCityM, byDrv, byDrvM, heat, home, leads, leadsM, target, days, drivers: op.drivers || {} };
}
const cities = (...objs) => { const s = new Set(); for (const o of objs) for (const k of Object.keys(o)) if (k !== 'unknown') s.add(k); return [...s].sort((a, b) => (ORDER.indexOf(a) + 1 || 99) - (ORDER.indexOf(b) + 1 || 99)); };
const sumOf = (obj, keys) => keys.reduce((o, k) => { const x = obj[k]; if (x) for (const f in o) o[f] += x[f]; return o; }, blank());

function monthTargets(ds, m) {
  const fc = ds.months && ds.months[m] && ds.months[m].forecast, days = (fc && fc.daysInMonth) || dim(m), target = {};
  for (const c of (fc && fc.cities) || []) target[c.city] = c.dailyLeads ? c.dailyLeads * days : c.totalLeads || (((c.paid && c.paid.leads) || 0) + ((c.organic && c.organic.leads) || 0) + ((c.wa && c.wa.leads) || 0));
  return { target, days };
}
const fRange = (a, b) => { const f = iso => new Intl.DateTimeFormat(lang === 'ar' ? 'ar-SA-u-nu-latn-ca-gregory' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(iso + 'T00:00:00Z')); return a === b ? f(a) : `${f(a)} – ${f(b)}`; };
// Totals for the date filter at the top (clipped to yesterday and to the first day with operations data)
function period(ds, from, to) {
  const rows = (ds.ops && ds.ops.rows) || [], y = addD(todayKSA(), -1), first = rows.reduce((m, r) => (r[0] < m ? r[0] : m), '9999');
  const a = from < first ? first : from, b = to > y ? y : to;
  const head = `<div class="sec-h"><h2>${esc(t('pTitle'))} · ${esc(fRange(from, to > y ? y : to))}</h2><p>${esc(t('pSub'))}${from < first && first !== '9999' ? ' · ' + esc(t('pClip')(fRange(first, first))) : ''}</p></div>`;
  if (a > b) return head + `<div class="panel"><p class="muted">${esc(t('pNone'))}</p></div>`;
  const tot = blank(), drv = new Set(), pdays = new Set();
  for (const [date, d, , st, act, n, kg] of rows) { if (date < a || date > b) continue; add(tot, st, act, n, kg); if (act || st === '4' || st === '5') drv.add(d); if (st === '6' && act) pdays.add(date); }
  if (!tot.orders) return head + `<div class="panel"><p class="muted">${esc(t('pNone'))}</p></div>`;
  let leads = 0, tg = 0, hasT = false; const TM = {};
  for (const [date, , , , , n] of (ds.odoo && ds.odoo.rows) || []) if (date >= a && date <= b) leads += n;
  for (let x = a; x <= b; x = addD(x, 1)) { const m = x.slice(0, 7), M = TM[m] || (TM[m] = monthTargets(ds, m)); const v = Object.values(M.target).reduce((s, q) => s + (q || 0), 0); if (v) { hasT = true; tg += v / M.days; } }
  const rate = div(tot.rec, closed(tot)), lp = hasT ? div(leads, tg) : null, nd = pdays.size;
  return head + `<div class="op-tiles op-period">
    <div class="panel op-tile dk"><div class="k">${esc(t('tWeight'))}</div><div class="v">${kgf(tot)} <small>kg</small></div><div class="s">${tot.kgMiss ? esc(t('kgPend')(tot.kgMiss)) : esc(t('pDays')(nd))}</div></div>
    <div class="panel op-tile"><div class="k">${esc(t('tOrders'))}</div><div class="v">${nf(tot.rec)}</div><div class="s">${esc(t('tOf'))} ${nf(tot.orders)} · ${nf(div(tot.rec, nd))} ${esc(t('pPerDay'))}</div></div>
    <div class="panel op-tile"><div class="k">${esc(t('tRate'))}</div><div class="v"><span class="op-c ${rateCls(rate)}">${pf(rate)}</span></div><div class="s">${nf(tot.can)} ${esc(lang === 'ar' ? 'ملغي' : 'cancelled')} · ${nf(tot.na)} ${esc(lang === 'ar' ? 'لا يرد' : 'no answer')}</div></div>
    <div class="panel op-tile"><div class="k">${esc(t('tLeads'))}</div><div class="v">${nf(leads)} <small>/ ${hasT ? nf(tg) : '–'}</small></div><div class="s"><span class="op-c ${lp == null ? '' : lp >= 1 ? 'good' : lp >= 0.9 ? 'warn' : 'bad'}">${pf(lp)}</span></div></div>
    <div class="panel op-tile"><div class="k">${esc(t('tKgPick'))}</div><div class="v">${kgp(tot)}</div><div class="s">${esc(t('pDays')(nd))}</div></div>
    <div class="panel op-tile"><div class="k">${esc(t('pDrivers'))}</div><div class="v">${nf(drv.size)}</div><div class="s">${nf(div(tot.rec, drv.size * nd), 1)} ${esc(lang === 'ar' ? 'استلام لكل مندوب في اليوم' : 'pickups per driver per day')}</div></div></div>`;
}
function latestDay(ds, to) {
  const y = addD(todayKSA(), -1); let d = to && to < y ? to : y;
  const rows = (ds.ops && ds.ops.rows) || [];
  // step back to the last day that has received orders (e.g. skip a Friday with no pickups)
  for (let i = 0; i < 7; i++) { if (rows.some(r => r[0] === d && r[3] === '6')) return d; d = addD(d, -1); }
  return to && to < y ? to : y;
}

function html(ds, d) {
  const C = compute(ds, d), cs = cities(C.byCityM, C.target);
  const dayAll = sumOf(C.byCity, Object.keys(C.byCity)), monAll = sumOf(C.byCityM, Object.keys(C.byCityM));
  const lTot = cs.reduce((a, c) => a + (C.leads[c] || 0), 0), tTot = cs.reduce((a, c) => a + (C.target[c] || 0), 0) / C.days;
  const drvOut = Object.values(C.byDrv).filter(o => o.orders > 0).length;
  const src = ds._sheetDays && ds._sheetDays.has(d) ? `<span class="dchip good">${esc(t('srcSheet'))}</span>` : `<span class="dchip warn">${esc(sheet && sheet.mode === 'error' ? t('srcErr') + ' ' + sheet.error : t('srcOdoo'))}</span>`;
  const head = `<div class="op-head"><div class="sec-h"><h2>${esc(t('title'))} · ${esc(fDay(d))}</h2><p>${esc(t('sub'))} ${sheet ? src : ''}</p></div>
    <div class="op-nav"><button class="chip" data-opday="-1" aria-label="${esc(t('prev'))}" ${last && d <= last.from ? 'disabled' : ''}>${lang === 'ar' ? '→' : '←'}</button><button class="chip" data-opday="0">${esc(t('today'))}</button><button class="chip" data-opday="1" aria-label="${esc(t('next'))}" ${d >= addD(todayKSA(), -1) || (last && d >= last.to) ? 'disabled' : ''}>${lang === 'ar' ? '←' : '→'}</button></div></div>`;
  if (!dayAll.orders && !monAll.orders) return head + `<div class="panel"><p class="muted">${esc(t('none'))}</p></div>`;
  const rate = div(dayAll.rec, closed(dayAll)), lp = div(lTot, tTot);
  const tiles = `<div class="op-tiles">
    <div class="panel op-tile dk"><div class="k">${esc(t('tWeight'))}</div><div class="v">${kgf(dayAll)} <small>kg</small></div><div class="s">${esc(t('tMonth'))} ${kgf(monAll)} kg${dayAll.kgMiss ? ' · ' + esc(t('kgPend')(dayAll.kgMiss)) : ''}</div></div>
    <div class="panel op-tile"><div class="k">${esc(t('tOrders'))}</div><div class="v">${nf(dayAll.rec)}</div><div class="s">${esc(t('tOf'))} ${nf(dayAll.orders)} · ${esc(t('tMonth'))} ${nf(monAll.rec)}</div></div>
    <div class="panel op-tile"><div class="k">${esc(t('tRate'))}</div><div class="v"><span class="op-c ${rateCls(rate)}">${pf(rate)}</span></div><div class="s">${esc(t('tMonth'))} ${pf(div(monAll.rec, closed(monAll)))}</div></div>
    <div class="panel op-tile"><div class="k">${esc(t('tLeads'))}</div><div class="v">${nf(lTot)} <small>/ ${nf(tTot)}</small></div><div class="s"><span class="op-c ${lp == null ? '' : lp >= 1 ? 'good' : lp >= 0.9 ? 'warn' : 'bad'}">${pf(lp)}</span></div></div>
    <div class="panel op-tile"><div class="k">${esc(t('tKgPick'))}</div><div class="v">${kgp(dayAll)}</div><div class="s">${esc(t('tMonth'))} ${kgp(monAll)}</div></div>
    <div class="panel op-tile"><div class="k">${esc(t('tDrivers'))}</div><div class="v">${nf(drvOut)}</div><div class="s">${nf(div(dayAll.rec, drvOut), 1)} ${esc(lang === 'ar' ? 'استلام لكل مندوب' : 'pickups per driver')}</div></div></div>`;
  // weight by city
  const wcs = cs.filter(c => (C.byCityM[c] && C.byCityM[c].orders) || (C.byCity[c] && C.byCity[c].orders));
  const maxW = Math.max(1, ...wcs.map(c => (C.byCity[c] || blank()).kg));
  const weight = `<div class="panel op-card"><h3 class="ch">${esc(t('wTitle'))}</h3><p class="muted sm">${esc(t('wSub'))}</p><table class="lst op-t"><thead><tr><th>${esc(t('city'))}</th><th class="n">${esc(t('wDay'))}</th><th></th><th class="n">${esc(t('wMonth'))}</th></tr></thead><tbody>
    ${wcs.map(c => { const a = C.byCity[c] || blank(), b = C.byCityM[c] || blank(); return `<tr><td>${esc(cityName(c))}</td><td class="n">${kgf(a)}</td><td class="op-barc"><i style="width:${a.kg / maxW * 100}%"></i></td><td class="n">${kgf(b)}</td></tr>`; }).join('')}
    <tr class="tot"><td>${esc(t('total'))}</td><td class="n">${kgf(dayAll)}</td><td></td><td class="n">${kgf(monAll)}</td></tr></tbody></table></div>`;
  // receipt rate by city
  const receipt = `<div class="panel op-card"><h3 class="ch">${esc(t('rTitle'))}</h3><p class="muted sm">${esc(t('rSub'))}</p><div class="op-rates">
    ${wcs.map(c => { const a = C.byCity[c] || blank(), r = div(a.rec, closed(a)), rm = div((C.byCityM[c] || blank()).rec, closed(C.byCityM[c] || blank())); return `<div class="op-rate"><span class="lbl">${esc(cityName(c))}</span><span class="bar"><i class="${rateCls(r)}" style="width:${(r || 0) * 100}%"></i></span><b class="op-c ${rateCls(r)}">${pf(r)}</b><small class="muted">${esc(t('tMonth'))} ${pf(rm)}</small></div>`; }).join('')}
    <div class="op-rate tot"><span class="lbl">${esc(t('total'))}</span><span class="bar"><i class="${rateCls(rate)}" style="width:${(rate || 0) * 100}%"></i></span><b class="op-c ${rateCls(rate)}">${pf(rate)}</b><small class="muted">${esc(t('tMonth'))} ${pf(div(monAll.rec, closed(monAll)))}</small></div></div></div>`;
  // leads vs target
  const lcs = cs.filter(c => C.target[c] || C.leads[c]);
  const mDays = +d.slice(8);
  const leads = `<div class="panel op-card op-wide"><h3 class="ch">${esc(t('lTitle'))}</h3><p class="muted sm">${esc(t('lSub'))}</p><div class="tbl-wrap"><table class="lst op-t"><thead><tr><th>${esc(t('city'))}</th><th class="n">${esc(t('lTarget'))}</th><th class="n">${esc(t('lActual'))}</th><th class="n">${esc(t('lDiff'))}</th><th class="n">${esc(t('lPct'))}</th><th class="n">${esc(t('lMonth'))}</th></tr></thead><tbody>
    ${lcs.map(c => { const tg = C.target[c] ? C.target[c] / C.days : null, a = C.leads[c] || 0, p = div(a, tg), mt = tg ? tg * mDays : null, ma = C.leadsM[c] || 0; return `<tr><td>${esc(cityName(c))}</td><td class="n">${nf(tg)}</td><td class="n">${nf(a)}</td><td class="n ${tg == null ? '' : a - tg >= 0 ? 'pos' : 'neg'}">${tg == null ? '–' : (a - tg >= 0 ? '+' : '') + nf(a - tg)}</td><td class="n"><span class="op-pct ${p == null ? '' : p >= 1 ? 'good' : p >= 0.9 ? 'warn' : 'bad'}">${pf(p)}</span></td><td class="n">${nf(ma)} <small class="muted">/ ${nf(mt)}</small></td></tr>`; }).join('')}
    <tr class="tot"><td>${esc(t('total'))}</td><td class="n">${nf(tTot)}</td><td class="n">${nf(lTot)}</td><td class="n ${lTot - tTot >= 0 ? 'pos' : 'neg'}">${(lTot - tTot >= 0 ? '+' : '') + nf(lTot - tTot)}</td><td class="n"><span class="op-pct ${lp == null ? '' : lp >= 1 ? 'good' : lp >= 0.9 ? 'warn' : 'bad'}">${pf(lp)}</span></td><td class="n">${nf(lcs.reduce((a, c) => a + (C.leadsM[c] || 0), 0))} <small class="muted">/ ${nf(tTot * mDays)}</small></td></tr></tbody></table></div></div>`;
  // drivers grouped by home city
  const ids = Object.keys(C.byDrvM).filter(i => C.drivers[i] && C.byDrvM[i].orders > 0);
  const groups = {}; for (const i of ids) (groups[C.home(i)] || (groups[C.home(i)] = [])).push(i);
  const H = t('dCols');
  const row = (name, a, mo, cls = '') => { const r = div(a.rec, closed(a)), rm = div(mo.rec, closed(mo)); return `<tr class="${cls}"><td class="op-dn" dir="auto">${esc(name)}</td><td class="n">${nf(a.orders)}</td><td class="n">${nf(a.rec)}</td><td class="n">${nf(a.can)}</td><td class="n">${nf(a.na)}</td><td class="n">${nf(a.post)}</td><td class="n"><span class="op-c ${rateCls(r)}">${pf(r)}</span></td><td class="n">${kgf(a)}</td><td class="n">${kgp(a)}</td><td class="n">${kgf(mo)}</td><td class="n">${pf(rm)}</td></tr>`; };
  const drvRows = cities(groups).concat(groups.unknown ? ['unknown'] : []).map(c => {
    const list = groups[c].sort((a, b) => (C.byDrv[b] || blank()).kg - (C.byDrv[a] || blank()).kg);
    return `<tr class="grp"><td colspan="11">${esc(c === 'unknown' ? '–' : cityName(c))}</td></tr>${list.map(i => row(C.drivers[i], C.byDrv[i] || blank(), C.byDrvM[i])).join('')}${row(t('total') + ' · ' + (c === 'unknown' ? '–' : cityName(c)), sumOf(C.byDrv, list), sumOf(C.byDrvM, list), 'sub')}`;
  }).join('');
  const drivers = `<div class="sec-h"><h2>${esc(t('dTitle'))}</h2><p>${esc(t('dSub'))}</p></div><div class="panel"><div class="tbl-wrap"><table class="lst op-t op-drv"><thead><tr>${H.map((h, k) => `<th${k ? ' class="n"' : ''}>${esc(h)}</th>`).join('')}</tr></thead><tbody>${drvRows}
    ${row(t('total'), sumOf(C.byDrv, ids), sumOf(C.byDrvM, ids), 'tot')}</tbody></table></div></div>`;
  // heatmap
  const mdays = []; for (let x = C.mStart; x <= d; x = addD(x, 1)) mdays.push(x);
  const maxH = Math.max(1, ...ids.flatMap(i => mdays.map(x => (C.heat[i] || {})[x] || 0)));
  const heat = `<div class="sec-h"><h2>${esc(t('hTitle'))}</h2><p>${esc(t('hSub'))}</p></div><div class="panel"><div class="tbl-wrap"><table class="op-heat"><thead><tr><th></th>${mdays.map(x => `<th class="${dow(x) === 5 ? 'fri' : ''}${x === d ? ' sel' : ''}">${+x.slice(8)}</th>`).join('')}<th>${esc(t('total'))}</th></tr></thead><tbody>
    ${cities(groups).concat(groups.unknown ? ['unknown'] : []).map(c => groups[c].map(i => { const h = C.heat[i] || {}; return `<tr><th dir="auto">${esc(C.drivers[i])}</th>${mdays.map(x => { const v = h[x] || 0; return `<td class="${dow(x) === 5 ? 'fri' : ''}" style="${v ? `background:rgba(12,163,157,${(0.1 + 0.9 * v / maxH).toFixed(2)});color:${v / maxH > 0.55 ? '#fff' : 'var(--ink)'}` : ''}">${v ? nf(v) : ''}</td>`; }).join('')}<td class="tot">${nf(mdays.reduce((a, x) => a + (h[x] || 0), 0))}</td></tr>`; }).join('')).join('')}
    </tbody></table></div></div>`;
  const notes = `<ul class="notes">${[t('kgNote'), ...t('notes')].map(x => `<li>${esc(x)}</li>`).join('')}</ul>`;
  return `${head}${tiles}<div class="op-grid">${weight}${receipt}${leads}</div>${drivers}${heat}${notes}`;
}

function draw() {
  if (!root || !last) return;
  const ds = merged(last.ds);
  if (!ds.ops.rows.length) { root.innerHTML = `<section class="kpi-sec"><div class="panel"><p class="muted">${esc(t('noData'))}</p></div></section>`; return; }
  if (!day) day = latestDay(ds, last.to);
  if (last.from && day < last.from) day = last.from;
  try { root.innerHTML = `<section class="kpi-sec op">${period(ds, last.from || day, last.to || day)}<div class="op-dayh"><span>${esc(t('dayTitle'))}</span><small class="muted">${esc(t('dayHint'))}</small></div>${html(ds, day)}</section>`; }
  catch (e) { console.error(e); root.innerHTML = `<div class="err">${esc(e.message)}</div>`; }
}
function render(c) {
  lang = c.lang === 'ar' ? 'ar' : 'en'; root = document.getElementById(c.el || 'opsRoot');
  if (!last || last.to !== c.to || last.from !== c.from) day = null;   // a new date filter resets the day to the latest complete day inside it
  last = c;
  if (root && !root._wired) {
    root.addEventListener('click', e => {
      const b = e.target.closest('[data-opday]'); if (!b || b.disabled) return;
      const s = +b.dataset.opday; day = s === 0 ? latestDay(merged(last.ds), last.to) : addD(day, s);
      const y = addD(todayKSA(), -1); if (day > y) day = y; if (last.to && day > last.to) day = last.to; if (last.from && day < last.from) day = last.from;
      draw();
    });
    root._wired = true;
    setInterval(() => { if (root.offsetParent && !document.hidden) loadSheet(true); }, 120 * 1000);   // sheet edits show within ~2 minutes
  }
  draw(); loadSheet(false);
}
window.AwonOps = { render };
})();
