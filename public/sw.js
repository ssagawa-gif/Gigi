// GiGi service worker: only one job — receive a lab report shared from another app
// (e.g. WhatsApp → Share → GiGi) and hand it to the upload screen. Nothing leaves the phone.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'POST' || !url.pathname.endsWith('/share-target')) return;
  event.respondWith((async () => {
    const form = await event.request.formData();
    const file = form.get('report');
    if (file && file.size) {
      const cache = await caches.open('gigi-share');
      await cache.put('shared-report', new Response(file, { headers: { 'Content-Type': file.type || 'application/pdf', 'X-Name': encodeURIComponent(file.name || 'report.pdf') } }));
    }
    return Response.redirect(new URL('./#/add/upload?shared=1', self.registration.scope).href, 303);
  })());
});
