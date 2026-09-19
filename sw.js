// Service worker for full offline support. localStorage alone (the earlier
// approach) only covers the codes.json *data* — it does nothing for the
// HTML/CSS/JS "shell" itself. Without this, opening the installed app after
// weeks fully offline could still fail at the network level before any of
// that data-layer logic ever runs. This worker caches the shell (this site's
// own files + the Tailwind/Alpine CDN scripts they depend on) so the app
// boots from Cache Storage with zero network, then opportunistically caches
// anything else it sees (op-icons.json, the remote codes.json, etc.) via a
// stale-while-revalidate strategy: serve the cached copy instantly, refetch
// in the background to keep it fresh for next time.
const CACHE_NAME = 'banca-remota-v3';

// codes.json is precached here too (not just left to runtime interception) —
// on a brand-new install the page's own first fetch for it fires from
// Alpine's init() before this worker has even finished registering
// (registration only starts on the 'load' event, which fires later), so it's
// otherwise never controlled/cached and a subsequent fully-offline open has
// no data to show. Precaching it here closes that race.
const CODES_URL = 'https://raw.githubusercontent.com/albertolicea00/BancaRemota/refs/heads/main/BancaRemota/codes.json';

const PRECACHE_URLS = [
  '/',
  '/dial',
  '/style.css',
  '/app.js',
  '/op-icons.json',
  '/favicon.ico',
  '/assets/icon-black.png',
  '/assets/icon-white.png',
  '/assets/apps/qvacell-dark.png',
  '/assets/apps/qvacell-light.png',
  '/assets/apps/qvacell-alt.png',
  '/assets/apps/qvacell.png',
  '/assets/apps/casero-dark.png',
  '/assets/apps/casero-light.png',
  '/assets/apps/casero-alt.png',
  '/assets/apps/casero.png',
  '/assets/apps/llama99-dark.png',
  '/assets/apps/llama99-light.png',
  '/assets/apps/llama99-alt.png',
  '/assets/apps/llama99.png',
  '/assets/banks/bpa-icon.svg',
  '/assets/banks/bandec-icon.svg',
  '/assets/banks/bm-icon.svg',
  CODES_URL,
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // Per-URL try/catch: cleanUrls redirects, a flaky CDN, or a renamed
    // asset shouldn't sink the whole install.
    await Promise.all(PRECACHE_URLS.map(async (url) => {
      try {
        // Try a normal (cors) fetch first — needed to get a readable,
        // inspectable response for CORS-friendly hosts like GitHub raw
        // (codes.json is read as JSON by the page, so an opaque response
        // would be useless here). cache.add()/addAll() can't be used at all
        // for the no-cors fallback below — they throw on opaque responses
        // by spec — so this goes through fetch + cache.put uniformly.
        let response;
        try {
          response = await fetch(url);
          if (!response.ok) throw new Error('status ' + response.status);
          await cache.put(url, response);
        } catch (corsErr) {
          // Falls back to no-cors for cross-origin hosts with no
          // Access-Control-Allow-Origin header (e.g. cdn.tailwindcss.com),
          // where even the request above fails outright. Opaque response,
          // but fine for a <script>/<img> the page never reads via JS.
          const req = new Request(url, { mode: 'no-cors' });
          response = await fetch(req);
          await cache.put(req, response);
        }
      } catch (err) {
        console.warn('[sw] precache failed for', url, err);
      }
    }));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  const networkFetch = fetch(request).then((response) => {
    // Opaque (cross-origin, no-cors) responses are still cacheable/servable —
    // we just can't inspect their status, so cache them optimistically.
    if (response && (response.ok || response.type === 'opaque')) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => null);

  if (cached) {
    networkFetch; // refresh in the background, don't block the response
    return cached;
  }
  return (await networkFetch) || new Response('Sin conexión y sin copia en caché.', {
    status: 503,
    statusText: 'Offline',
  });
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  // Browser extensions (React/Vue devtools, etc.) inject their own
  // chrome-extension:// / moz-extension:// requests into the page context.
  // cache.put() throws on any non-http(s) scheme, so let those pass through
  // untouched instead of trying to cache them.
  const scheme = new URL(event.request.url).protocol;
  if (scheme !== 'http:' && scheme !== 'https:') return;
  event.respondWith(staleWhileRevalidate(event.request));
});
