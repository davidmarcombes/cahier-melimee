import { renderOpShorthands, normalizeAnswer } from './utils.js';
import { SETTINGS } from './constants.js';

/* ─────────────────────────────────────────────────────────────
   Timed Challenge Player — Alpine.js component.
   Fluency-focused: instant advance on correct, brief pause on wrong,
   countdown timer, end-of-session score report.
   ───────────────────────────────────────────────────────────── */
export function timedPlayer(rawExercises, seriesId, opts = {}) {
  return {
    allEx: rawExercises,
    ex: [],
    phase: 'ready', // 'ready' | 'playing' | 'done'
    curIdx: 0,
    userInput: '',
    correct: 0,
    attempted: 0,
    flashState: null, // null | 'ok' | 'err'
    timeLeft: opts.duration ?? 60,
    totalTime: opts.duration ?? 60,
    _timerId: null,

    init() {
      this._expand();
      this._shuffle();
    },

    // Expand generator placeholders into real exercises
    _expand() {
      this.ex = this.allEx.flatMap((e) => {
        if (!e._gen) return [e];
        const g = window.AppGenerators?.[e._gen.name];
        if (!g) return [];
        return Array.from({ length: e._gen.count }, () => ({
          ...e,
          ...g.generate(e._gen.params),
        }));
      });
    },

    _shuffle() {
      for (let i = this.ex.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.ex[i], this.ex[j]] = [this.ex[j], this.ex[i]];
      }
    },

    get cur() {
      return this.ex[this.curIdx % Math.max(1, this.ex.length)] || {};
    },

    get opHtml() {
      const op = this.cur.operation || '';
      return renderOpShorthands(op.includes('?') ? op : op + ' = ?');
    },

    get timerPct() {
      return (this.timeLeft / this.totalTime) * 100;
    },

    get timerClass() {
      if (this.timerPct > 50) return 'bg-primary-500';
      if (this.timerPct > 25) return 'bg-amber-500';
      return 'bg-red-500';
    },

    get scoreEmoji() {
      if (!this.attempted) return '🤔';
      const r = this.correct / this.attempted;
      return r >= 0.9 ? '🏆' : r >= 0.75 ? '⭐' : r >= 0.5 ? '👍' : '💪';
    },

    get scorePct() {
      return this.attempted ? Math.round((this.correct / this.attempted) * 100) : 0;
    },

    get ratePerMin() {
      const elapsed = this.totalTime - this.timeLeft;
      return elapsed >= 1 ? Math.round((this.correct / elapsed) * 60) : '—';
    },

    start() {
      this.phase = 'playing';
      this.timeLeft = this.totalTime;
      this.curIdx = 0;
      this.correct = 0;
      this.attempted = 0;
      this.userInput = '';
      this.flashState = null;
      this._timerId = setInterval(() => {
        this.timeLeft = Math.max(0, this.timeLeft - 1);
        if (this.timeLeft === 0) this._finish();
      }, SETTINGS.TIMER_INTERVAL);
      this.$nextTick(() => this.$refs.input?.focus());
    },

    check() {
      if (this.phase !== 'playing' || !this.userInput.trim() || this.flashState) return;
      const ok = (this.cur.answers || []).some((a) => normalizeAnswer(a) === normalizeAnswer(this.userInput));
      this.attempted++;
      if (ok) this.correct++;
      this.userInput = '';
      this.flashState = ok ? 'ok' : 'err';
      setTimeout(
        () => {
          this.flashState = null;
          this.curIdx++;
          if (this.curIdx >= this.ex.length) {
            this.curIdx = 0;
            this._shuffle();
          }
          this.$nextTick(() => this.$refs.input?.focus());
        },
        ok ? SETTINGS.FAST_ADVANCE_DELAY : SETTINGS.TIMED_WRONG_DELAY
      );
    },

    _finish() {
      clearInterval(this._timerId);
      this.phase = 'done';
    },

    restart() {
      clearInterval(this._timerId);
      this.phase = 'ready';
      this._shuffle();
    },
  };
}
