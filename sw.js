/* KaamWala Service Worker — offline cache */
const CACHE_NAME = 'kaamwala-v2';
const urlsToCache = [
  '/kaamwala/',
  '/kaamwala/index.html',
  '/kaamwala/app.html',
  '/kaamwala/app.css',
  '/kaamwala/app.js',
  '/kaamwala/auth.html',
  '/kaamwala/auth.js',
  '/kaamwala/fb-data.js',
  '/kaamwala/favicon.svg',
  '/kaamwala/manifest.json'
];

self.addEventListener('install', function(event){
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.addAll(urlsToCache).catch(function(err){
        console.log('Cache partial:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(event){
  event.waitUntil(
    caches.keys().then(function(names){
      return Promise.all(
        names.filter(function(n){ return n !== CACHE_NAME; })
             .map(function(n){ return caches.delete(n); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(event){
  // Skip non-GET and cross-origin
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(function(cached){
      var fetchPromise = fetch(event.request).then(function(response){
        // Cache only successful same-origin responses
        if (response && response.status === 200 && response.type === 'basic'){
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache){
            cache.put(event.request, clone);
          });
        }
        return response;
      }).catch(function(){
        return cached;
      });
      return cached || fetchPromise;
    })
  );
});
