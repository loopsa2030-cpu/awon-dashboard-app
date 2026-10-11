// Joins sheet actuals, prorated forecast targets, Odoo attribution and ad spend.
const { loadMonths, FIRST_MONTH } = require('./sheetsdata');
const odooData = require('./odoodata');
const ads = require('./ads');
const { CITY_LABELS } = require('./cities');
const { classify } = require('./odoo');

const GROUPS = ['paid', 'organic', 'wa'];
const PLATS = ['snapchat', 'meta', 'google', 'tiktok'];
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

async function performance(from, to) {
  if (from < FIRST_MONTH + '-01') from = FIRST_MONTH + '-01';
  const notes = [];
  const [sheets, od, ad] = await Promise.all([
    loadMonths(from, to),
    odooData.daily(from, to).catch(e => { notes.push(e.message); return { source: 'error', rows: [] }; }),
    ads.dailySpend(from, to).catch(e => { notes.push(e.message); return { source: 'error', platforms: {} }; }),
  ]);
  if (sheets.notes) notes.push(...sheets.notes);

  // ---- sheet actuals by day/city
  const rows = [];
  const logisticsMonths = new Set();
  let lastReported = null;
  for (const [mk, m] of Object.entries(sheets.months)) {
    const mRows = (m.rows || []).filter(r => r.date >= from && r.date <= to);
    if ((m.rows || []).some(r => r.pickups > 0 || r.weight > 0)) logisticsMonths.add(mk);
    for (const r of mRows) { rows.push(r); if (r.reported && (!lastReported || r.date > lastReported)) lastReported = r.date; }
  }
  const targetEnd = lastReported && lastReported < to ? lastReported : to;

  // ---- Odoo helpers (per city, per group; logistics fallback for months without sheet logistics)
  const odooCityGroupKg = {};  const odooCityGroupWon = {};
  const odooLogistics = {};
  const plat = Object.fromEntries(PLATS.map(p => [p, { crmLeads: 0, pickups: 0, weight: 0 }]));
  for (const r of od.rows) {
    const { group, platform } = classify(r.source);
    if (r.won) {
      const k = r.city;
      odooCityGroupKg[k] = odooCityGroupKg[k] || { paid: 0, organic: 0, wa: 0 };
      odooCityGroupKg[k][group] += r.kg;
      odooCityGroupWon[k] = odooCityGroupWon[k] || { paid: 0, organic: 0, wa: 0 };
      odooCityGroupWon[k][group] += r.n;
      const lk = `${r.date}|${r.city}`;
      const l = odooLogistics[lk] || (odooLogistics[lk] = { pickups: 0, kg: 0 });
      l.pickups += r.n; l.kg += r.kg;
    }
    if (platform && plat[platform]) {
      plat[platform].crmLeads += r.n;
      if (r.won) { plat[platform].pickups += r.n; plat[platform].weight += r.kg; }
    }
  }

  // ---- actuals
  const total = blank();
  const groups = Object.fromEntries(GROUPS.map(g => [g, blank()]));
  const cities = {};
  const series = {};
  const cityOf = c => cities[c] || (cities[c] = { city: c, ...blank(), g: Object.fromEntries(GROUPS.map(g => [g, { leads: 0, spend: 0, leadsT: 0, spendT: 0, weightT: 0 }])) });
  const day = d => series[d] || (series[d] = { date: d, spend: 0, leads: 0, pickups: 0, weight: 0, spendT: 0, weightT: 0 });
  let usedOdooLogistics = false;
  for (const r of rows) {
    const c = cityOf(r.city), s = day(r.date);
    for (const g of GROUPS) {
      if (!r[g]) continue;
      c.g[g].leads += r[g].leads; c.g[g].spend += r[g].spend;
      groups[g].leads += r[g].leads; groups[g].spend += r[g].spend;
      c.leads += r[g].leads; c.spend += r[g].spend; s.leads += r[g].leads; s.spend += r[g].spend;
    }
    let pk = r.pickups, kg = r.weight;
    if (!logisticsMonths.has(r.date.slice(0, 7))) {
      const l = odooLogistics[`${r.date}|${r.city}`]; pk = l ? l.pickups : 0; kg = l ? l.kg : 0; usedOdooLogistics = true;
    }
    c.pickups += pk; c.weight += kg; s.pickups += pk; s.weight += kg;
  }
  if (usedOdooLogistics) notes.push('Pickups/kg for months without logistics columns in the Daily tab come from Odoo (Won orders).');

  // ---- prorated targets (marketing: calendar days; logistics: operating days, Fridays off)
  const opDaysCache = {};
  const opDays = mk => opDaysCache[mk] ?? (opDaysCache[mk] = eachDay(`${mk}-01`, `${mk}-${String(dim(mk)).padStart(2, '0')}`).filter(d => !isFriday(d)).length);
  for (const d of eachDay(from, targetEnd)) {
    const mk = d.slice(0, 7);
    const f = sheets.months[mk]?.forecast;
    if (!f) continue;
    const days = f.daysInMonth || dim(mk);
    const od_ = opDays(mk);
    const s = day(d);
    for (const fc of f.cities) {
      const c = cityOf(fc.city);
      const leadsDay = GROUPS.reduce((a, g) => a + fc[g].leads, 0) / days;
      const wDay = isFriday(d) ? 0 : fc.weight / od_;
      const pDay = isFriday(d) ? 0 : fc.pickups / od_;
      for (const g of GROUPS) {
        const sp = fc[g].budget / days, ld = fc[g].leads / days;
        c.g[g].spendT += sp; c.g[g].leadsT += ld; groups[g].spendT += sp; groups[g].leadsT += ld;
        const wg = leadsDay ? wDay * (ld / leadsDay) : 0;
        c.g[g].weightT += wg; groups[g].weightT += wg;
        groups[g].pickupsT += leadsDay ? pDay * (ld / leadsDay) : 0;
        c.spendT += sp; c.leadsT += ld; s.spendT += sp;
      }
      c.pickupsT += pDay; c.weightT += wDay; s.weightT += wDay;
    }
  }

  // ---- group weight/pickups: allocate each city's sheet kg by Odoo won-kg share (fallback: leads share)
  let estimated = false;
  for (const c of Object.values(cities)) {
    const share = odooCityGroupKg[c.city];
    const tot = share ? GROUPS.reduce((a, g) => a + share[g], 0) : 0;
    const wonTot = odooCityGroupWon[c.city] ? GROUPS.reduce((a, g) => a + odooCityGroupWon[c.city][g], 0) : 0;
    for (const g of GROUPS) {
      const f = tot ? share[g] / tot : (c.leads ? c.g[g].leads / c.leads : 0);
      const fp = wonTot ? odooCityGroupWon[c.city][g] / wonTot : f;
      if (!tot && c.weight) estimated = true;
      groups[g].weight += c.weight * f; groups[g].pickups += c.pickups * fp;
    }
  }
  if (estimated) notes.push('Some kg-by-source splits were estimated from lead share (no Odoo attribution for that city).');

  for (const c of Object.values(cities)) for (const k of Object.keys(blank())) total[k] += c[k];
  const cityList = Object.values(cities)
    .filter(c => c.spend || c.spendT || c.leads || c.weight)
    .map(c => { const o = finish({ ...c }); o.label = CITY_LABELS[c.city] || { en: c.city, ar: c.city };
      o.groups = Object.fromEntries(GROUPS.map(g => [g, { ...c.g[g], cpl: div(c.g[g].spend, c.g[g].leads) }])); delete o.g; return o; })
    .sort((a, b) => b.spend - a.spend);

  // ---- platforms
  let adsTotal = 0;
  const platforms = PLATS.map(p => {
    const list = ad.platforms?.[p] || [];
    const spend = list.reduce((a, r) => a + r.spend, 0);
    const platformLeads = list.reduce((a, r) => a + (r.platformLeads || 0), 0);
    adsTotal += spend;
    const x = plat[p];
    return { platform: p, spend, platformLeads, crmLeads: x.crmLeads, pickups: x.pickups, weight: x.weight,
      cpl: div(spend, x.crmLeads), cac: div(spend, x.pickups), cpk: div(spend, x.weight) };
  });

  finish(total); GROUPS.forEach(g => finish(groups[g]));
  const seriesList = Object.values(series).sort((a, b) => a.date.localeCompare(b.date))
    .map(s => ({ ...s, cpk: div(s.spend, s.weight) }));

  return {
    range: { from, to, lastReported, targetEnd, firstAvailable: FIRST_MONTH + '-01' },
    sources: {
      sheets: { mode: sheets.source, mtdModified: sheets.mtdModified, forecastModified: sheets.forecastModified,
        tabs: Object.fromEntries(Object.entries(sheets.months).map(([k, m]) => [k, { daily: m.dailyTab, forecast: m.forecastTab }])) },
      odoo: { mode: od.source },
      ads: { mode: ad.source, errors: ad.errors },
    },
    totals: total, groups, cities: cityList, platforms,
    reconciliation: { sheetPaidSpend: groups.paid.spend, adPlatformsSpend: adsTotal },
    series: seriesList, notes,
    generatedAt: new Date().toISOString(),
  };
}

module.exports = { performance };
