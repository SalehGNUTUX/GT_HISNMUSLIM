/* إدارة سمة العرض (فاتح/داكن) — يقرأ تفضيل النظام إذا لم يحدد المستخدم */
(function () {
  const KEY = 'gt-hisn-theme';
  const root = document.documentElement;

  function apply(theme) {
    root.setAttribute('data-theme', theme);
    const btn = document.getElementById('theme-toggle');
    if (btn) {
      const icon = btn.querySelector('i');
      if (icon) icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
      btn.title = theme === 'dark' ? 'الوضع الفاتح' : 'الوضع الداكن';
    }
  }

  function detectInitial() {
    const saved = localStorage.getItem(KEY);
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function toggle() {
    const current = root.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    localStorage.setItem(KEY, next);
    apply(next);
  }

  apply(detectInitial());

  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('theme-toggle');
    if (btn) {
      apply(root.getAttribute('data-theme'));
      btn.addEventListener('click', toggle);
    }

    // مزامنة مع تغيير تفضيل النظام إذا لم يحدد المستخدم خياراً
    if (!localStorage.getItem(KEY)) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem(KEY)) apply(e.matches ? 'dark' : 'light');
      });
    }
  });

  window.GTTheme = { apply, toggle };
})();
