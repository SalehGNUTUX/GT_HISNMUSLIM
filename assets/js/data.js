/* تحميل البيانات: فهرس الأقسام + جلب القسم عند الطلب مع تخزين بالذاكرة */
(function () {
  const BASE = 'assets/data/';
  const cache = new Map();
  let indexPromise = null;

  function loadIndex() {
    if (!indexPromise) {
      indexPromise = fetch(BASE + 'index.json', { cache: 'default' })
        .then(r => {
          if (!r.ok) throw new Error('فشل تحميل فهرس الأذكار');
          return r.json();
        })
        .then(j => j.categories || j);
    }
    return indexPromise;
  }

  async function loadCategory(idOrFile) {
    // idOrFile may be id (number) or "categories/001.json"
    let file = idOrFile;
    if (typeof idOrFile === 'number' || /^\d+$/.test(String(idOrFile))) {
      const idNum = Number(idOrFile);
      file = `categories/${String(idNum).padStart(3, '0')}.json`;
    }
    if (cache.has(file)) return cache.get(file);
    const data = await fetch(BASE + file, { cache: 'default' }).then(r => {
      if (!r.ok) throw new Error('فشل تحميل القسم: ' + file);
      return r.json();
    });
    cache.set(file, data);
    return data;
  }

  async function loadAll() {
    // يُستخدم عند الحاجة (مثل البحث الشامل أو الذكر العشوائي)
    const idx = await loadIndex();
    const results = await Promise.all(idx.map(c => loadCategory(c.file)));
    return results;
  }

  // تطبيع النص العربي: حذف الحركات والتطويل وتوحيد الألف
  function normalize(str) {
    if (!str) return '';
    return str
      .replace(/[ً-ٰٟـ]/g, '') // حركات وشدة وتطويل
      .replace(/[أإآٱ]/g, 'ا')
      .replace(/ؤ/g, 'و')
      .replace(/[ئى]/g, 'ي');
  }

  // البحث الكسول: يبحث في الأقسام المحملة مسبقاً ثم يتمدد للأقسام الأخرى تدريجياً
  async function searchAll(term, onPartial) {
    term = term.trim();
    if (!term) return [];
    const normTerm = normalize(term);
    const idx = await loadIndex();
    const all = [];
    for (const ci of idx) {
      try {
        const cat = await loadCategory(ci.file);
        const matches = cat.array
          .filter(d => d.text && normalize(d.text).includes(normTerm))
          .map(d => ({ ...d, _category: cat.category, _catId: cat.id }));
        if (matches.length) {
          all.push(...matches);
          if (onPartial) onPartial(all.slice());
        }
      } catch { /* تجاهل أخطاء قسم واحد */ }
    }
    return all;
  }

  window.GTData = { loadIndex, loadCategory, loadAll, searchAll, normalize, BASE };
})();
