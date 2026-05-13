/* إدارة المفضلة وحفظ أذكار المستخدم المخصصة في localStorage */
(function () {
  const FAV_KEY = 'gt-hisn-favorites';
  const CUSTOM_KEY = 'gt-hisn-custom';

  function _read(k, def) {
    try { return JSON.parse(localStorage.getItem(k)) || def; }
    catch { return def; }
  }
  function _write(k, v) { localStorage.setItem(k, JSON.stringify(v)); }

  function getFavorites() { return _read(FAV_KEY, []); }
  function isFavorite(catId, duaId) {
    return getFavorites().some(f => f.catId === catId && f.duaId === duaId);
  }
  function toggleFavorite(item) {
    // item: { catId, duaId, text, category, count, audio }
    const favs = getFavorites();
    const idx = favs.findIndex(f => f.catId === item.catId && f.duaId === item.duaId);
    if (idx >= 0) { favs.splice(idx, 1); }
    else { favs.unshift({ ...item, savedAt: Date.now() }); }
    _write(FAV_KEY, favs);
    return idx < 0; // true إذا تمت الإضافة
  }
  function removeFavorite(catId, duaId) {
    const favs = getFavorites().filter(f => !(f.catId === catId && f.duaId === duaId));
    _write(FAV_KEY, favs);
  }
  function clearFavorites() { _write(FAV_KEY, []); }

  function getCustom() { return _read(CUSTOM_KEY, []); }
  function addCustom(item) {
    // { title, text, audio?, count? }
    const list = getCustom();
    const id = Date.now();
    list.unshift({ id, ...item, createdAt: id });
    _write(CUSTOM_KEY, list);
    return id;
  }
  function removeCustom(id) {
    _write(CUSTOM_KEY, getCustom().filter(c => c.id !== id));
  }

  window.GTBookmarks = {
    getFavorites, isFavorite, toggleFavorite, removeFavorite, clearFavorites,
    getCustom, addCustom, removeCustom,
  };
})();
