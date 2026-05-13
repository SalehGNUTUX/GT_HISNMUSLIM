/* التطبيق الرئيسي — يربط الفهرس والعرض والبحث والتفاعلات */
(function () {
  const els = {
    main: null,
    tabsBar: null,
    searchInput: null,
    randomCard: null,
    randomText: null,
    randomCat: null,
    randomRefresh: null,
    scrollTop: null,
    menuBtn: null,
    menu: null,
  };

  const state = {
    index: [],
    activeTab: 'all',          // 'all' | 'favorites' | 'custom' | <id:number>
    openSections: new Set(),   // معرفات الأقسام المفتوحة في العرض "الكل"
    searchTerm: '',
    searchTimer: null,
  };

  // ----- أدوات صغيرة -----
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const escape = (s) => String(s ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));

  function toast(msg, ms) {
    if (window.GTPwa?.showToast) window.GTPwa.showToast(msg, ms);
  }

  // ----- بناء HTML -----
  function tplDuaCard(dua, categoryName, catId) {
    const isFav = window.GTBookmarks.isFavorite(catId, dua.id);
    return `
      <article class="dua-card" data-cat="${catId}" data-dua="${dua.id}">
        <p class="dua-text">${escape(dua.text)}</p>
        ${dua.audio ? `
          <div class="audio-row">
            <audio controls preload="none" src="${escape(dua.audio)}"></audio>
            <button class="save-audio" type="button" data-url="${escape(dua.audio)}"
              title="تخزين الصوت للاستخدام بدون نت">
              <i class="fas fa-download"></i>
            </button>
          </div>` : ''}
        <div class="dua-meta">
          ${dua.count && dua.count > 1
            ? `<span class="count-pill"><i class="fas fa-redo"></i> ${dua.count} مرّات</span>`
            : `<span class="count-pill"><i class="fas fa-check"></i> مرة واحدة</span>`}
          <span class="spacer"></span>
          <button class="action-btn fav-btn ${isFav ? 'is-fav' : ''}" type="button" title="حفظ في المفضلة">
            <i class="${isFav ? 'fas' : 'far'} fa-heart"></i>
            <span>${isFav ? 'محفوظ' : 'حفظ'}</span>
          </button>
          <button class="action-btn copy-btn" type="button" title="نسخ النص">
            <i class="far fa-copy"></i> <span>نسخ</span>
          </button>
        </div>
      </article>`;
  }

  function tplSectionHead(cat, isOpen) {
    return `
      <header class="section-head ${isOpen ? 'open' : ''}" data-section-id="${cat.id}">
        <span class="sh-icon">${cat.icon || '🕌'}</span>
        <h2 class="sh-title">${escape(cat.category)}</h2>
        <span class="sh-meta">${cat.count} ${cat.count === 1 ? 'دعاء' : 'أدعية'}</span>
        <i class="fas fa-chevron-down sh-chevron"></i>
      </header>
      <div class="section-body" data-section-body="${cat.id}" ${isOpen ? '' : 'hidden'}>
        ${isOpen ? '<div class="loader"><div class="spinner"></div></div>' : ''}
      </div>`;
  }

  // ----- التبويبات -----
  function renderTabs() {
    const items = [
      { id: 'all', label: 'الكل', icon: '🏠' },
      { id: 'favorites', label: 'المفضلة', icon: '❤️' },
      { id: 'custom', label: 'أذكاري', icon: '✍️' },
      ...state.index.map(c => ({ id: c.id, label: c.category, icon: c.icon, count: c.count })),
    ];
    els.tabsBar.innerHTML = items.map(it => `
      <button class="tab-chip ${state.activeTab == it.id ? 'active' : ''}" data-tab="${it.id}">
        <span>${it.icon}</span>
        <span>${escape(it.label)}</span>
        ${it.count ? `<span class="badge">${it.count}</span>` : ''}
      </button>
    `).join('');
  }

  function setActiveTab(tabId) {
    state.activeTab = tabId;
    $$('.tab-chip', els.tabsBar).forEach(b => {
      b.classList.toggle('active', String(b.dataset.tab) === String(tabId));
    });
    // مرر التبويب النشط إلى داخل المنطقة المرئية
    const active = $('.tab-chip.active', els.tabsBar);
    if (active) active.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }

  // ----- العرض -----
  async function renderAll() {
    // يعرض رؤوس الأقسام فقط (دون محتوى) وأقسام مفتوحة عند الطلب
    const html = state.index.map(c => tplSectionHead(c, state.openSections.has(c.id))).join('');
    els.main.innerHTML = `<div id="random-mount"></div>` + html;
    mountRandomCard();
    // فعّل الأقسام المفتوحة المحفوظة
    for (const id of state.openSections) await loadSectionBody(id);
  }

  async function loadSectionBody(catId) {
    const body = els.main.querySelector(`[data-section-body="${catId}"]`);
    if (!body) return;
    body.innerHTML = '<div class="loader"><div class="spinner"></div></div>';
    try {
      const cat = await window.GTData.loadCategory(Number(catId));
      body.innerHTML = cat.array.map(d => tplDuaCard(d, cat.category, cat.id)).join('');
    } catch (e) {
      body.innerHTML = '<div class="placeholder"><i class="fas fa-exclamation-triangle ph-icon"></i><h3>تعذّر التحميل</h3><p>تحقق من الاتصال ثم حاول مرة أخرى</p></div>';
    }
  }

  async function renderCategory(catId) {
    els.main.innerHTML = '<div class="loader"><div class="spinner"></div></div>';
    try {
      const cat = await window.GTData.loadCategory(Number(catId));
      const idxEntry = state.index.find(c => c.id === cat.id) || {};
      els.main.innerHTML = `
        <header class="section-head open" data-section-id="${cat.id}" data-single="1">
          <span class="sh-icon">${idxEntry.icon || '🕌'}</span>
          <h2 class="sh-title">${escape(cat.category)}</h2>
          <span class="sh-meta">${cat.array.length} ${cat.array.length === 1 ? 'دعاء' : 'أدعية'}</span>
        </header>
        <div class="section-body">${cat.array.map(d => tplDuaCard(d, cat.category, cat.id)).join('')}</div>`;
    } catch (e) {
      els.main.innerHTML = '<div class="placeholder"><i class="fas fa-exclamation-triangle ph-icon"></i><h3>تعذّر التحميل</h3></div>';
    }
  }

  function renderFavorites() {
    const favs = window.GTBookmarks.getFavorites();
    if (!favs.length) {
      els.main.innerHTML = `
        <div class="placeholder">
          <i class="far fa-heart ph-icon"></i>
          <h3>لا توجد مفضلات بعد</h3>
          <p>اضغط على ♡ في أي ذكر لإضافته هنا</p>
        </div>`;
      return;
    }
    const cards = favs.map(f => `
      <article class="dua-card" data-cat="${f.catId}" data-dua="${f.duaId}">
        <p class="dua-text">${escape(f.text)}</p>
        ${f.audio ? `
          <div class="audio-row">
            <audio controls preload="none" src="${escape(f.audio)}"></audio>
            <button class="save-audio" type="button" data-url="${escape(f.audio)}"><i class="fas fa-download"></i></button>
          </div>` : ''}
        <div class="dua-meta">
          <span class="count-pill"><i class="fas fa-bookmark"></i> ${escape(f.category)}</span>
          <span class="spacer"></span>
          <button class="action-btn fav-btn is-fav" type="button"><i class="fas fa-heart"></i> إزالة</button>
          <button class="action-btn copy-btn" type="button"><i class="far fa-copy"></i> نسخ</button>
        </div>
      </article>
    `).join('');
    els.main.innerHTML = `
      <header class="section-head open">
        <span class="sh-icon">❤️</span>
        <h2 class="sh-title">المفضلة</h2>
        <span class="sh-meta">${favs.length} ${favs.length === 1 ? 'ذكر' : 'أذكار'}</span>
      </header>
      <div class="section-body">${cards}</div>`;
  }

  function renderCustom() {
    const list = window.GTBookmarks.getCustom();
    if (!list.length) {
      els.main.innerHTML = `
        <div class="placeholder">
          <i class="fas fa-feather-pointed ph-icon"></i>
          <h3>أذكارك المخصصة</h3>
          <p>اضغط على زر "إضافة ذكر" في القائمة لإنشاء أوّل ذكر</p>
        </div>`;
      return;
    }
    const cards = list.map(c => `
      <article class="dua-card" data-custom="${c.id}">
        ${c.title ? `<h3 style="margin:0 0 10px;color:var(--brand);">${escape(c.title)}</h3>` : ''}
        <p class="dua-text">${escape(c.text)}</p>
        ${c.audio ? `
          <div class="audio-row">
            <audio controls preload="none" src="${escape(c.audio)}"></audio>
            <button class="save-audio" type="button" data-url="${escape(c.audio)}"><i class="fas fa-download"></i></button>
          </div>` : ''}
        <div class="dua-meta">
          ${c.count > 1 ? `<span class="count-pill"><i class="fas fa-redo"></i> ${c.count} مرّات</span>` : ''}
          <span class="spacer"></span>
          <button class="action-btn copy-btn" type="button"><i class="far fa-copy"></i> نسخ</button>
          <button class="action-btn delete-custom" type="button"><i class="far fa-trash-alt"></i> حذف</button>
        </div>
      </article>
    `).join('');
    els.main.innerHTML = `
      <header class="section-head open">
        <span class="sh-icon">✍️</span>
        <h2 class="sh-title">أذكاري المخصصة</h2>
        <span class="sh-meta">${list.length}</span>
      </header>
      <div class="section-body">${cards}</div>`;
  }

  // ----- الذكر العشوائي -----
  let randomRotateTimer = null;
  function mountRandomCard() {
    const mount = $('#random-mount');
    if (!mount) return;
    mount.innerHTML = `
      <div class="random-card" id="random-card">
        <button class="rc-refresh" id="rc-refresh" title="ذكر جديد"><i class="fas fa-sync-alt"></i></button>
        <div class="rc-label">ذكر عشوائي</div>
        <div class="rc-text" id="rc-text">…</div>
        <div class="rc-cat" id="rc-cat"></div>
      </div>`;
    $('#rc-refresh').addEventListener('click', refreshRandom);
    refreshRandom();
  }

  async function refreshRandom() {
    if (!state.index.length) return;
    // اختر قسماً عشوائياً ثم ذكراً منه (يقتصد على التحميل)
    const cat = state.index[Math.floor(Math.random() * state.index.length)];
    try {
      const data = await window.GTData.loadCategory(cat.file);
      const dua = data.array[Math.floor(Math.random() * data.array.length)];
      const t = $('#rc-text'); const c = $('#rc-cat');
      if (t && c) { t.textContent = dua.text; c.textContent = `— ${data.category}`; }
    } catch { /* تجاهل */ }
  }

  // ----- البحث -----
  let searchToken = 0;
  async function performSearch(term) {
    state.searchTerm = term;
    if (!term) { return router(); }
    const myToken = ++searchToken;
    els.main.innerHTML = `
      <header class="section-head open">
        <span class="sh-icon">🔍</span>
        <h2 class="sh-title">نتائج البحث عن: "${escape(term)}"</h2>
        <span class="sh-meta" id="search-meta">…</span>
      </header>
      <div class="section-body" id="search-results"></div>`;

    let total = 0;
    const onPartial = (partial) => {
      if (myToken !== searchToken) return; // عملية بحث جديدة بدأت
      total = partial.length;
      const meta = $('#search-meta');
      const out = $('#search-results');
      if (!meta || !out) return;
      meta.textContent = `${total} نتيجة`;
      out.innerHTML = partial.map(r => tplDuaCard(r, r._category, r._catId)).join('');
    };
    await window.GTData.searchAll(term, onPartial);
    if (myToken !== searchToken) return;
    if (!total) {
      els.main.innerHTML = `
        <div class="placeholder">
          <i class="fas fa-magnifying-glass ph-icon"></i>
          <h3>لا توجد نتائج</h3>
          <p>لم نعثر على ذكر يحتوي على "${escape(term)}"</p>
        </div>`;
    }
  }

  // ----- التوجيه -----
  function router() {
    const tab = state.activeTab;
    if (tab === 'all') return renderAll();
    if (tab === 'favorites') return renderFavorites();
    if (tab === 'custom') return renderCustom();
    return renderCategory(tab);
  }

  // ----- معالجات الأحداث -----
  function attachEvents() {
    // التبويبات
    els.tabsBar.addEventListener('click', (e) => {
      const chip = e.target.closest('.tab-chip');
      if (!chip) return;
      const id = chip.dataset.tab;
      const numId = Number(id);
      const tabId = Number.isFinite(numId) && /^\d+$/.test(id) ? numId : id;
      setActiveTab(tabId);
      state.searchTerm = '';
      searchToken++; // إلغاء أي بحث جارٍ
      if (els.searchInput) els.searchInput.value = '';
      router();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // البحث
    els.searchInput.addEventListener('input', (e) => {
      const v = e.target.value.trim();
      clearTimeout(state.searchTimer);
      state.searchTimer = setTimeout(() => {
        if (v.length >= 2) performSearch(v);
        else if (!v) router();
      }, 280);
    });

    // التفاعلات على البطاقات والأقسام
    els.main.addEventListener('click', async (e) => {
      // طي/إظهار قسم
      const head = e.target.closest('.section-head');
      if (head && !head.dataset.single) {
        const id = Number(head.dataset.sectionId);
        const body = els.main.querySelector(`[data-section-body="${id}"]`);
        if (!body) return;
        const isHidden = body.hasAttribute('hidden');
        if (isHidden) {
          body.removeAttribute('hidden');
          head.classList.add('open');
          state.openSections.add(id);
          // حمّل المحتوى لأول مرة
          if (!body.querySelector('.dua-card') && !body.querySelector('.placeholder')) {
            await loadSectionBody(id);
          }
        } else {
          body.setAttribute('hidden', '');
          head.classList.remove('open');
          state.openSections.delete(id);
        }
        return;
      }

      // مفضلة
      const favBtn = e.target.closest('.fav-btn');
      if (favBtn) {
        const card = favBtn.closest('.dua-card');
        const catId = Number(card.dataset.cat);
        const duaId = Number(card.dataset.dua);
        const text = card.querySelector('.dua-text')?.textContent || '';
        const audio = card.querySelector('audio')?.src || '';
        // اعثر على اسم القسم من index
        const cat = state.index.find(c => c.id === catId);
        const added = window.GTBookmarks.toggleFavorite({
          catId, duaId, text, audio,
          category: cat?.category || '',
          count: 1,
        });
        if (state.activeTab === 'favorites' && !added) {
          card.remove();
          return;
        }
        favBtn.classList.toggle('is-fav', added);
        favBtn.querySelector('i').className = added ? 'fas fa-heart' : 'far fa-heart';
        favBtn.querySelector('span').textContent = added ? 'محفوظ' : 'حفظ';
        toast(added ? '✅ أضيف إلى المفضلة' : '↩️ أُزيل من المفضلة');
        return;
      }

      // نسخ
      const copyBtn = e.target.closest('.copy-btn');
      if (copyBtn) {
        const card = copyBtn.closest('.dua-card');
        const text = card.querySelector('.dua-text')?.textContent || '';
        try {
          await navigator.clipboard.writeText(text);
          copyBtn.classList.add('copied');
          const lbl = copyBtn.querySelector('span');
          const old = lbl.textContent;
          lbl.textContent = 'تم النسخ';
          setTimeout(() => { copyBtn.classList.remove('copied'); lbl.textContent = old; }, 1500);
        } catch {
          toast('تعذّر النسخ');
        }
        return;
      }

      // تخزين الصوت
      const audioBtn = e.target.closest('.save-audio');
      if (audioBtn) {
        const url = audioBtn.dataset.url;
        if (audioBtn.classList.contains('cached')) {
          await window.GTAudio.removeAudio(url);
          audioBtn.classList.remove('cached');
          audioBtn.querySelector('i').className = 'fas fa-download';
          toast('🗑️ حُذف من التخزين');
        } else {
          audioBtn.querySelector('i').className = 'fas fa-spinner fa-spin';
          const ok = await window.GTAudio.saveAudio(url);
          if (ok) {
            audioBtn.classList.add('cached');
            audioBtn.querySelector('i').className = 'fas fa-check-circle';
            toast('✅ خُزّن للاستخدام أوفلاين');
          } else {
            audioBtn.querySelector('i').className = 'fas fa-exclamation';
            toast('تعذّر التخزين، تحقق من الاتصال');
          }
        }
        return;
      }

      // حذف ذكر مخصص
      const delBtn = e.target.closest('.delete-custom');
      if (delBtn) {
        const card = delBtn.closest('.dua-card');
        const id = Number(card.dataset.custom);
        window.GTBookmarks.removeCustom(id);
        card.remove();
        toast('🗑️ حُذف الذكر');
        return;
      }
    });

    // فحص حالة تخزين الصوت لإظهار الأيقونة الصحيحة عند العرض
    els.main.addEventListener('mouseenter', (e) => {
      const btn = e.target.closest && e.target.closest('.save-audio');
      if (!btn || btn._checked) return;
      btn._checked = true;
      window.GTAudio.isCached(btn.dataset.url).then(c => {
        if (c) {
          btn.classList.add('cached');
          btn.querySelector('i').className = 'fas fa-check-circle';
        }
      });
    }, true);

    // زر صعود
    els.scrollTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    window.addEventListener('scroll', () => {
      els.scrollTop.classList.toggle('show', window.scrollY > 400);
    }, { passive: true });

    // قائمة منسدلة
    els.menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      els.menu.classList.toggle('open');
    });
    document.addEventListener('click', (e) => {
      if (!els.menu.contains(e.target) && !els.menuBtn.contains(e.target)) {
        els.menu.classList.remove('open');
      }
    });

    // أزرار القائمة
    $('#menu-add-dua').addEventListener('click', () => {
      els.menu.classList.remove('open');
      openModal('add-dua-modal');
    });
    $('#menu-favorites').addEventListener('click', () => {
      els.menu.classList.remove('open');
      setActiveTab('favorites'); router();
    });
    $('#menu-custom').addEventListener('click', () => {
      els.menu.classList.remove('open');
      setActiveTab('custom'); router();
    });
    $('#menu-share').addEventListener('click', () => {
      els.menu.classList.remove('open');
      if (navigator.share) {
        navigator.share({
          title: 'حصن المسلم — GT-HISNMUSLIM',
          text: 'تطبيق الأذكار والأدعية',
          url: window.location.href,
        }).catch(() => {});
      } else {
        navigator.clipboard.writeText(window.location.href);
        toast('🔗 نُسخ الرابط');
      }
    });
    $('#menu-about').addEventListener('click', () => {
      els.menu.classList.remove('open');
      openModal('about-modal');
    });
    $('#menu-storage').addEventListener('click', async () => {
      els.menu.classList.remove('open');
      const cached = await window.GTAudio.listCached();
      $('#storage-count').textContent = cached.length;
      openModal('storage-modal');
    });

    // نوافذ منبثقة
    $$('.modal-close, [data-close]').forEach(b => b.addEventListener('click', closeModals));
    $$('.modal-backdrop').forEach(b => b.addEventListener('click', (e) => {
      if (e.target === b) closeModals();
    }));

    // حفظ ذكر مخصص
    $('#save-custom-dua').addEventListener('click', () => {
      const title = $('#new-dua-title').value.trim();
      const text = $('#new-dua-text').value.trim();
      const audio = $('#new-dua-audio').value.trim();
      const count = Number($('#new-dua-count').value) || 1;
      if (!text) { toast('اكتب نص الذكر'); return; }
      window.GTBookmarks.addCustom({ title, text, audio, count });
      $('#new-dua-title').value = '';
      $('#new-dua-text').value = '';
      $('#new-dua-audio').value = '';
      $('#new-dua-count').value = '';
      closeModals();
      toast('✅ أُضيف إلى أذكاري');
      if (state.activeTab === 'custom') router();
    });

    // مسح الصوت المخزن
    $('#clear-storage-btn').addEventListener('click', async () => {
      await window.GTAudio.clearAll();
      $('#storage-count').textContent = '0';
      toast('🗑️ مُسح التخزين الصوتي');
    });
  }

  function openModal(id) {
    const m = document.getElementById(id);
    if (m) m.classList.add('open');
  }
  function closeModals() {
    $$('.modal-backdrop').forEach(m => m.classList.remove('open'));
  }

  // ----- التهيئة -----
  async function init() {
    els.main = $('#main-content');
    els.tabsBar = $('#tabs-bar');
    els.searchInput = $('#search-input');
    els.scrollTop = $('#scroll-top');
    els.menuBtn = $('#menu-btn');
    els.menu = $('#menu-dropdown');

    els.main.innerHTML = '<div class="loader"><div class="spinner"></div></div>';
    try {
      state.index = await window.GTData.loadIndex();
    } catch (e) {
      els.main.innerHTML = '<div class="placeholder"><i class="fas fa-circle-exclamation ph-icon"></i><h3>تعذّر تحميل الفهرس</h3><p>تحقق من الاتصال وحدّث الصفحة</p></div>';
      return;
    }
    renderTabs();
    attachEvents();
    await router();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.GTApp = { state, router, setActiveTab };
})();
