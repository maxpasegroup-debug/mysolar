/* Phase 7: public, invariant static assets only. No API or document/session response caching. */
const CACHE='mysolar-static-v9-1';
const STATIC=new Set(['/offline.html','/offline.css','/assets/app-mark.svg','/assets/app-192.png','/assets/app-512.png','/assets/apple-touch-icon.png','/manifest.webmanifest','/styles.css','/accounts.css','/organization.css','/marketplace.css','/purchase.css','/operations.css','/experience.css','/sia.css','/src/sia.js','/commercial.css','/src/commercial.js','/src/locale.js','/src/journey.js','/src/account.js','/src/organization.js','/src/marketplace.js','/src/purchase.js','/src/operations.js','/src/experience.js','/src/pwa.js','/src/app.js']);
self.addEventListener('install',event=>{event.waitUntil((async()=>{const cache=await caches.open(CACHE);await cache.addAll(['/offline.html','/offline.css','/assets/app-mark.svg']);})());});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith('mysolar-static-')&&key!==CACHE)await caches.delete(key);await self.clients.claim();})());});
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);if(request.method!=='GET'||url.origin!==self.location.origin||url.pathname==='/api'||url.pathname.startsWith('/api/')||url.search)return;
 if(request.mode==='navigate'){event.respondWith(fetch(request).catch(async()=>{let fallback;try{fallback=await caches.match('/offline.html',{cacheName:CACHE});}catch{}return fallback||new Response('MY SOLAR needs a connection.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});}));return;}
 if(!STATIC.has(url.pathname))return;
 event.respondWith((async()=>{let cache;try{cache=await caches.open(CACHE);}catch{}try{const response=await fetch(request,{cache:'no-store'});if(cache&&response.ok&&response.type==='basic')try{await cache.put(url.pathname,response.clone());}catch{}return response;}catch(error){const stored=cache?await cache.match(url.pathname):null;if(stored)return stored;throw error;}})());
});
