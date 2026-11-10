// Operations sheet for the dashboard (short cache so sheet edits show within a couple of minutes)
const opsheet = require('../lib/opsheet');
module.exports = async (req, res) => {
  try {
    const v = await opsheet.forDashboard();
    res.setHeader('Cache-Control', 'private, max-age=0, must-revalidate');
    res.status(200).json(v);
  } catch (e) {
    res.status(200).json({ mode: 'error', error: e.message, drivers: {}, rows: [], days: [] });
  }
};
