/* Service worker — offline en patio, pero sin quedarse pegado en versiones viejas */
const VERSION = 'v15-2026-08-20';
const CACHE = 'levantamiento-patio-' + VERSION;
const LIBS = [
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js'
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE)
    .then(c => Promise.all(['./','./index.html','./manifest.json',...LIBS].map(u => c.add(u).catch(()=>null))))
    .then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('message', e => { if(e.data === 'skipWaiting') self.skipWaiting(); });

self.addEventListener('fetch', e => {
  if(e.request.method !== 'GET') return;
  const esApp = e.request.mode === 'navigate' || e.request.url.includes('index.html') || e.request.url.includes('padron.json');
  if(esApp){
    /* La app: primero red (para traer la última versión), caché si no hay señal */
    e.respondWith(
      fetch(e.request).then(res => {
        const copia = res.clone();
        const clave = e.request.mode === 'navigate' ? './index.html' : e.request;
        caches.open(CACHE).then(c => c.put(clave, copia)).catch(()=>{});
        return res;
      }).catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
    );
    return;
  }
  /* Librerías e iconos: caché primero, son fijos */
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      const copia = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copia)).catch(()=>{});
      return res;
    }).catch(() => hit))
  );
});
