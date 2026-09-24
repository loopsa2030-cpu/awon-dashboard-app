const dataset = require('../lib/dataset');
let waitUntil; try { ({ waitUntil } = require('@vercel/functions')); } catch (e) { /* local dev */ }
module.exports = async (req, res) => {
  try {
    const data = await dataset.get({ waitUntil });
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    // Browser: always revalidate. Vercel CDN: serve instantly for 10 min, then serve stale while refreshing.
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Vercel-CDN-Cache-Control', 'max-age=600, stale-while-revalidate=86400');
    res.end(JSON.stringify(data));
  } catch (e) {
    console.error(e);
    res.statusCode = 500; res.setHeader('Content-Type', 'application/json'); res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify({ error: e.message }));
  }
};
