// Which sources are live, and which monthly tabs were detected for the current month.
const google = require('../lib/google'); const odoo = require('../lib/odoo'); const ads = require('../lib/ads');
const { findTab } = require('../lib/parse'); const { send, todayKSA } = require('../lib/http');
module.exports = async (req, res) => {
  const t = todayKSA(); const spec = { year: +t.slice(0, 4), month: +t.slice(5, 7) };
  const out = { today: t, google: google.configured(), odoo: odoo.configured(), supermetrics: ads.configured() };
  if (out.google) {
    try {
      const [m, f] = await Promise.all([google.workbook('mtd'), google.workbook('forecast')]);
      out.currentMonth = { daily: findTab(m.sheetNames, { ...spec, kind: 'daily' }), forecast: findTab(f.sheetNames, { ...spec, kind: 'forecast' }) };
      out.mtdModified = m.modified; out.forecastModified = f.modified;
    } catch (e) { out.googleError = e.message; }
  }
  if (out.odoo) {
    try { await odoo.call('res.users', 'search_count', [[]]); out.odooOk = true; } catch (e) { out.odooError = e.message; }
  }
  send(res, 200, out, 60);
};
