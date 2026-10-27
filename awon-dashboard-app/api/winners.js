const winners = require('../lib/winners');
const { range, send } = require('../lib/http');
module.exports = async (req, res) => {
  try { const { from, to } = range(req); send(res, 200, { range: { from, to }, ...(await winners.load(from, to)) }, 600); }
  catch (e) { console.error(e); send(res, 500, { error: e.message }); }
};
