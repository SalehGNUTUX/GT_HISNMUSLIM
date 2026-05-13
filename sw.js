/* Service Worker — حصن المسلم GT-HISNMUSLIM
   - قشرة التطبيق: cache-first
   - بيانات الأذكار JSON: stale-while-revalidate
   - الخطوط/أيقونات CDN: cache-first
   - الصوت: تقدم من cache إن وجد (المستخدم يضيفه عمداً)
*/

const VERSION = 'v1.0.0';
const SHELL_CACHE   = `gt-hisn-shell-${VERSION}`;
const DATA_CACHE    = `gt-hisn-data-${VERSION}`;
const RUNTIME_CACHE = `gt-hisn-runtime-${VERSION}`;
const AUDIO_CACHE   = 'gt-hisn-audio-v1';

const SHELL_ASSETS = [
  './',
  'index.html',
  'manifest.webmanifest',
  'assets/css/styles.css',
  'assets/js/theme.js',
  'assets/js/data.js',
  'assets/js/bookmarks.js',
  'assets/js/audio-cache.js',
  'assets/js/pwa.js',
  'assets/js/notifications.js',
  'assets/js/app.js',
  'assets/icons/icon.svg',
  'assets/icons/icon-192.png',
  'assets/icons/icon-512.png',
  'assets/data/index.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then(c => c.addAll(SHELL_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => {
      if (![SHELL_CACHE, DATA_CACHE, RUNTIME_CACHE, AUDIO_CACHE].includes(k)) {
        return caches.delete(k);
      }
    }));
    await self.clients.claim();
  })());
});

function sameOrigin(url) { return new URL(url).origin === self.location.origin; }

function isShellAsset(url) {
  if (!sameOrigin(url)) return false;
  const path = new URL(url).pathname;
  return SHELL_ASSETS.some(a => path.endsWith(a.replace(/^\.\//, '')));
}

function isCategoryData(url) {
  if (!sameOrigin(url)) return false;
  return /\/assets\/data\/(categories\/\d+\.json|index\.json)$/.test(new URL(url).pathname);
}

function isAudio(url) {
  return /\.(mp3|m4a|ogg|wav)(\?|$)/i.test(url);
}

function isFont(url) {
  return /fonts\.(googleapis|gstatic)\.com/.test(url) ||
         /cdnjs\.cloudflare\.com\/.*font-?awesome/i.test(url);
}

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  if (cached) return cached;
  try {
    const res = await fetch(req);
    if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
    return res;
  } catch (e) {
    return cached || Response.error();
  }
}

async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  const fetchPromise = fetch(req).then(res => {
    if (res.ok) cache.put(req, res.clone());
    return res;
  }).catch(() => cached);
  return cached || fetchPromise;
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = req.url;

  // الصوت: cache-only-if-saved (لا نلوّث الكاش تلقائياً)
  if (isAudio(url)) {
    event.respondWith((async () => {
      const cached = await caches.match(req);
      if (cached) return cached;
      return fetch(req).catch(() => new Response('', { status: 504 }));
    })());
    return;
  }

  // بيانات الأقسام: stale-while-revalidate
  if (isCategoryData(url)) {
    event.respondWith(staleWhileRevalidate(req, DATA_CACHE));
    return;
  }

  // قشرة التطبيق
  if (isShellAsset(url)) {
    event.respondWith(cacheFirst(req, SHELL_CACHE));
    return;
  }

  // الخطوط/أيقونات CDN
  if (isFont(url)) {
    event.respondWith(cacheFirst(req, RUNTIME_CACHE));
    return;
  }

  // ملاح: لطلبات HTML الأخرى، حاول الشبكة وارجع لقشرة index.html
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const res = await fetch(req);
        return res;
      } catch {
        const cache = await caches.open(SHELL_CACHE);
        return (await cache.match('index.html')) || (await cache.match('./')) || Response.error();
      }
    })());
    return;
  }

  // الباقي: شبكة أولاً ثم كاش وقت التشغيل
  event.respondWith((async () => {
    try {
      const res = await fetch(req);
      if (res.ok && sameOrigin(url)) {
        const cache = await caches.open(RUNTIME_CACHE);
        cache.put(req, res.clone());
      }
      return res;
    } catch {
      const cached = await caches.match(req);
      return cached || Response.error();
    }
  })());
});

// رسائل من العميل (لإدارة التخزين)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});
