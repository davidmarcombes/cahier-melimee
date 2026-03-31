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
  const LEVELS  = { 1: 'CP', 2: 'CE1', 3: 'CE2', 4: 'CM1', 5: 'CM2' };
  const DIFFS   = { 1: 'facile', 2: 'moyen', 3: 'difficile' };
  const FOLDERS = { e: 'exercices', a: 'applications', d: 'defis' };
  // Kept in sync with CSV_TYPES / CSV_CLASSES in .eleventy.js — add new entries at the END only.
  // Multi-type series use "multi"; no composite entries.
  const CSV_TYPES   = ["","bar-chart","base-10","bounding","calc-chain","checkbox","click-blocks","clock","column-op","compare","compare-groups","convert","coordinate-grid","count-objects","decimal-triple","decomp","drag-sort","fill-table","fraction","fraction-check","fraction-paint","function-machine","inverse-problem","logic-grid","magic-color","matching","maze","mcq","multi","multi-question","number-check","number-hunt","number-line","problem","pyramid","ruler","select","sequence","sort","svg-tiles","thermometer","tile-select","tri-arith","true-false","venn","defi","compare-expressions","estimation"];
  const CSV_CLASSES = ["A1.1","A1.2","A2.1","A2.2","A2.3","A2.4","A3.1","A3.2","A3.3","A4.1","A4.2","D1.1.1","I1.1.1","I1.1.2","M1.1","M1.2","M1.3","M1.4","M2.1","M2.2","M2.3","M3.1","M3.2","M3.3","N4.2","S1.1.1","S1.1.2","S1.1.3","S1.2.1","S1.2.2","S1.2.3","S1.3.1","S2.1.1","S2.1.2","S2.1.3","S2.1.4","S2.2.1","S2.2.2","S3.1.1","S3.1.2","S3.2.1","S3.2.2","S3.2.3","S4.1.2","S3.1.3"];

  Alpine.store('exercises', {
    data: null,
    loading: false,

    async load() {
      if (this.data) return;
      const cached = sessionStorage.getItem('ex4');
      if (cached) {
        try {
          const d = JSON.parse(cached);
          const prefix = window.__pathPrefix || '/';
          if (Array.isArray(d) && d.length && d[0].title && d[0].seriesUrl && d[0].seriesUrl.startsWith(prefix) && 'typeKey' in d[0]) {
            this.data = d;
            return;
          }
          sessionStorage.removeItem('ex4');
        } catch (e) {
          sessionStorage.removeItem('ex3');
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
            const [id, l, s, t, title, d, f, ty, cl] = row.split(',');
            const tyIdx = ty !== undefined && ty !== '' ? Number(ty) : -1;
            const clIdx = cl !== undefined && cl !== '' ? Number(cl) : -1;
            return {
              id,
              level: LEVELS[l] || l,
              subject: s,
              topic: t,
              title,
              difficulty: DIFFS[d] || d,
              isDefi: f === 'd',
              seriesUrl: (window.__pathPrefix || '/') + 'fr/' + (FOLDERS[f] || 'exercices') + '/' + id + '/',
              typeKey: CSV_TYPES[tyIdx] || '',
              classKey: CSV_CLASSES[clIdx] || '',
            };
          });
        sessionStorage.setItem('ex4', JSON.stringify(this.data));
      } catch (e) {
        console.error('CSV load error:', e);
      }
      this.loading = false;
    },
  });
});
