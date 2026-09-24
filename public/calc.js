/* Awon performance calculator: pure function shared by the browser and the server.
   Input: the compact dataset from /api/dataset. Output: totals, groups, cities, platforms, series.
   Running it in the browser makes switching timeframes instant (no server round-trip). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.AwonCalc = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const GROUPS = ['paid', 'organic', 'wa'];
  const PLATS = ['snapchat', 'meta', 'google', 'tiktok'];
  const LABELS = {
    riyadh: { en: 'Riyadh', ar: 'الرياض' }, jeddah: { en: 'Jeddah', ar: 'جدة' },
    mecca: { en: 'Makkah', ar: 'مكة' }, taif: { en: 'Taif', ar: 'الطائف' },
    madina: { en: 'Madinah', ar: 'المدينة' }, sharqia: { en: 'Eastern Province', ar: 'الشرقية' },
    asir: { en: 'Asir', ar: 'عسير' }, hail: { en: 'Hail', ar: 'حائل' },
    qassim: { en: 'Qassim', ar: 'القصيم' }, kharj: { en: 'Al Kharj', ar: 'الخرج' }, yanbu: { en: 'Yanbu', ar: 'ينبع' },
  };
  const div = (a, b) => (b ? a / b : null);
  const addDays = (iso, n) => { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const eachDay = (a, b) => { const o = []; for (let d = a; d <= b; d = addDays(d, 1)) o.push(d); return o; };
  const dim = k => { const [y, m] = k.split('-').map(Number); return new Date(Date.UTC(y, m, 0)).getUTCDate(); };
  const isFriday = iso => new Date(iso + 'T00:00:00Z').getUTCDay() === 5;
  const blank = () => ({ spend: 0, spendT: 0, leads: 0, leadsT: 0, pickups: 0, pickupsT: 0, weight: 0, weightT: 0 });
  function finish(o) {
    o.cpl = div(o.spend, o.leads); o.cplT = div(o.spendT, o.leadsT);
    o.cac = div(o.spend, o.pickups); o.cacT = div(o.spendT, o.pickupsT);
    o.cpk = div(o.spend, o.weight); o.cpkT = div(o.spendT, o.weightT);
    o.pickupRate = div(o.pickups, o.leads); o.pickupRateT = div(o.pickupsT, o.leadsT);
    o.kgPerPickup = div(o.weight, o.pickups); o.kgPerPickupT = div(o.weightT, o.pickupsT);
    return o;
  }

  // ds.months[k].rows: [date, city, paidLeads, paidSpend, orgLeads, orgSpend, waLeads, waSpend, pickups, kg]
  // ds.odoo.rows:      [date, city, group, platform|null, won(0/1), n, kg]
  // ds.ads.platforms:  { google: [[date, spend, platformLeads]], ... }
  function compute(ds, from, to) {
    const first = ds.firstMonth + '-01';
    if (from < first) from = first;
    const notes = [...(ds.notes || [])];

    const rows = [];
    const logisticsMonths = new Set();
    let lastReported = null;
    for (const [mk, m] of Object.entries(ds.months)) {
      if (m.rows.some(r => r[8] > 0 || r[9] > 0)) logisticsMonths.add(mk);
      if (mk < from.slice(0, 7) || mk > to.slice(0, 7)) continue;
      for (const r of m.rows) {
        if (r[0] < from || r[0] > to) continue;
        rows.push(r);
        if (!lastReported || r[0] > lastReported) lastReported = r[0];
      }
    }
    const targetEnd = lastReported && lastReported < to ? lastReported : to;

    const oKg = {}, oWon = {}, oLog = {};
    const plat = Object.fromEntries(PLATS.map(p => [p, { crmLeads: 0, pickups: 0, weight: 0 }]));
    for (const [date, city, group, platform, won, n, kg] of ds.odoo.rows) {
      if (date < from || date > to) continue;
      if (won) {
        (oKg[city] = oKg[city] || { paid: 0, organic: 0, wa: 0 })[group] += kg;
        (oWon[city] = oWon[city] || { paid: 0, organic: 0, wa: 0 })[group] += n;
        const l = oLog[date + '|' + city] || (oLog[date + '|' + city] = { pickups: 0, kg: 0 });
        l.pickups += n; l.kg += kg;
      }
      if (platform && plat[platform]) {
        plat[platform].crmLeads += n;
        if (won) { plat[platform].pickups += n; plat[platform].weight += kg; }
      }
    }

    const total = blank();
    const groups = Object.fromEntries(GROUPS.map(g => [g, blank()]));
    const cities = {}, series = {};
    const cityOf = c => cities[c] || (cities[c] = { city: c, ...blank(), g: Object.fromEntries(GROUPS.map(g => [g, { leads: 0, spend: 0, leadsT: 0, spendT: 0 }])) });
    const day = d => series[d] || (series[d] = { date: d, spend: 0, leads: 0, pickups: 0, weight: 0, spendT: 0, weightT: 0 });
    let usedOdoo = false;
    for (const r of rows) {
      const [date, city] = r;
      const c = cityOf(city), s = day(date);
      GROUPS.forEach((g, i) => {
        const leads = r[2 + i * 2], spend = r[3 + i * 2];
        c.g[g].leads += leads; c.g[g].spend += spend;
        groups[g].leads += leads; groups[g].spend += spend;
        c.leads += leads; c.spend += spend; s.leads += leads; s.spend += spend;
      });
      let pk = r[8], kg = r[9];
      if (!logisticsMonths.has(date.slice(0, 7))) { const l = oLog[date + '|' + city]; pk = l ? l.pickups : 0; kg = l ? l.kg : 0; usedOdoo = true; }
      c.pickups += pk; c.weight += kg; s.pickups += pk; s.weight += kg;
    }
    if (usedOdoo) notes.push('Pickups/kg for months without logistics columns in the Daily tab come from Odoo (Won orders).');

    let overheadT = 0;
    const opCache = {};
    const opDays = mk => opCache[mk] ?? (opCache[mk] = eachDay(mk + '-01', mk + '-' + String(dim(mk)).padStart(2, '0')).filter(d => !isFriday(d)).length);
    for (const d of eachDay(from, targetEnd)) {
      const mk = d.slice(0, 7);
      const f = ds.months[mk] && ds.months[mk].forecast;
      if (!f) continue;
      const days = f.daysInMonth || dim(mk), od = opDays(mk), s = day(d), fri = isFriday(d);
      for (const fc of f.cities) {
        const c = cityOf(fc.city);
        const oh = (fc.overhead || 0) / days;     // marketing overhead, prorated with the direct budget
        const budgetDay = GROUPS.reduce((a, g) => a + fc[g].budget, 0) / days;
        c.spendT += oh; s.spendT += oh; overheadT += oh;
        const leadsDay = GROUPS.reduce((a, g) => a + fc[g].leads, 0) / days;
        const wDay = fri ? 0 : fc.weight / od, pDay = fri ? 0 : fc.pickups / od;
        for (const g of GROUPS) {
          const sp = fc[g].budget / days + (budgetDay ? oh * (fc[g].budget / days) / budgetDay : 0);   // direct budget plus its share of overhead
          const ld = fc[g].leads / days;
          c.g[g].spendT += sp; c.g[g].leadsT += ld; groups[g].spendT += sp; groups[g].leadsT += ld;
          if (leadsDay) { groups[g].weightT += wDay * ld / leadsDay; groups[g].pickupsT += pDay * ld / leadsDay; }
          c.spendT += sp - (budgetDay ? oh * (fc[g].budget / days) / budgetDay : 0); c.leadsT += ld; s.spendT += sp - (budgetDay ? oh * (fc[g].budget / days) / budgetDay : 0);
        }
        c.pickupsT += pDay; c.weightT += wDay; s.weightT += wDay;
      }
    }

    let estimated = false;
    for (const c of Object.values(cities)) {
      const kgS = oKg[c.city], wonS = oWon[c.city];
      const kgT = kgS ? GROUPS.reduce((a, g) => a + kgS[g], 0) : 0;
      const wonT = wonS ? GROUPS.reduce((a, g) => a + wonS[g], 0) : 0;
      for (const g of GROUPS) {
        const f = kgT ? kgS[g] / kgT : (c.leads ? c.g[g].leads / c.leads : 0);
        const fp = wonT ? wonS[g] / wonT : f;
        if (!kgT && c.weight) estimated = true;
        groups[g].weight += c.weight * f; groups[g].pickups += c.pickups * fp;
      }
    }
    if (estimated) notes.push('Some kg-by-source splits were estimated from lead share (no Odoo attribution for that city).');

    for (const c of Object.values(cities)) for (const k of Object.keys(blank())) total[k] += c[k];
    const cityList = Object.values(cities)
      .filter(c => c.spend || c.spendT || c.leads || c.weight)
      .map(c => { const o = finish({ ...c }); o.label = LABELS[c.city] || { en: c.city, ar: c.city }; delete o.g; return o; })
      .sort((a, b) => b.spend - a.spend);

    let adsTotal = 0;
    const platforms = PLATS.map(p => {
      let spend = 0, platformLeads = 0;
      for (const [d, sp, pl] of (ds.ads.platforms[p] || [])) if (d >= from && d <= to) { spend += sp; platformLeads += pl; }
      adsTotal += spend;
      const x = plat[p];
      return { platform: p, spend, platformLeads, crmLeads: x.crmLeads, pickups: x.pickups, weight: x.weight,
        cpl: div(spend, x.crmLeads), cac: div(spend, x.pickups), cpk: div(spend, x.weight) };
    });

    finish(total); GROUPS.forEach(g => finish(groups[g]));
    const seriesList = Object.values(series).sort((a, b) => a.date.localeCompare(b.date));
    const tabs = {};
    for (const [k, m] of Object.entries(ds.months)) if (k >= from.slice(0, 7) && k <= to.slice(0, 7)) tabs[k] = { daily: m.dailyTab, forecast: m.forecastTab };

    return {
      range: { from, to, lastReported, targetEnd, firstAvailable: first },
      sources: { sheets: { ...ds.sources.sheets, tabs }, odoo: ds.sources.odoo, ads: ds.sources.ads },
      totals: total, groups, cities: cityList, platforms, overheadT,
      reconciliation: { sheetPaidSpend: groups.paid.spend, adPlatformsSpend: adsTotal },
      series: seriesList, notes, generatedAt: ds.generatedAt,
    };
  }
  return { compute };
});
