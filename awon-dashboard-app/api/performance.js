// Server-side version of the calculation (handy for checks): /api/performance?from=YYYY-MM-DD&to=YYYY-MM-DD
const dataset = require('../lib/dataset');
const { compute } = require('../public/calc.js');
const { range, send } = require('../lib/http');
module.exports = async (req, res) => {
  try { const { from, to } = range(req); send(res, 200, compute(await dataset.get(), from, to)); }
  catch (e) { console.error(e); send(res, 500, { error: e.message }); }
};
