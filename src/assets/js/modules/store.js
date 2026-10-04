/* ─────────────────────────────────────────────────────────────
   Local progress store — sole persistence layer (no server).
   Key: 'melimee_v1'
     { version: 2, current: slug | null,
       pupils: { [slug]: { slug, username, sticker_id, createdAt, progress: { [seriesId]: {...} } } },
       progress: { [seriesId]: {...} } }   ← work done before any cahier exists (guest)
   Several children can share one browser: each has a cahier, `current` is who is working.
   A cahier can be exported to a JSON file and imported on another device.
   Version 1 ({ user, progress }) is migrated on first read.
   ───────────────────────────────────────────────────────────── */
const EXPORT_FORMAT = 'cahier-melimee';

export const localStore = (() => {
  const KEY = 'melimee_v1';
  function load() {
    let d;
    try {
      d = JSON.parse(localStorage.getItem(KEY)) || {};
    } catch {
      d = {};
    }
    return migrate(d);
  }
  function migrate(d) {
    if (d.version === 2) return d;
    const out = { version: 2, current: null, pupils: {}, progress: {} };
    if (d.user && d.user.slug) {
      out.pupils[d.user.slug] = { ...pick(d.user), createdAt: null, progress: d.progress || {} };
      out.current = d.user.slug;
    } else out.progress = d.progress || {};
    return out;
  }
  function save(d) {
    try {
      localStorage.setItem(KEY, JSON.stringify(d));
    } catch {
      /* localStorage unavailable (private mode) — ignore */
    }
  }
  const pick = (p) => ({ slug: p.slug, username: p.username, sticker_id: p.sticker_id });
  const progressOf = (d) => (d.current && d.pupils[d.current] ? d.pupils[d.current].progress : d.progress);
  // Two children may pick the same animal + sticker: keep slugs unique
  const freeSlug = (d, slug) => {
    let s = slug,
      n = 2;
    while (d.pupils[s]) s = `${slug}-${n++}`;
    return s;
  };
  // Union of two progress maps, keeping the earliest completion
  const mergeProgress = (a, b) => {
    const out = { ...a };
    for (const [id, v] of Object.entries(b || {}))
      if (!out[id] || (v.completedAt && v.completedAt < (out[id].completedAt || '9'))) out[id] = v;
    return out;
  };

  return {
    /** The child working now, or null */
    getUser() {
      const d = load();
      return d.current && d.pupils[d.current] ? pick(d.pupils[d.current]) : null;
    },
    /** All cahiers on this device, oldest first */
    listUsers() {
      return Object.values(load().pupils)
        .sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''))
        .map((p) => ({ ...pick(p), done: Object.keys(p.progress || {}).length }));
    },
    /** Create a cahier and make it current. The first cahier adopts the guest progress. Returns its slug. */
    addUser(p) {
      const d = load();
      const slug = freeSlug(d, p.slug);
      const first = Object.keys(d.pupils).length === 0;
      d.pupils[slug] = {
        ...pick({ ...p, slug }),
        createdAt: new Date().toISOString(),
        progress: first ? d.progress || {} : {},
      };
      if (first) d.progress = {};
      d.current = slug;
      save(d);
      return slug;
    },
    /** Kept for callers of the single-user API */
    setUser(p) {
      return this.addUser(p);
    },
    /** Make an existing cahier current. Returns false if unknown. */
    switchUser(slug) {
      const d = load();
      if (!d.pupils[slug]) return false;
      d.current = slug;
      save(d);
      return true;
    },
    /** Nobody is working (the cahier stays on the device) */
    clearUser() {
      const d = load();
      d.current = null;
      save(d);
    },
    /** Delete a cahier and its progress from this device */
    removeUser(slug) {
      const d = load();
      delete d.pupils[slug];
      if (d.current === slug) d.current = null;
      save(d);
    },
    markDone(seriesId) {
      if (!seriesId) return;
      const d = load();
      const progress = progressOf(d);
      if (!progress[seriesId]) {
        progress[seriesId] = { done: true, completedAt: new Date().toISOString() };
        save(d);
      }
    },
    getProgress() {
      return progressOf(load()) || {};
    },
    countDone() {
      return Object.keys(this.getProgress()).length;
    },
    /** The file content for one cahier (current one by default) */
    exportUser(slug) {
      const d = load();
      const p = d.pupils[slug || d.current];
      if (!p) return null;
      return {
        format: EXPORT_FORMAT,
        version: 1,
        exportedAt: new Date().toISOString(),
        pupil: { ...pick(p), createdAt: p.createdAt, progress: p.progress || {} },
      };
    },
    /**
     * Load a cahier from an exported file (parsed JSON). An existing cahier with the same slug
     * gets the union of both progressions (nothing is lost). Makes it current.
     * Returns { slug, merged } or throws an Error with a message for the child/parent.
     */
    importUser(data) {
      const p = data && data.format === EXPORT_FORMAT ? data.pupil : null;
      const str = (v, max) => typeof v === 'string' && v.length > 0 && v.length <= max;
      if (!p || !str(p.slug, 80) || !str(p.username, 80) || !str(p.sticker_id, 16))
        throw new Error("Ce fichier n'est pas un cahier de Mélimée.");
      const progress = {};
      for (const [id, v] of Object.entries(p.progress && typeof p.progress === 'object' ? p.progress : {}))
        if (/^[\w-]{1,40}$/.test(id) && v && v.done === true)
          progress[id] = { done: true, completedAt: typeof v.completedAt === 'string' ? v.completedAt : null };
      const d = load();
      const merged = Boolean(d.pupils[p.slug]);
      d.pupils[p.slug] = merged
        ? { ...d.pupils[p.slug], progress: mergeProgress(d.pupils[p.slug].progress, progress) }
        : { ...pick(p), createdAt: typeof p.createdAt === 'string' ? p.createdAt : null, progress };
      d.current = p.slug;
      save(d);
      return { slug: p.slug, merged };
    },
  };
})();
