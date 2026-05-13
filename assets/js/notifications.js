/* إدارة إشعارات الأذكار الدورية */
(function () {
  const KEY = 'gt-hisn-notifications';
  const DEFAULT = { enabled: false, interval: 30 }; // دقيقة

  function load() {
    try { return { ...DEFAULT, ...JSON.parse(localStorage.getItem(KEY)) }; }
    catch { return { ...DEFAULT }; }
  }
  function save(cfg) { localStorage.setItem(KEY, JSON.stringify(cfg)); }

  let _timer = null;

  async function requestPermission() {
    if (!('Notification' in window)) return 'unsupported';
    if (Notification.permission === 'granted') return 'granted';
    if (Notification.permission === 'denied') return 'denied';
    return await Notification.requestPermission();
  }

  async function showRandomNotification() {
    if (Notification.permission !== 'granted') return;
    try {
      const idx = await window.GTData.loadIndex();
      if (!idx || !idx.length) return;
      const cat = idx[Math.floor(Math.random() * idx.length)];
      const data = await window.GTData.loadCategory(cat.file);
      if (!data || !data.array.length) return;
      const dua = data.array[Math.floor(Math.random() * data.array.length)];
      const text = dua.text.replace(/﴿|﴾|\(\(|\)\)/g, '').slice(0, 140);
      new Notification('📿 حصن المسلم — ' + data.category, {
        body: text,
        icon: 'assets/icons/icon-192.png',
        badge: 'assets/icons/icon-192.png',
        tag: 'gt-hisn-dhikr',
        renotify: true,
        dir: 'rtl',
        lang: 'ar',
      });
    } catch { /* تجاهل */ }
  }

  function stop() {
    clearInterval(_timer);
    _timer = null;
  }

  function start(intervalMinutes) {
    stop();
    const ms = Math.max(1, intervalMinutes) * 60 * 1000;
    _timer = setInterval(showRandomNotification, ms);
  }

  async function apply(cfg) {
    if (!cfg.enabled) { stop(); return; }
    const perm = await requestPermission();
    if (perm !== 'granted') { stop(); return; }
    start(cfg.interval);
  }

  /* تهيئة عند تحميل الصفحة */
  document.addEventListener('DOMContentLoaded', () => {
    const cfg = load();
    // إظهار حالة في النافذة
    syncUI(cfg);
    // تشغيل إن كان مفعّلاً
    if (cfg.enabled) apply(cfg);

    // زر حفظ
    document.getElementById('save-notifications-btn')
      ?.addEventListener('click', async () => {
        const enabled = document.getElementById('notif-enabled')?.checked ?? false;
        const interval = parseInt(document.getElementById('notif-interval')?.value, 10) || 30;
        const cfg = { enabled, interval };
        save(cfg);
        await apply(cfg);
        // إغلاق النافذة
        document.getElementById('notifications-modal')?.classList.remove('open');
        if (window.GTPwa?.showToast) {
          window.GTPwa.showToast(enabled ? '🔔 الإشعارات مفعّلة' : '🔕 الإشعارات موقفة');
        }
      });
  });

  function syncUI(cfg) {
    const chk = document.getElementById('notif-enabled');
    const inp = document.getElementById('notif-interval');
    const status = document.getElementById('notif-perm-status');
    if (chk) chk.checked = cfg.enabled;
    if (inp) inp.value = cfg.interval;
    if (status) {
      const perm = ('Notification' in window) ? Notification.permission : 'unsupported';
      const map = { granted: '✅ مسموح', denied: '❌ محظور (غيّر إعدادات المتصفح)', default: '⏳ لم يُحدَّد بعد', unsupported: '⚠️ المتصفح لا يدعم الإشعارات' };
      status.textContent = map[perm] ?? perm;
    }
  }

  /* تحديث UI عند فتح النافذة */
  function openModal() {
    const cfg = load();
    syncUI(cfg);
  }

  window.GTNotifications = { load, save, apply, openModal, showRandomNotification };
})();
