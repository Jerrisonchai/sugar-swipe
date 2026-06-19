const CACHE = 'sugar-swipe-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/css/main.css',
  '/css/animations.css',
  '/css/candy-designs.css',
  '/data/levels.json',
  '/js/storage.js',
  '/js/scoring.js',
  '/js/levels.js',
  '/js/board.js',
  '/js/match-engine.js',
  '/js/special.js',
  '/js/obstacles.js',
  '/js/audio.js',
  '/js/cascade.js',
  '/js/input.js',
  '/js/ui.js',
  '/js/shop.js',
  '/js/social.js',
  '/js/events.js',
  '/js/main.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});
