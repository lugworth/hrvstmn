// Minimal cross-origin-isolation service worker.
// SharedArrayBuffer requires COOP/COEP headers. Static hosts (e.g. GitHub Pages)
// can't set them, so this worker re-serves every response with them added.
// Loaded twice: as a page script (registers itself) and as the service worker.
if (typeof window === 'undefined') {
  self.addEventListener('install', () => self.skipWaiting());
  self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
  self.addEventListener('fetch', (e) => {
    const req = e.request;
    if (req.cache === 'only-if-cached' && req.mode !== 'same-origin') return;
    e.respondWith(
      fetch(req).then((res) => {
        if (res.status === 0) return res; // opaque: can't rewrite
        const headers = new Headers(res.headers);
        headers.set('Cross-Origin-Opener-Policy', 'same-origin');
        headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
        headers.set('Cross-Origin-Resource-Policy', 'cross-origin');
        return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
      })
    );
  });
} else if (!window.crossOriginIsolated && window.isSecureContext && 'serviceWorker' in navigator) {
  const KEY = 'hrvstmn-coi-reload';
  navigator.serviceWorker.register(document.currentScript.src).then((reg) => {
    const reload = () => {
      // Guard against reload loops if isolation still fails after one try.
      if (sessionStorage.getItem(KEY)) return;
      sessionStorage.setItem(KEY, '1');
      location.reload();
    };
    if (reg.active && !navigator.serviceWorker.controller) reload();
    navigator.serviceWorker.addEventListener('controllerchange', reload);
  }).catch((err) => console.warn('coi-serviceworker registration failed:', err));
} else if (window.crossOriginIsolated) {
  try { sessionStorage.removeItem('hrvstmn-coi-reload'); } catch (_) { /* ignore */ }
}
