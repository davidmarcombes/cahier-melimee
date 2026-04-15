import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { timedPlayer } from '../src/assets/js/modules/timed-player.js';
import { SETTINGS } from '../src/assets/js/modules/constants.js';

// timed-player._expand references `window.AppGenerators` (browser global).
// In Node tests there is no window, so alias it to globalThis.
if (typeof window === 'undefined') globalThis.window = globalThis;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mkPlayer(exercises = [], opts = {}) {
  const p = timedPlayer(exercises, 'test-series', opts);
  // Stub Alpine.js runtime dependencies
  p.$nextTick = vi.fn((fn) => fn && fn());
  p.$refs = { input: { focus: vi.fn() } };
  return p;
}

const mkEx = (operation = '3 + 4', answer = '7') => ({
  type: 'number-check',
  operation,
  answers: [answer],
});

// ─── _expand ──────────────────────────────────────────────────────────────────

describe('timedPlayer._expand', () => {
  it('passes static exercises (no _gen) through unchanged', () => {
    const ex = mkEx('1 + 1', '2');
    const p = mkPlayer([ex]);
    p._expand();
    expect(p.ex).toHaveLength(1);
    expect(p.ex[0]).toBe(ex);
  });

  it('expands a _gen exercise into count instances', () => {
    globalThis.AppGenerators = {
      testGen: { generate: vi.fn(() => mkEx('5 × 3', '15')) },
    };
    const p = mkPlayer([{ _gen: { name: 'testGen', count: 4, params: {} } }]);
    p._expand();
    expect(p.ex).toHaveLength(4);
    expect(globalThis.AppGenerators.testGen.generate).toHaveBeenCalledTimes(4);
    delete globalThis.AppGenerators;
  });

  it('skips _gen entries whose generator name is unknown', () => {
    globalThis.AppGenerators = {};
    const p = mkPlayer([{ _gen: { name: 'nonExistent', count: 3, params: {} } }]);
    p._expand();
    expect(p.ex).toHaveLength(0);
    delete globalThis.AppGenerators;
  });

  it('merges static exercise fields with generated ones', () => {
    globalThis.AppGenerators = {
      myGen: { generate: () => ({ type: 'number-check', operation: 'gen-op', answers: ['1'] }) },
    };
    const base = { seriesId: 'abc', _gen: { name: 'myGen', count: 1, params: {} } };
    const p = mkPlayer([base]);
    p._expand();
    expect(p.ex[0].seriesId).toBe('abc');
    expect(p.ex[0].operation).toBe('gen-op');
    delete globalThis.AppGenerators;
  });

  it('handles mix of static and generator exercises', () => {
    globalThis.AppGenerators = {
      g: { generate: () => mkEx() },
    };
    const p = mkPlayer([mkEx('a', '1'), { _gen: { name: 'g', count: 2, params: {} } }, mkEx('b', '2')]);
    p._expand();
    expect(p.ex).toHaveLength(4);
    delete globalThis.AppGenerators;
  });
});

// ─── _shuffle ─────────────────────────────────────────────────────────────────

describe('timedPlayer._shuffle', () => {
  it('keeps all elements after shuffle', () => {
    const p = mkPlayer();
    p.ex = [mkEx('a', '1'), mkEx('b', '2'), mkEx('c', '3'), mkEx('d', '4'), mkEx('e', '5')];
    const before = [...p.ex];
    p._shuffle();
    expect(p.ex).toHaveLength(before.length);
    expect(p.ex).toEqual(expect.arrayContaining(before));
  });

  it('produces a different order across many calls (probabilistic)', () => {
    const exercises = Array.from({ length: 8 }, (_, i) => mkEx(`${i}`, `${i}`));
    const seen = new Set();
    for (let trial = 0; trial < 40; trial++) {
      const p = mkPlayer();
      p.ex = [...exercises];
      p._shuffle();
      seen.add(p.ex.map((e) => e.operation).join(','));
    }
    // With 8 elements there are 40320 permutations — seeing 2+ distinct orders is near-certain
    expect(seen.size).toBeGreaterThan(1);
  });
});

// ─── cur getter ───────────────────────────────────────────────────────────────

describe('timedPlayer.cur', () => {
  it('returns the exercise at curIdx', () => {
    const [a, b] = [mkEx('a', '1'), mkEx('b', '2')];
    const p = mkPlayer();
    p.ex = [a, b];
    p.curIdx = 1;
    expect(p.cur).toBe(b);
  });

  it('wraps curIdx using modulo', () => {
    const [a, b] = [mkEx('a', '1'), mkEx('b', '2')];
    const p = mkPlayer();
    p.ex = [a, b];
    p.curIdx = 2; // wraps to 0
    expect(p.cur).toBe(a);
  });

  it('returns {} when ex is empty', () => {
    const p = mkPlayer();
    p.ex = [];
    p.curIdx = 0;
    expect(p.cur).toEqual({});
  });
});

// ─── opHtml ───────────────────────────────────────────────────────────────────

describe('timedPlayer.opHtml', () => {
  it('appends " = ?" when operation has no ?', () => {
    const p = mkPlayer();
    p.ex = [mkEx('6 × 7')];
    p.curIdx = 0;
    expect(p.opHtml).toContain('6 × 7 = ?');
  });

  it('leaves operation unchanged when it already contains ?', () => {
    const p = mkPlayer();
    p.ex = [mkEx('? + 3 = 10')];
    p.curIdx = 0;
    expect(p.opHtml).toContain('?');
    expect(p.opHtml).not.toContain('? + 3 = 10 = ?');
  });

  it('returns empty string when ex is empty', () => {
    const p = mkPlayer();
    p.ex = [];
    p.curIdx = 0;
    expect(p.opHtml).toBe(' = ?');
  });
});

// ─── timerClass ───────────────────────────────────────────────────────────────

describe('timedPlayer.timerClass', () => {
  it('returns primary class when above 50%', () => {
    const p = mkPlayer([], { duration: 60 });
    p.timeLeft = 40;
    expect(p.timerClass).toBe('bg-primary-500');
  });

  it('returns amber when between 25% and 50%', () => {
    const p = mkPlayer([], { duration: 60 });
    p.timeLeft = 20;
    expect(p.timerClass).toBe('bg-amber-500');
  });

  it('returns red at exactly 25%', () => {
    const p = mkPlayer([], { duration: 60 });
    p.timeLeft = 15;
    expect(p.timerClass).toBe('bg-red-500');
  });

  it('returns red below 25%', () => {
    const p = mkPlayer([], { duration: 60 });
    p.timeLeft = 10;
    expect(p.timerClass).toBe('bg-red-500');
  });
});

// ─── scoreEmoji ───────────────────────────────────────────────────────────────

describe('timedPlayer.scoreEmoji', () => {
  it('returns 🤔 when nothing attempted', () => {
    const p = mkPlayer();
    p.correct = 0;
    p.attempted = 0;
    expect(p.scoreEmoji).toBe('🤔');
  });

  it('returns 🏆 at 90%+', () => {
    const p = mkPlayer();
    p.correct = 9;
    p.attempted = 10;
    expect(p.scoreEmoji).toBe('🏆');
  });

  it('returns ⭐ at 75–89%', () => {
    const p = mkPlayer();
    p.correct = 8;
    p.attempted = 10;
    expect(p.scoreEmoji).toBe('⭐');
  });

  it('returns 👍 at 50–74%', () => {
    const p = mkPlayer();
    p.correct = 6;
    p.attempted = 10;
    expect(p.scoreEmoji).toBe('👍');
  });

  it('returns 💪 below 50%', () => {
    const p = mkPlayer();
    p.correct = 4;
    p.attempted = 10;
    expect(p.scoreEmoji).toBe('💪');
  });
});

// ─── scorePct ─────────────────────────────────────────────────────────────────

describe('timedPlayer.scorePct', () => {
  it('returns 0 when nothing attempted', () => {
    const p = mkPlayer();
    p.correct = 0;
    p.attempted = 0;
    expect(p.scorePct).toBe(0);
  });

  it('returns 100 when all correct', () => {
    const p = mkPlayer();
    p.correct = 5;
    p.attempted = 5;
    expect(p.scorePct).toBe(100);
  });

  it('rounds to nearest integer', () => {
    const p = mkPlayer();
    p.correct = 1;
    p.attempted = 3; // 33.33…%
    expect(p.scorePct).toBe(33);
  });
});

// ─── ratePerMin ───────────────────────────────────────────────────────────────

describe('timedPlayer.ratePerMin', () => {
  it('returns "—" when no time has elapsed', () => {
    const p = mkPlayer([], { duration: 60 });
    p.timeLeft = 60; // elapsed = 0
    p.correct = 5;
    expect(p.ratePerMin).toBe('—');
  });

  it('calculates correct rate when time has elapsed', () => {
    const p = mkPlayer([], { duration: 60 });
    p.timeLeft = 30; // elapsed = 30s
    p.correct = 10;
    expect(p.ratePerMin).toBe(20); // 10/30*60 = 20
  });

  it('rounds to nearest integer', () => {
    const p = mkPlayer([], { duration: 60 });
    p.timeLeft = 59; // elapsed = 1s
    p.correct = 1;
    expect(p.ratePerMin).toBe(60);
  });
});

// ─── start / _finish / restart ────────────────────────────────────────────────

describe('timedPlayer.start', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('sets phase to playing and resets counters', () => {
    const p = mkPlayer([mkEx()]);
    p.ex = [mkEx()];
    p.correct = 5;
    p.attempted = 8;
    p.curIdx = 3;
    p.userInput = 'old';
    p.start();
    expect(p.phase).toBe('playing');
    expect(p.correct).toBe(0);
    expect(p.attempted).toBe(0);
    expect(p.curIdx).toBe(0);
    expect(p.userInput).toBe('');
  });

  it('resets timeLeft to totalTime', () => {
    const p = mkPlayer([], { duration: 45 });
    p.ex = [];
    p.timeLeft = 10;
    p.start();
    expect(p.timeLeft).toBe(45);
  });

  it('decrements timeLeft every TIMER_INTERVAL ms', () => {
    const p = mkPlayer([], { duration: 10 });
    p.ex = [];
    p.start();
    vi.advanceTimersByTime(SETTINGS.TIMER_INTERVAL * 3);
    expect(p.timeLeft).toBe(7);
  });

  it('calls _finish when timeLeft reaches 0', () => {
    const p = mkPlayer([], { duration: 2 });
    p.ex = [];
    p._finish = vi.fn();
    p.start();
    vi.advanceTimersByTime(SETTINGS.TIMER_INTERVAL * 2);
    expect(p._finish).toHaveBeenCalled();
  });
});

describe('timedPlayer._finish', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('sets phase to done', () => {
    const p = mkPlayer([], { duration: 5 });
    p.ex = [];
    p.start();
    p._finish();
    expect(p.phase).toBe('done');
  });

  it('stops the interval after _finish', () => {
    const p = mkPlayer([], { duration: 10 });
    p.ex = [];
    p.start();
    p._finish();
    const snapshot = p.timeLeft;
    vi.advanceTimersByTime(SETTINGS.TIMER_INTERVAL * 5);
    expect(p.timeLeft).toBe(snapshot); // no further decrement
  });
});

describe('timedPlayer.restart', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('sets phase back to ready', () => {
    const p = mkPlayer([], { duration: 5 });
    p.ex = [];
    p.start();
    p.restart();
    expect(p.phase).toBe('ready');
  });

  it('stops any running interval', () => {
    const p = mkPlayer([], { duration: 10 });
    p.ex = [];
    p.start();
    const timeAfterStart = p.timeLeft;
    p.restart();
    vi.advanceTimersByTime(SETTINGS.TIMER_INTERVAL * 5);
    expect(p.timeLeft).toBe(timeAfterStart); // no decrement after restart
  });
});

// ─── check() ──────────────────────────────────────────────────────────────────

describe('timedPlayer.check', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('does nothing when phase is not playing', () => {
    const p = mkPlayer();
    p.ex = [mkEx('2 + 2', '4')];
    p.phase = 'ready';
    p.userInput = '4';
    p.check();
    expect(p.attempted).toBe(0);
  });

  it('does nothing when userInput is empty', () => {
    const p = mkPlayer();
    p.ex = [mkEx('2 + 2', '4')];
    p.phase = 'playing';
    p.userInput = '   ';
    p.check();
    expect(p.attempted).toBe(0);
  });

  it('does nothing when flashState is already set', () => {
    const p = mkPlayer();
    p.ex = [mkEx('2 + 2', '4')];
    p.phase = 'playing';
    p.userInput = '4';
    p.flashState = 'ok';
    p.check();
    expect(p.attempted).toBe(0);
  });

  it('correct answer increments correct and attempted, sets flashState ok', () => {
    const p = mkPlayer();
    p.ex = [mkEx('2 + 2', '4')];
    p.phase = 'playing';
    p.userInput = '4';
    p.check();
    expect(p.attempted).toBe(1);
    expect(p.correct).toBe(1);
    expect(p.flashState).toBe('ok');
    expect(p.userInput).toBe('');
  });

  it('wrong answer increments attempted but not correct, sets flashState err', () => {
    const p = mkPlayer();
    p.ex = [mkEx('2 + 2', '4')];
    p.phase = 'playing';
    p.userInput = '5';
    p.check();
    expect(p.attempted).toBe(1);
    expect(p.correct).toBe(0);
    expect(p.flashState).toBe('err');
  });

  it('correct: flashState clears and curIdx advances after FAST_ADVANCE_DELAY', () => {
    const p = mkPlayer();
    p.ex = [mkEx('1 + 1', '2'), mkEx('3 + 3', '6')];
    p.phase = 'playing';
    p.userInput = '2';
    p.check();
    expect(p.flashState).toBe('ok');
    expect(p.curIdx).toBe(0);
    vi.advanceTimersByTime(SETTINGS.FAST_ADVANCE_DELAY);
    expect(p.flashState).toBeNull();
    expect(p.curIdx).toBe(1);
  });

  it('wrong: flashState clears and curIdx advances after TIMED_WRONG_DELAY', () => {
    const p = mkPlayer();
    p.ex = [mkEx('1 + 1', '2'), mkEx('3 + 3', '6')];
    p.phase = 'playing';
    p.userInput = '99';
    p.check();
    expect(p.flashState).toBe('err');
    vi.advanceTimersByTime(SETTINGS.TIMED_WRONG_DELAY);
    expect(p.flashState).toBeNull();
    expect(p.curIdx).toBe(1);
  });

  it('wraps curIdx back to 0 when list is exhausted', () => {
    const p = mkPlayer();
    p.ex = [mkEx('a', '1')];
    p.phase = 'playing';
    p.curIdx = 0;
    p.userInput = '1';
    p.check();
    vi.advanceTimersByTime(SETTINGS.FAST_ADVANCE_DELAY);
    expect(p.curIdx).toBe(0); // wrapped
  });

  it('accepts answer with comma-decimal normalised to period', () => {
    const p = mkPlayer();
    p.ex = [mkEx('operation', '0,5')];
    p.phase = 'playing';
    p.userInput = '0.5'; // period variant
    p.check();
    expect(p.correct).toBe(1);
  });

  it('answer matching is case-insensitive and trims whitespace', () => {
    const p = mkPlayer();
    p.ex = [mkEx('op', 'abc')];
    p.phase = 'playing';
    p.userInput = '  ABC  ';
    p.check();
    expect(p.correct).toBe(1);
  });
});

// ─── init() ───────────────────────────────────────────────────────────────────

describe('timedPlayer.init', () => {
  it('populates ex from allEx', () => {
    const exercises = [mkEx('a', '1'), mkEx('b', '2')];
    const p = mkPlayer(exercises);
    p.init();
    expect(p.ex).toHaveLength(2);
  });

  it('ex is empty before init() when no exercises', () => {
    const p = mkPlayer();
    expect(p.ex).toHaveLength(0);
  });
});
