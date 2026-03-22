import { localStore } from './modules/store.js';
import { themeToggle } from './modules/theme.js';
import { seriesPlayer } from './modules/player.js';
import { timedPlayer } from './modules/timed-player.js';
import { renderOpShorthands } from './modules/utils.js';

// Expose to window for Alpine.js and global access
window.localStore = localStore;
window.themeToggle = themeToggle;
window.seriesPlayer = seriesPlayer;
window.timedPlayer = timedPlayer;
window.renderOpShorthands = renderOpShorthands;

/* Exercise store — loads CSV on demand, caches in sessionStorage */
document.addEventListener('alpine:init', () => {
  const LEVELS = { 1: 'CP', 2: 'CE1', 3: 'CE2', 4: 'CM1', 5: 'CM2' };
  const DIFFS = { 1: 'facile', 2: 'moyen', 3: 'difficile' };
  const FOLDERS = { e: 'exercices', a: 'applications', d: 'defis' };

  Alpine.store('exercises', {
    data: null,
    loading: false,

    async load() {
      if (this.data) return;
      const cached = sessionStorage.getItem('ex');
      if (cached) {
        try {
          const d = JSON.parse(cached);
          const prefix = window.__pathPrefix || '/';
          if (Array.isArray(d) && d.length && d[0].title && d[0].seriesUrl && d[0].seriesUrl.startsWith(prefix)) {
            this.data = d;
            return;
          }
          sessionStorage.removeItem('ex');
        } catch (e) {
          sessionStorage.removeItem('ex');
        }
      }

      this.loading = true;
      try {
        const res = await fetch((window.__pathPrefix || '/') + 'fr/exercices/data.csv');
        if (!res.ok) {
          console.error('CSV fetch failed:', res.status);
          this.loading = false;
          return;
        }
        const text = await res.text();
        const rows = text.replace(/\r/g, '').trim().split('\n');
        if (!rows[0] || !rows[0].startsWith('id,')) {
          console.error('CSV header invalid:', rows[0]);
          this.loading = false;
          return;
        }
        this.data = rows
          .slice(1)
          .filter((r) => r)
          .map((row) => {
            const [id, l, s, t, title, d, f] = row.split(',');
            return {
              id,
              level: LEVELS[l] || l,
              subject: s,
              topic: t,
              title,
              difficulty: DIFFS[d] || d,
              isDefi: f === 'd',
              seriesUrl: (window.__pathPrefix || '/') + 'fr/' + (FOLDERS[f] || 'exercices') + '/' + id + '/',
            };
          });
        sessionStorage.setItem('ex', JSON.stringify(this.data));
      } catch (e) {
        console.error('CSV load error:', e);
      }
      this.loading = false;
    },
  });
});
