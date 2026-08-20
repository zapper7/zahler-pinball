// Zahler Pinball edge worker.
// Static assets are served before this worker runs (Workers Assets default),
// so this only sees non-asset requests: the /beacon analytics endpoint and
// anything that would otherwise 404 (passed through to ASSETS for the real 404).
//
// /beacon collects first-party engagement events into Workers Analytics Engine
// (dataset zahler_events). Schema:
//   blobs:   [event, path, referrerHost, device, self("1" = flagged own device)]
//   doubles: [visibleSeconds, scrollDepthPercent]
//   indexes: [event]
// Events: "view" (sent once per pageview, on first hide/leave) and "signup"
// (sent when the newsletter form succeeds). No cookies, no user identifiers.

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/beacon' && request.method === 'POST') {
      try {
        const d = await request.json();
        const event = String(d.event || 'view').slice(0, 32);
        env.ZAHLER_EVENTS.writeDataPoint({
          blobs: [
            event,
            String(d.path || '/').slice(0, 256),
            String(d.ref || '').slice(0, 256),
            String(d.device || '').slice(0, 32),
            d.self === '1' ? '1' : '0',
          ],
          doubles: [Number(d.seconds) || 0, Number(d.scroll) || 0],
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
