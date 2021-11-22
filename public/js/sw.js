/* jshint esversion: 8 */
/* jshint browser: true */
/* jshint curly: true */
/* jshint trailingcomma: true */
/* jshint unused: true */
/* jshint undef: true */
/* jshint varstmt: true */
/* jshint eqeqeq: true */
/* global self */
/* global caches */


const OFFLINE_VERSION = 1; // jshint ignore: line
const CACHE_NAME = 'offline';
const OFFLINE_URL = '/offline';
const SW_URL = '/sw.js';
const ICON_URL = '/public/favicon.svg';

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.add(new Request(OFFLINE_URL, {cache: 'reload',}));
    await cache.add(new Request(SW_URL, {cache: 'reload',}));
    await cache.add(new Request(ICON_URL, {cache: 'reload',}));
  })());
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    if ('navigationPreload' in self.registration) {
      await self.registration.navigationPreload.enable();
    }
  })());
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const preloadResponse = await event.preloadResponse;
        if (preloadResponse) {
          return preloadResponse;
        }
        const networkResponse = await fetch(event.request);
        return networkResponse;
      } catch (error) {
        const cache = await caches.open(CACHE_NAME);
        const cachedResponse = await cache.match(OFFLINE_URL);
        return cachedResponse;
      }
    })());
  }
});
