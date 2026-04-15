/**
 * dev.js — Development-only tools. Included only when ELEVENTY_RUN_MODE=serve.
 * Loaded synchronously before Alpine initialises.
 *
 * - Patches seriesPlayer() with human-validation helpers
 * - Defines debugPanel() for the right-click debug overlay
 */

// Patch seriesPlayer after app.js defines it but before Alpine processes x-data
document.addEventListener('alpine:init', () => {
  const orig = window.seriesPlayer;
  if (!orig) return;
  window.seriesPlayer = function (exercises, id) {
    const base = orig(exercises, id);
    const _origInit = base.init;
    return Object.assign(base, {
      humanValidated: false,
      humanValidating: false,
      nextUnvalidatedUrl: null,
      init() {
        _origInit.call(this);
        this._fetchNextUnvalidated();
      },
      async _fetchNextUnvalidated() {
        try {
          const meta = JSON.parse(document.getElementById('series-meta')?.textContent || '{}');
          if (!meta.id) return;
          const res = await fetch(`/api/human-next-unvalidated?current=${meta.id}`);
          if (res.ok) {
            const { url } = await res.json();
            this.nextUnvalidatedUrl = url || null;
          }
        } catch {
          /* ignore fetch errors in dev panel */
        }
      },
      async humanValidate() {
        this.humanValidating = true;
        try {
          const meta = JSON.parse(document.getElementById('series-meta')?.textContent || '{}');
          await fetch('/api/human-validate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ seriesId: meta.id, url: window.location.pathname }),
          });
          this.humanValidated = true;
          await this._fetchNextUnvalidated();
        } catch (_) {
          // non-fatal
        } finally {
          this.humanValidating = false;
        }
      },
    });
  };
});

// Right-click debug panel — builds an agent-ready prompt from the current exercise
function debugPanel() {
  return {
    open: false,
    note: '',
    copied: false,

    init() {
      document.addEventListener('contextmenu', (e) => {
        if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;
        e.preventDefault();
        this.open = true;
      });
    },

    get _meta() {
      try {
        return JSON.parse(document.getElementById('series-meta')?.textContent || '{}');
      } catch (_) {
        return {};
      }
    },

    get _ex() {
      try {
        const el = document.querySelector('[x-data^="seriesPlayer"]');
        if (!el) return null;
        const d = Alpine.$data(el);
        return { index: d.currentIndex, total: d.exercises.length, cur: d.cur };
      } catch (_) {
        return null;
      }
    },

    get panelSubtitle() {
      const m = this._meta;
      const ex = this._ex;
      const type = ex?.cur?.type || '?';
      const idx = ex ? ex.index + 1 : '?';
      const total = ex?.total || '?';
      return `ID: ${m.id || '?'} · exercice ${idx}/${total} · type: ${type}`;
    },

    get prompt() {
      const m = this._meta;
      const ex = this._ex;
      const url = window.location.href;
      const type = ex?.cur?.type || '?';
      const idx = ex ? ex.index + 1 : '?';
      const total = ex?.total || '?';

      let yamlBody = '';
      if (ex?.cur) {
        yamlBody = Object.entries(ex.cur)
          .filter(([k]) => k !== 'type')
          .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
          .join('\n');
      }

      return [
        'You are debugging an exercise in Le Cahier de Mélimée. Follow agents/content.md for conventions.',
        '',
        `URL: ${url}`,
        m.id ? `Series ID: ${m.id}` : '',
        `Exercise: #${idx} / ${total} — type: ${type}`,
        '',
        'Current exercise data:',
        '```yaml',
        `type: ${type}`,
        yamlBody,
        '```',
        '',
        `Problem: ${this.note.trim() || '<describe what is wrong>'}`,
        '',
        'Diagnostic commands:',
        `  node scripts/show-type.js ${type}`,
        '  npm run validate:exercises',
      ]
        .filter((l) => l !== null)
        .join('\n');
    },

    async copy() {
      try {
        await navigator.clipboard.writeText(this.prompt);
        this.copied = true;
        setTimeout(() => {
          this.copied = false;
        }, 2000);
      } catch (err) {
        console.warn('Clipboard write failed:', err);
      }
    },
  };
}
