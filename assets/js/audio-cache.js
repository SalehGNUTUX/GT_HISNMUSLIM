/* تخزين الصوت عند الطلب باستخدام Cache API (يستخدمه Service Worker لخدمة الصوت أوفلاين) */
(function () {
  const CACHE_NAME = 'gt-hisn-audio-v1';

  async function isCached(url) {
    if (!('caches' in window) || !url) return false;
    try {
      const cache = await caches.open(CACHE_NAME);
      const match = await cache.match(url);
      return !!match;
    } catch { return false; }
  }

  async function saveAudio(url) {
    if (!('caches' in window) || !url) return false;
    try {
      const cache = await caches.open(CACHE_NAME);
      const res = await fetch(url, { mode: 'cors' });
      if (!res.ok) throw new Error('audio fetch failed');
      await cache.put(url, res.clone());
      return true;
    } catch (e) {
      console.warn('فشل تخزين الصوت', e);
      return false;
    }
  }

  async function removeAudio(url) {
    if (!('caches' in window)) return;
    try {
      const cache = await caches.open(CACHE_NAME);
      await cache.delete(url);
    } catch { /* تجاهل */ }
  }

  async function listCached() {
    if (!('caches' in window)) return [];
    try {
      const cache = await caches.open(CACHE_NAME);
      const keys = await cache.keys();
      return keys.map(r => r.url);
    } catch { return []; }
  }

  async function clearAll() {
    if (!('caches' in window)) return;
    await caches.delete(CACHE_NAME);
  }

  window.GTAudio = { isCached, saveAudio, removeAudio, listCached, clearAll, CACHE_NAME };
})();
