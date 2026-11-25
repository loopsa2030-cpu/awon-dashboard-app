// Performance > Cities: driver forecast from paid spend.
// Per city: daily paid spend -> paid leads (response curve fitted on the last 28 reported days of the Daily sheet)
// + organic and WhatsApp leads (held at the last 7 days) -> pickups (pickups per lead in the last 7 days, so the
// forecast equals what the drivers actually did at last week's spend) -> drivers needed (pickups / standard load).
// Drivers working = distinct Odoo Delivery Persons on received pickups, averaged over working days.
(function () {
const T = {
  en: {
    title: 'Driver forecast from paid spend',
    sub: (a, b) => `Based on ${a} to ${b}. Move a city's daily paid spend and the CPL, leads, pickups, kg and drivers needed update. Organic and WhatsApp leads are held at that week's level.`,
    base: 'Start from', week: 'Last 7 days', plan: 'Forecast plan', all: 'All cities, paid spend', reset: 'Reset',
    kSpend: 'Paid spend / day', kLeads: 'Leads / day', kPick: 'Pickups / day', kKg: 'kg / day', kNeed: 'Drivers needed', now: 'now',
    note: cap => `Drivers needed = expected pickups ÷ ${cap} per driver per day (Settings). Expected pickups = leads × the city's pickups per lead in the last 7 days.`,
    city: 'City', spend: 'Paid spend / day', cpl: 'Paid CPL', leads: 'Leads / day', paid: 'paid', pick: 'Pickups / day', kg: 'kg / day', need: 'Drivers: need vs now',
    call: 'Call', trig: 'Trigger points', fit: 'Model fit', was: 'last 7 days', hold: 'Hold',
    add: n => `+${n} driver${n > 1 ? 's' : ''}`, rel: n => `−${n} driver${n > 1 ? 's' : ''}`,
    up: v => `▲ +1 driver above <b>${v}</b>/day`, dn: v => `▼ −1 driver below <b>${v}</b>/day`, dnNone: '▼ organic leads alone keep the current drivers busy',
    hi: 'high', md: 'medium', lo: 'low',
    move: (n, a, b) => `Move <b>${n}</b> driver${n > 1 ? 's' : ''} ${a} → <b>${b}</b>`, hire: n => `Add <b>${n}</b> new driver${n > 1 ? 's' : ''}`, spare: n => `${n} driver${n > 1 ? 's' : ''} spare`, none: 'No changes needed',
    cTitle: 'When does each city need another driver?', cSub: 'Line = drivers needed as paid spend rises (it bends where CPL rises with spend). Dashed = drivers working now. Dot = the spend picked above.',
    noData: 'Driver data from Odoo is not available yet. It appears after the next data refresh.',
  },
  ar: {
    title: 'توقع المناديب حسب صرف الإعلانات المدفوعة',
    sub: (a, b) => `مبني على الفترة من ${a} إلى ${b}. حرّك الصرف اليومي المدفوع لأي مدينة وتتحدث تكلفة الليد والليدز والاستلامات والكيلو والمناديب المطلوبين. ليدز العضوي والواتساب ثابتة على مستوى ذلك الأسبوع.`,
    base: 'البداية من', week: 'آخر 7 أيام', plan: 'خطة التوقعات', all: 'كل المدن، الصرف المدفوع', reset: 'إعادة',
    kSpend: 'الصرف المدفوع / يوم', kLeads: 'الليدز / يوم', kPick: 'الاستلامات / يوم', kKg: 'كيلو / يوم', kNeed: 'المناديب المطلوبون', now: 'الحالي',
    note: cap => `المناديب المطلوبون = الاستلامات المتوقعة ÷ ${cap} لكل مندوب يومياً (الإعدادات). الاستلامات المتوقعة = الليدز × استلامات كل ليد في المدينة خلال آخر 7 أيام.`,
    city: 'المدينة', spend: 'الصرف المدفوع / يوم', cpl: 'تكلفة الليد المدفوع', leads: 'الليدز / يوم', paid: 'مدفوع', pick: 'الاستلامات / يوم', kg: 'كيلو / يوم', need: 'المناديب: المطلوب مقابل الحالي',
    call: 'القرار', trig: 'نقاط التحول', fit: 'دقة النموذج', was: 'آخر 7 أيام', hold: 'ثبات',
    add: n => `+${n} مندوب`, rel: n => `−${n} مندوب`,
    up: v => `▲ +1 مندوب فوق <b>${v}</b>/يوم`, dn: v => `▼ −1 مندوب تحت <b>${v}</b>/يوم`, dnNone: '▼ ليدز العضوي وحدها تكفي المناديب الحاليين',
    hi: 'عالية', md: 'متوسطة', lo: 'منخفضة',
    move: (n, a, b) => `انقل <b>${n}</b> مندوب من ${a} ← <b>${b}</b>`, hire: n => `أضف <b>${n}</b> مندوب جديد`, spare: n => `${n} مندوب فائض`, none: 'لا تغييرات مطلوبة',
    cTitle: 'متى تحتاج كل مدينة مندوباً إضافياً؟', cSub: 'الخط = المناديب المطلوبون مع زيادة الصرف (ينحني حيث ترتفع تكلفة الليد). المتقطع = المناديب الحاليون. النقطة = الصرف المختار أعلاه.',
    noData: 'بيانات المناديب من أودو غير متاحة بعد. تظهر بعد التحديث القادم للبيانات.',
  },
};
const CITY = { riyadh: ['Riyadh', 'الرياض'], jeddah: ['Jeddah', 'جدة'], mecca: ['Makkah', 'مكة'], taif: ['Taif', 'الطائف'], madina: ['Madinah', 'المدينة'],
  sharqia: ['Eastern Province', 'الشرقية'], asir: ['Asir', 'عسير'], qassim: ['Qassim', 'القصيم'], kharj: ['Al Kharj', 'الخرج'], yanbu: ['Yanbu', 'ينبع'], hail: ['Hail', 'حائل'] };
const ORDER = ['riyadh', 'jeddah', 'mecca', 'taif', 'madina', 'sharqia', 'asir', 'qassim', 'yanbu', 'kharj', 'hail'];
let lang = 'en', st = { key: null, mode: 'week', g: 100, S: {} };
const charts = {};
const t = k => T[lang][k];
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nf = (v, d = 0) => (v == null || !isFinite(v) ? '–' : new Intl.NumberFormat(lang === 'ar' ? 'ar-SA-u-nu-latn' : 'en-US', { maximumFractionDigits: d, minimumFractionDigits: d }).format(v));
const usd = v => '$' + nf(v);
const num = s => `<span class="num">${s}</span>`;
const addD = (iso, n) => { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const dim = m => new Date(Date.UTC(+m.slice(0, 4), +m.slice(5, 7), 0)).getUTCDate();
const cName = k => (CITY[k] ? CITY[k][lang === 'ar' ? 1 : 0] : k);

// Build the per-city model at an anchor day (the last day with both Daily-sheet rows and driver data, up to `to`).
function model(ds, to) {
  const drv = ds.odoo && ds.odoo.drivers; if (!drv || !drv.length) return null;
  const sheet = {}; let lastSheet = null;
  for (const m of Object.values(ds.months || {})) for (const r of m.rows || []) {
    if (r[0] > to) continue; (sheet[r[1]] = sheet[r[1]] || {})[r[0]] = r; if (!lastSheet || r[0] > lastSheet) lastSheet = r[0];
  }
  const lastDrv = drv.reduce((a, r) => (r[0] <= to && r[0] > a ? r[0] : a), '');
  const end = [lastSheet, lastDrv].filter(Boolean).sort()[0]; if (!end) return null;
  const w0 = addD(end, -6), f0 = addD(end, -27);
  const D = {}; for (const r of drv) if (r[0] >= w0 && r[0] <= end) { const x = D[r[1]] || (D[r[1]] = { p: 0, dr: 0, kg: 0, days: 0 }); x.p += r[2]; x.dr += r[3]; x.kg += r[4]; x.days++; }
  const fc = ds.months && ds.months[end.slice(0, 7)] && ds.months[end.slice(0, 7)].forecast;
  const out = [];
  for (const c of ORDER.concat(Object.keys(D).filter(k => !ORDER.includes(k)))) {
    const d = D[c], rows = sheet[c]; if (!d || !rows || c === 'unknown') continue;
    let sp = 0, pl = 0, ol = 0, n = 0;
    for (let x = w0; x <= end; x = addD(x, 1)) { const r = rows[x]; if (!r) continue; n++; sp += r[3]; pl += r[2]; ol += r[4] + r[6]; }
    if (!n || pl <= 0 || sp <= 0 || !d.dr) continue;
    // response curve: log(paid leads) = k + b log(spend) over the last 28 days; b capped at 1 (no falling CPL) and
    // pulled toward 0.8 when the fit is weak, so noisy cities do not swing wildly.
    const pts = []; for (let x = f0; x <= end; x = addD(x, 1)) { const r = rows[x]; if (r && r[2] > 0 && r[3] > 0) pts.push([Math.log(r[3]), Math.log(r[2])]); }
    let b = 0.8, r2 = 0;
    if (pts.length >= 6) { const mx = pts.reduce((a, p) => a + p[0], 0) / pts.length, my = pts.reduce((a, p) => a + p[1], 0) / pts.length;
      let sxy = 0, sxx = 0, syy = 0; for (const [x, y] of pts) { sxy += (x - mx) * (y - my); sxx += (x - mx) ** 2; syy += (y - my) ** 2; }
      if (sxx > 0 && syy > 0) { const bf = sxy / sxx; r2 = sxy * sxy / (sxx * syy); b = r2 * Math.min(Math.max(bf, 0.3), 1) + (1 - r2) * 0.8; } }
    const leadsDay = (pl + ol) / n, pkDay = d.p / d.days;
    const fcc = fc && fc.cities.find(y => y.city === c), planDay = fcc && fcc.paid && fcc.paid.budget ? fcc.paid.budget / (fc.daysInMonth || dim(end.slice(0, 7))) : null;
    out.push({ c, S7: sp / n, paid7: pl / n, base: ol / n, b, r2, conv: pkDay / leadsDay, now: d.dr / d.days, kgp: d.p ? d.kg / d.p : 0, plan: planDay, max: Math.max(...Object.values(rows).filter(r => r[0] >= f0).map(r => r[3]), sp / n) });
  }
  return out.length ? { cities: out, from: w0, end } : null;
}

function render({ ds, to, lang: l, el }) {
  lang = l === 'ar' ? 'ar' : 'en';
  const root = document.getElementById(el); if (!root) return;
  const M = ds && model(ds, to);
  if (!M) { root.innerHTML = ds && ds.odoo && !ds.odoo.drivers ? `<div class="panel df-empty">${esc(t('noData'))}</div>` : ''; return; }
  const cap = (window.AwonKpi && AwonKpi.driverCap && AwonKpi.driverCap()) || 28;
  const key = M.end + '|' + M.cities.map(c => c.c).join(',');
  if (st.key !== key) st = { key, mode: st.mode, g: 100, S: {} };
  const baseOf = c => (st.mode === 'plan' && c.plan != null ? c.plan : c.S7);
  for (const c of M.cities) if (st.S[c.c] == null) st.S[c.c] = baseOf(c) * st.g / 100;
  const f = (c, s) => { const paid = c.paid7 * Math.pow(Math.max(s, 1) / c.S7, c.b), leads = paid + c.base, pk = leads * c.conv; return { paid, leads, pk, kg: pk * c.kgp, need: pk / cap, cpl: paid > 0.5 ? s / paid : null }; };
  const spendFor = (c, drivers) => { const paid = drivers * cap / c.conv - c.base; return paid <= 0 ? 0 : c.S7 * Math.pow(paid / c.paid7, 1 / c.b); };
  const hasPlan = M.cities.some(c => c.plan != null);
  const fD = iso => new Intl.DateTimeFormat(lang === 'ar' ? 'ar-SA-u-nu-latn-ca-gregory' : 'en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(iso + 'T00:00:00Z'));

  root.innerHTML = `<div class="panel df">
    <div class="df-h"><div><h3 class="ch">${esc(t('title'))}</h3><p class="muted df-sub">${esc(t('sub')(fD(M.from), fD(M.end)))}</p></div>
      ${hasPlan ? `<div class="df-mode"><span class="muted">${esc(t('base'))}</span><button class="chip" data-df-mode="week" aria-pressed="${st.mode === 'week'}">${esc(t('week'))}</button><button class="chip" data-df-mode="plan" aria-pressed="${st.mode === 'plan'}">${esc(t('plan'))}</button></div>` : ''}</div>
    <div class="df-glob"><span>${esc(t('all'))}</span><input type="range" id="dfG" min="50" max="200" step="5" value="${st.g}"><b id="dfGv">${num(st.g + '%')}</b><button class="chip" id="dfReset">${esc(t('reset'))}</button></div>
    <div class="df-kpis" id="dfK"></div>
    <p class="muted df-note">${esc(t('note')(nf(cap)))}</p>
    <div class="tbl-wrap"><table class="df-t"><thead><tr><th>${t('city')}</th><th>${t('spend')}</th><th>${t('cpl')}</th><th>${t('leads')}</th><th>${t('pick')}</th><th>${t('kg')}</th><th>${t('need')}</th><th>${t('call')}</th><th>${t('trig')}</th></tr></thead><tbody>
    ${M.cities.map((c, i) => `<tr data-i="${i}"><td class="df-c">${esc(cName(c.c))}<small class="df-fit ${c.r2 >= 0.7 ? 'hi' : c.r2 >= 0.45 ? 'md' : 'lo'}" title="${esc(t('fit'))}">${esc(t('fit'))}: ${esc(t(c.r2 >= 0.7 ? 'hi' : c.r2 >= 0.45 ? 'md' : 'lo'))}</small></td>
      <td><div class="df-sp"><input type="range" data-df="${c.c}" min="0" max="${Math.round(Math.max(c.max * 1.6, (c.plan || 0) * 1.3, c.S7 * 2.2) / 5) * 5}" step="5" value="${Math.round(st.S[c.c])}"><b class="df-sv"></b><small class="muted">${esc(t('was'))} ${num(usd(c.S7))}</small></div></td>
      <td class="df-cpl"></td><td class="df-l"></td><td class="df-p"></td><td class="df-kg"></td><td class="df-n"></td><td class="df-call"></td><td class="df-tr"></td></tr>`).join('')}
    </tbody></table></div>
    <div class="df-moves" id="dfMv"></div>
    <h3 class="ch df-ct">${esc(t('cTitle'))}</h3><p class="muted df-sub">${esc(t('cSub'))}</p>
    <div class="df-grid">${M.cities.map((c, i) => `<div class="df-cell"><div class="df-ch"><b>${esc(cName(c.c))}</b><span id="dfH${i}"></span></div><div class="df-cw"><canvas id="dfC${i}"></canvas></div></div>`).join('')}</div>
  </div>`;

  const css = getComputedStyle(document.documentElement), C = { red: '#b54e37', blue: '#2f5f8a', teal: '#0ca39d', ink: css.getPropertyValue('--ink').trim() || '#15373a' };
  const update = () => {
    const tot = { s: 0, l: 0, p: 0, kg: 0, need: 0, now: 0 }, gap = [];
    M.cities.forEach((c, i) => {
      const s = st.S[c.c], r = f(c, s), d = Math.round(r.need) - Math.round(c.now), tr = root.querySelector(`tr[data-i="${i}"]`);
      tot.s += s; tot.l += r.leads; tot.p += r.pk; tot.kg += r.kg; tot.need += r.need; tot.now += c.now; gap.push({ c: c.c, g: d });
      const col = d >= 1 ? C.red : d <= -1 ? C.blue : C.teal, mx = Math.max(c.now, r.need) * 1.4 || 1;
      tr.querySelector('.df-sv').innerHTML = num(usd(s));
      tr.querySelector('.df-cpl').innerHTML = r.cpl == null ? '–' : num('$' + nf(r.cpl, 2));
      tr.querySelector('.df-l').innerHTML = `<b>${num(nf(r.leads))}</b><small class="muted">${num(nf(r.paid))} ${esc(t('paid'))}</small>`;
      tr.querySelector('.df-p').innerHTML = num(nf(r.pk));
      tr.querySelector('.df-kg').innerHTML = num(nf(r.kg));
      tr.querySelector('.df-n').innerHTML = `<span class="df-bar"><i style="width:${Math.min(100, r.need / mx * 100)}%;background:${col}"></i><b style="inset-inline-start:${c.now / mx * 100}%"></b></span> <b style="color:${col}">${num(nf(r.need, 1))}</b> <small class="muted">/ ${num(nf(c.now, 1))}</small>`;
      tr.querySelector('.df-call').innerHTML = d >= 1 ? `<span class="df-chip add">${esc(t('add')(d))}</span>` : d <= -1 ? `<span class="df-chip rel">${esc(t('rel')(-d))}</span>` : `<span class="df-chip hold">${esc(t('hold'))}</span>`;
      const up = spendFor(c, Math.round(c.now) + 0.5), dn = Math.round(c.now) >= 1 ? spendFor(c, Math.round(c.now) - 0.5) : 0;
      tr.querySelector('.df-tr').innerHTML = `${t('up')(num(usd(up)))}<br>${dn >= Math.max(10, c.S7 * 0.1) ? t('dn')(num(usd(dn))) : esc(t('dnNone'))}`;
      // curve
      const top = +tr.querySelector('input').max, xs = Array.from({ length: 41 }, (_, k) => top * k / 40), id = 'dfC' + i;
      document.getElementById('dfH' + i).innerHTML = `<span class="muted">${num(usd(s))}/${lang === 'ar' ? 'يوم' : 'day'} → </span><b>${num(nf(r.need, 1))}</b>`;
      const data = { datasets: [
        { type: 'line', data: xs.map(x => ({ x, y: f(c, x).need })), borderColor: C.ink, borderWidth: 2, pointRadius: 0, tension: 0.3 },
        { type: 'line', data: [{ x: 0, y: c.now }, { x: top, y: c.now }], borderColor: C.red, borderDash: [5, 4], borderWidth: 1.3, pointRadius: 0 },
        { type: 'scatter', data: [{ x: s, y: r.need }], backgroundColor: col, borderColor: '#fff', borderWidth: 2, pointRadius: 6 }] };
      if (!window.Chart) return;
      if (charts[id] && charts[id].canvas === document.getElementById(id)) { charts[id].data = data; charts[id].update('none'); }
      else { if (charts[id]) charts[id].destroy(); charts[id] = new Chart(document.getElementById(id), { data, options: { maintainAspectRatio: false, animation: false,
        scales: { x: { type: 'linear', min: 0, max: top, reverse: lang === 'ar', ticks: { maxTicksLimit: 4, callback: v => '$' + nf(v), font: { size: 10 } }, grid: { display: false } },
          y: { beginAtZero: true, position: lang === 'ar' ? 'right' : 'left', ticks: { maxTicksLimit: 4, font: { size: 10 } }, grid: { color: 'rgba(29,74,79,.06)' } } },
        plugins: { legend: { display: false }, tooltip: { enabled: false } } } }); }
    });
    const dT = Math.round(tot.need) - Math.round(tot.now);
    root.querySelector('#dfK').innerHTML = [[t('kSpend'), usd(tot.s)], [t('kLeads'), nf(tot.l)], [t('kPick'), nf(tot.p)], [t('kKg'), nf(tot.kg)],
      [t('kNeed'), nf(tot.need, 1), `${t('now')} ${nf(tot.now, 1)} · ${dT > 0 ? '+' + dT : dT}`]].map(k => `<div class="df-k"><small>${esc(k[0])}</small><b>${num(k[1])}</b>${k[2] ? ` <i>${num(esc(k[2]))}</i>` : ''}</div>`).join('');
    // moves: cities with spare drivers cover cities that need more, before hiring
    const sur = gap.filter(x => x.g < 0).map(x => ({ c: x.c, v: -x.g })), def = gap.filter(x => x.g > 0).map(x => ({ c: x.c, v: x.g })), mv = [];
    for (const d of def) for (const s of sur) while (d.v > 0 && s.v > 0) { const k = mv.find(m => m[0] === s.c && m[1] === d.c); k ? k[2]++ : mv.push([s.c, d.c, 1]); d.v--; s.v--; }
    const hire = def.reduce((a, x) => a + x.v, 0), spare = sur.reduce((a, x) => a + x.v, 0);
    root.querySelector('#dfMv').innerHTML = (mv.map(m => `<span class="df-mv">${t('move')(m[2], esc(cName(m[0])), esc(cName(m[1])))}</span>`).join('') +
      (hire ? `<span class="df-mv add">${t('hire')(hire)}</span>` : '') + (spare ? `<span class="df-mv">${esc(t('spare')(spare))}</span>` : '')) || `<span class="df-mv">${esc(t('none'))}</span>`;
  };
  root.querySelectorAll('input[data-df]').forEach(inp => inp.addEventListener('input', e => { st.S[e.target.dataset.df] = +e.target.value; update(); }));
  root.querySelector('#dfG').addEventListener('input', e => { st.g = +e.target.value; root.querySelector('#dfGv').innerHTML = num(st.g + '%');
    for (const c of M.cities) { st.S[c.c] = baseOf(c) * st.g / 100; root.querySelector(`input[data-df="${c.c}"]`).value = Math.round(st.S[c.c]); } update(); });
  root.querySelector('#dfReset').addEventListener('click', () => { st.g = 100; st.S = {}; render({ ds, to, lang, el }); });
  root.querySelectorAll('[data-df-mode]').forEach(b => b.addEventListener('click', () => { st.mode = b.dataset.dfMode; st.g = 100; st.S = {}; render({ ds, to, lang, el }); }));
  update();
}
window.AwonDrivers = { render };
})();
