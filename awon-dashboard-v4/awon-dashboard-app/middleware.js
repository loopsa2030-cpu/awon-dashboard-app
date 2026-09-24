// Password gate for the whole site (Vercel Routing Middleware; works without Next.js).
// Set DASHBOARD_PASSWORD (and optionally DASHBOARD_USER, default "awon") in Vercel env vars.
import { next } from '@vercel/functions';

export const config = { matcher: '/((?!favicon|_vercel).*)' };

export default function middleware(request) {
  const url = new URL(request.url);
  if (url.pathname === '/api/geocode') return next();          // token-protected helper
  const pass = process.env.DASHBOARD_PASSWORD;
  if (!pass) {
    return new Response(
      '<!doctype html><meta charset="utf-8"><title>Awon dashboard - setup</title><body style="font-family:system-ui;padding:40px;color:#1d4a4f;background:#e9fdfb">' +
      '<h1>Almost there</h1><p>Set the <b>DASHBOARD_PASSWORD</b> environment variable in Vercel (Project, Settings, Environment Variables) and redeploy.</p>' +
      '<p dir="rtl">أضف متغير البيئة <b>DASHBOARD_PASSWORD</b> في إعدادات المشروع على Vercel ثم أعد النشر.</p></body>',
      { status: 503, headers: { 'content-type': 'text/html; charset=utf-8' } });
  }
  const user = process.env.DASHBOARD_USER || 'awon';
  const h = request.headers.get('authorization') || '';
  if (h.startsWith('Basic ')) {
    const [u, p] = atob(h.slice(6)).split(':');
    if (u === user && p === pass) return next();
  }
  return new Response('Authentication required', { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="Awon dashboard", charset="UTF-8"' } });
}
