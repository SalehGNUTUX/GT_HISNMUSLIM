/* تسجيل Service Worker وإدارة زر التثبيت ولافتة عدم الاتصال */
(function () {
  // ------ تسجيل SW ------
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js')
        .then(reg => {
          // تحديث صامت
          reg.addEventListener('updatefound', () => {
            const installing = reg.installing;
            if (!installing) return;
            installing.addEventListener('statechange', () => {
              if (installing.state === 'installed' && navigator.serviceWorker.controller) {
                showToast('🔄 تحديث جديد متاح، حدّث الصفحة');
              }
            });
          });
        })
        .catch(err => console.warn('فشل تسجيل SW', err));
    });
  }

  // ------ زر التثبيت ------
  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const pill = document.getElementById('install-pill');
    if (pill) pill.classList.add('show');
  });

  document.addEventListener('DOMContentLoaded', () => {
    const pill = document.getElementById('install-pill');
    if (pill) {
      pill.addEventListener('click', async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') pill.classList.remove('show');
        deferredPrompt = null;
      });
    }
  });

  window.addEventListener('appinstalled', () => {
    const pill = document.getElementById('install-pill');
    if (pill) pill.classList.remove('show');
    showToast('✅ تم تثبيت التطبيق');
  });

  // ------ حالة الاتصال ------
  function syncOnlineState() {
    const banner = document.getElementById('offline-banner');
    if (!banner) return;
    if (navigator.onLine) banner.classList.remove('show');
    else banner.classList.add('show');
  }
  window.addEventListener('online', syncOnlineState);
  window.addEventListener('offline', syncOnlineState);
  document.addEventListener('DOMContentLoaded', syncOnlineState);

  // ------ مساعد إشعار toast بسيط ------
  function showToast(msg, ms = 2400) {
    let toast = document.getElementById('app-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'app-toast';
      toast.className = 'toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => toast.classList.remove('show'), ms);
  }
  window.GTPwa = { showToast };
})();
