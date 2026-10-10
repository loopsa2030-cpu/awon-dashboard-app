const todayKSA = () => new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 10);
const isDate = s => /^\d{4}-\d{2}-\d{2}$/.test(s || '');
function range(req) {
  const q = new URL(req.url, 'http://x').searchParams;
  const to = isDate(q.get('to')) ? q.get('to') : todayKSA();
  const from = isDate(q.get('from')) ? q.get('from') : to.slice(0, 8) + '01';
  return { from: from <= to ? from : to, to };
}
function send(res, status, body, maxAge = 300) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', status === 200 ? 'no-cache' : 'no-store');
  if (status === 200) res.setHeader('Vercel-CDN-Cache-Control', `max-age=${maxAge}, stale-while-revalidate=86400`);
  res.end(JSON.stringify(body));
}
module.exports = { range, send, todayKSA };
