// Reads the two Drive workbooks with a service account (env GOOGLE_SERVICE_ACCOUNT_JSON).
// The MTD file is an .xlsx stored in Drive (downloaded as-is); the Forecast file is a native
// Google Sheet (exported to .xlsx). Both are parsed with SheetJS, only the tabs we need.
const { GoogleAuth } = require('google-auth-library');
const XLSX = require('xlsx');

const MTD_FILE_ID = process.env.MTD_FILE_ID || '16U3UFk7Igj6k_j8kOThXWf605jLxjduX';
const FORECAST_FILE_ID = process.env.FORECAST_FILE_ID || '1ixZTANNh4jxGUXckOJT0exK2oAkPfV22SNoB02FVAMk';
const TTL = 10 * 60 * 1000;
const cache = new Map();

function configured() { return !!process.env.GOOGLE_SERVICE_ACCOUNT_JSON; }

let authClient;
async function client() {
  if (authClient) return authClient;
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON.trim();
  let creds;
  try { creds = JSON.parse(raw.startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8')); }
  catch (e) { throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON - paste the whole key file, from { to }.'); }
  const auth = new GoogleAuth({ credentials: creds, scopes: ['https://www.googleapis.com/auth/drive.readonly'] });
  authClient = await auth.getClient();
  return authClient;
}

async function fetchBytes(fileId, exportXlsx) {
  const c = await client();
  const url = exportXlsx
    ? `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=application%2Fvnd.openxmlformats-officedocument.spreadsheetml.sheet`
    : `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&supportsAllDrives=true`;
  const res = await c.request({ url, responseType: 'arraybuffer' });
  return Buffer.from(res.data);
}
async function modifiedTime(fileId) {
  const c = await client();
  const res = await c.request({ url: `https://www.googleapis.com/drive/v3/files/${fileId}?fields=modifiedTime,name&supportsAllDrives=true` });
  return res.data;
}

// Returns { sheetNames, read(tabNames) -> {name: worksheet}, modified }
async function workbook(which) {
  const id = which === 'mtd' ? MTD_FILE_ID : FORECAST_FILE_ID;
  const hit = cache.get(which);
  if (hit && Date.now() - hit.at < TTL) return hit.value;
  const meta = await modifiedTime(id);
  if (hit && hit.value.modified === meta.modifiedTime) { hit.at = Date.now(); return hit.value; }
  const buf = await fetchBytes(id, which === 'forecast');
  const names = XLSX.read(buf, { type: 'buffer', bookSheets: true }).SheetNames;
  const tabCache = {};
  const value = {
    modified: meta.modifiedTime, fileName: meta.name, sheetNames: names,
    read(tabs) {
      const need = tabs.filter(t => t && !tabCache[t]);
      if (need.length) {
        const wb = XLSX.read(buf, { type: 'buffer', cellDates: true, sheets: need });
        need.forEach(t => { tabCache[t] = wb.Sheets[t]; });
      }
      return Object.fromEntries(tabs.filter(Boolean).map(t => [t, tabCache[t]]));
    },
  };
  cache.set(which, { at: Date.now(), value });
  return value;
}

async function request(url) { const c = await client(); const res = await c.request({ url }); return res.data; }

module.exports = { workbook, configured, request, MTD_FILE_ID, FORECAST_FILE_ID };
