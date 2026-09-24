# Awon live dashboard (Vercel)

Performance tab (CPK north star, marketing + logistics vs prorated forecast, paid platforms, cities, trend)
and Donor map tab (Odoo orders by district). English / Arabic. Auto-refresh every 5 minutes.

## Deploy
Option A: Vercel CLI (from this folder):
    npm i -g vercel
    vercel link          # pick team "loopsa2030-7141's projects" → existing project "awon-live-dashboard"
    vercel --prod

Option B: GitHub: push this folder to a private repo, then Vercel → awon-live-dashboard → Settings → Git → Connect.

Project settings: Framework = Other, Output directory = public, no build command.

## Environment variables (already added)
DASHBOARD_PASSWORD (username: awon) · GOOGLE_SERVICE_ACCOUNT_JSON · ODOO_LOGIN · ODOO_API_KEY · SUPERMETRICS_API_KEY
ODOO_DB (Odoo database name; see below), ADS_FX_TO_USD, MTD_FILE_ID, FORECAST_FILE_ID, FIRST_MONTH (default 2026-02).

## Health check
/api/status → shows which sources connect and which month tabs were detected for the current month.

## Odoo database name
If the map shows `database "…" does not exist`, set ODOO_DB. To find it: log in to Odoo, then open
https://loopksa-odoo.odoo.com/web/session/get_session_info: copy the value of "db".
