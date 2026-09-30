// Zahler Pinball edge worker.
// Static assets are served before this worker runs (Workers Assets default),
// so this only sees non-asset requests: the /beacon analytics endpoint and
// anything that would otherwise 404 (passed through to ASSETS for the real 404).
//
// /beacon collects first-party engagement events into Workers Analytics Engine
// (dataset zahler_events). Schema:
//   blobs:   [event, path, referrerHost, device, self("1" = flagged own device),
//             country, browser, os, source, region, vid, hop, detail, entry]
//   doubles: [visibleSeconds, scrollDepthPercent, pageLoadMs]
//   indexes: [event]
// country comes from Cloudflare's edge (request.cf), browser/os from a light
// server-side User-Agent parse, source from the ?via= tag embedded in path.
// Events: "view" (sent once per pageview, on first hide/leave), "signup"
// (sent when the newsletter form succeeds; detail = form id) and "click" (internal
// link taps; detail = href). vid is a random per-visit tag kept in sessionStorage
// (gone when the tab closes). No cookies, no user identifiers.

function parseUA(ua) {
  let browser = 'other';
  if (/Edg\//.test(ua)) browser = 'Edge';
  else if (/OPR\/|Opera/.test(ua)) browser = 'Opera';
  else if (/SamsungBrowser/.test(ua)) browser = 'Samsung';
  else if (/Firefox\//.test(ua)) browser = 'Firefox';
  else if (/CriOS\//.test(ua)) browser = 'Chrome';
  else if (/Chrome\//.test(ua)) browser = 'Chrome';
  else if (/Safari\//.test(ua) && /Version\//.test(ua)) browser = 'Safari';
  let os = 'other';
  if (/iPhone|iPad|iPod/.test(ua)) os = 'iOS';
  else if (/Android/.test(ua)) os = 'Android';
  else if (/Mac OS X/.test(ua)) os = 'macOS';
  else if (/Windows/.test(ua)) os = 'Windows';
  else if (/CrOS/.test(ua)) os = 'ChromeOS';
  else if (/Linux/.test(ua)) os = 'Linux';
  return { browser, os };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    // plain-HTTP requests get a permanent redirect to HTTPS (belt to the
    // Cloudflare "Always Use HTTPS" suspenders; Google flagged http:// URLs)
    if (url.protocol === 'http:') {
      url.protocol = 'https:';
      url.hostname = 'zahlerpinball.com';
      return Response.redirect(url.toString(), 301);
    }
    // /feedback: players' ideas for our games (Steve 2026-09-30). Same Analytics Engine dataset, event "feedback";
    //   blobs: [event, game, kind, text (<= 1500 chars), device, self, country, browser, os, contact (optional), vid, level, source host]
    //   doubles: [rating (0 = none, 1..5), score]. The admin pulls these every few minutes. CORS open so the prototype
    //   on the admin host can post here too. A filled "website" field (bots) is dropped.
    if (url.pathname === '/feedback') {
      const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
      if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
      if (request.method !== 'POST') return new Response('POST only', { status: 405, headers: cors });
      try {
        const d = await request.json();
        const text = String(d.text || '').trim().slice(0, 1500);
        if (!text || d.website) return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } });
        const { browser, os } = parseUA(request.headers.get('User-Agent') || '');
        let src = '';
        try { src = new URL(request.headers.get('Origin') || request.headers.get('Referer') || '').host; } catch (e) {}
        env.ZAHLER_EVENTS.writeDataPoint({
          blobs: [
            'feedback',
            String(d.game || '').slice(0, 48),
            String(d.kind || 'idea').slice(0, 16),
            text,
            String(d.device || '').slice(0, 32),
            d.self === '1' ? '1' : '0',
            String((request.cf && request.cf.country) || '').slice(0, 8),
            browser,
            os,
            String(d.contact || '').slice(0, 120),
            String(d.vid || '').slice(0, 16),
            String(d.level || '').slice(0, 24),
            src.slice(0, 64),
          ],
          doubles: [Math.max(0, Math.min(5, Number(d.rating) || 0)), Number(d.score) || 0],
          indexes: ['feedback'],
        });
      } catch (e) {
        return new Response(JSON.stringify({ ok: false }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } });
    }
    if (url.pathname === '/beacon' && request.method === 'POST') {
      try {
        const d = await request.json();
        const event = String(d.event || 'view').slice(0, 32);
        const path = String(d.path || '/').slice(0, 256);
        const { browser, os } = parseUA(request.headers.get('User-Agent') || '');
        const country = (request.cf && request.cf.country) || '';
        const region = (request.cf && (request.cf.regionCode || request.cf.region)) || '';
        let source = '';
        const m = path.match(/[?&]via=([^&]+)/);
        if (m) source = decodeURIComponent(m[1]).slice(0, 32);
        env.ZAHLER_EVENTS.writeDataPoint({
          blobs: [
            event,
            path,
            String(d.ref || '').slice(0, 256),
            String(d.device || '').slice(0, 32),
            d.self === '1' ? '1' : '0',
            String(country).slice(0, 8),
            browser,
            os,
            source,
            String(region).slice(0, 32),
            String(d.vid || '').slice(0, 16),      // blob11: per-visit id (sessionStorage, no cookie)
            String(d.hop || '').slice(0, 4),       // blob12: pageview number within the visit
            String(d.detail || '').slice(0, 64),   // blob13: signup form id, or click target
            String(d.entry || '').slice(0, 64),    // blob14: first path of the visit
          ],
          doubles: [Number(d.seconds) || 0, Number(d.scroll) || 0, Number(d.load) || 0],
          indexes: [event],
        });
      } catch (e) {
        // malformed beacons are dropped silently; analytics must never break the site
      }
      return new Response(null, { status: 204 });
    }
    return env.ASSETS.fetch(request);
  },
};
