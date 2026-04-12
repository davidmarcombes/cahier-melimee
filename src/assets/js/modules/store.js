/* ─────────────────────────────────────────────────────────────
   Local progress store — sole persistence layer.
   Key: 'melimee_v1'  { user: {...}, progress: { [seriesId]: {...} } }
   ───────────────────────────────────────────────────────────── */
export const localStore = (() => {
  const KEY = 'melimee_v1';
  function load() {
    try {
      return JSON.parse(localStorage.getItem(KEY)) || {};
    } catch {
      return {};
    }
  }
  function save(d) {
    try {
      localStorage.setItem(KEY, JSON.stringify(d));
    } catch {}
  }
  return {
    getUser() {
      return load().user || null;
    },
    setUser(p) {
      const d = load();
      d.user = { slug: p.slug, username: p.username, sticker_id: p.sticker_id };
      save(d);
    },
    clearUser() {
      const d = load();
      delete d.user;
      save(d);
    },
    markDone(seriesId) {
      if (!seriesId) return;
      const d = load();
      if (!d.progress) d.progress = {};
      if (!d.progress[seriesId]) {
        d.progress[seriesId] = { done: true, completedAt: new Date().toISOString() };
        save(d);
      }
    },
    getProgress() {
      return load().progress || {};
    },
    countDone() {
      return Object.keys(load().progress || {}).length;
    },
  };
})();
