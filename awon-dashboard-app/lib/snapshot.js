// Last good dataset kept in the project's private Vercel Blob store, so a fresh server instance can answer
// in about a second instead of rebuilding from all sources (40-90 s). Every write/read is best-effort.
const zlib = require('zlib');
const PATH = 'snapshots/dataset.json.gz';
let blob = null;
function sdk() { if (!blob) blob = require('@vercel/blob'); return blob; }
function configured() { return !!(process.env.BLOB_STORE_ID || process.env.BLOB_READ_WRITE_TOKEN); }

async function save(data) {
  if (!configured()) return false;
  const body = zlib.gzipSync(Buffer.from(JSON.stringify(data)));
  await sdk().put(PATH, body, { access: 'private', allowOverwrite: true, addRandomSuffix: false, contentType: 'application/gzip', cacheControlMaxAge: 60 });
  return body.length;
}

async function load() {
  if (!configured()) return null;
  const r = await sdk().get(PATH, { access: 'private', useCache: false });
  if (!r || r.statusCode !== 200 || !r.stream) return null;
  const buf = Buffer.from(await new Response(r.stream).arrayBuffer());
  return JSON.parse(zlib.gunzipSync(buf).toString('utf8'));
}

module.exports = { save, load, configured };
