// Donor history by phone number: earliest received donation per phone, from the
// "Awon Customer Data - Rolling" Google Sheet (old system + Odoo exports).
// Phone numbers never leave the server: the browser only gets anonymous indexes.
const google = require('./google');

const FILE_ID = process.env.CUSTOMER_HISTORY_FILE_ID || '18ATWF8g0xzjOpm0rzc_8vCFfD3umnApzrgRkg-s6Q5s';
const TTL = 6 * 3600 * 1000;
let cache = null, inflight = null;

// Saudi mobile numbers in any format (+9665.., 009665.., 05.., 5..) -> 9-digit key "5XXXXXXXX"
function normPhone(v) {
  let d = String(v ?? '').replace(/\D/g, '');
  if (!d) return null;
  d = d.replace(/^00/, '');
  if (d.startsWith('966')) d = d.slice(3);
  d = d.replace(/^0+/, '');
  return d.length >= 8 && d.length <= 10 ? d.slice(-9) : null;
}
const iso = v => {
  if (v instanceof Date && !isNaN(v)) return v.toISOString().slice(0, 10);
  const s = String(v ?? '').trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
};

// Read through the Google Sheets API (the file is too big for a Drive export). Only the phone, status
// and date columns are fetched. Needs "Google Sheets API" enabled in the same Google Cloud project.
async function load() {
  if (cache && Date.now() - cache.at < TTL) return cache.map;
  if (inflight) return inflight;
  inflight = loadFresh().finally(() => { inflight = null; });
  return inflight;
}
async function loadFresh() {
  const api = `https://sheets.googleapis.com/v4/spreadsheets/${FILE_ID}`;
  const meta = await google.request(`${api}?fields=sheets.properties.title`);
  const tabs = meta.sheets.map(x => x.properties.title);
  const q = t => encodeURIComponent(`'${t.replace(/'/g, "''")}'`);
  const heads = await google.request(`${api}/values:batchGet?${tabs.map(t => 'ranges=' + q(t) + '!1:1').join('&')}`);
  const today = new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 10);
  const first = new Map();
  const add = (phone, date) => {
    const p = normPhone(phone);
    if (!p || !date || date < '2018-01-01' || date > today) return;
    const cur = first.get(p);
    if (!cur || date < cur) first.set(p, date);
  };
  const letter = i => { let s = ''; i++; while (i) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };
  for (let ti = 0; ti < tabs.length; ti++) {
    const H = ((heads.valueRanges[ti] || {}).values || [[]])[0].map(c => String(c ?? '').trim().toLowerCase());
    const col = n => H.indexOf(n);
    let want, kind;
    if (col('phone') >= 0 && col('status') >= 0) { kind = 'old'; want = ['phone', 'phone_2', 'status', 'package_date', 'request_date']; }
    else if (col('phone') >= 0 && col('stage') >= 0 && col('delivery status') >= 0) { kind = 'odoo'; want = ['phone', 'stage', 'delivery status', 'expected closing', 'created on']; }
    else continue;
    const cols = want.map(col);
    const ranges = cols.filter(c => c >= 0).map(c => 'ranges=' + q(tabs[ti]) + '!' + letter(c) + '2:' + letter(c));
    const r = await google.request(`${api}/values:batchGet?${ranges.join('&')}&majorDimension=COLUMNS&valueRenderOption=FORMATTED_VALUE`);
    const data = {}; let k = 0;
    cols.forEach((c, i) => { data[want[i]] = c >= 0 ? (((r.valueRanges[k++] || {}).values || [[]])[0] || []) : []; });
    const n = data.phone.length;
    for (let i = 0; i < n; i++) {
      if (kind === 'old') {
        if (String(data.status[i] ?? '').trim().toLowerCase() !== 'received') continue;
        let d = iso(data.package_date[i]); if (!d || d > today) d = iso(data.request_date[i]);
        add(data.phone[i], d); add(data.phone_2[i], d);
      } else {
        if (!/won/i.test(String(data.stage[i] ?? '')) || !/received/i.test(String(data['delivery status'][i] ?? ''))) continue;
        add(data.phone[i], iso(data['expected closing'][i]) || iso(data['created on'][i]));
      }
    }
  }
  cache = { at: Date.now(), map: first };
  return first;
}

module.exports = { load, normPhone };
