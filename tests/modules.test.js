// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { normalizeAnswer, renderOpShorthands } from '../src/assets/js/modules/utils.js';
import { SETTINGS } from '../src/assets/js/modules/constants.js';

describe('Modules Utilities', () => {
  describe('normalizeAnswer', () => {
    it('should lowercase and trim', () => {
      expect(normalizeAnswer('  Hello  ')).toBe('hello');
    });

    it('should replace comma with period', () => {
      expect(normalizeAnswer('12,5')).toBe('12.5');
    });

    it('should remove all spaces (including non-breaking)', () => {
      expect(normalizeAnswer('1 234,5')).toBe('1234.5');
      expect(normalizeAnswer('10\u00a0000')).toBe('10000');
    });

    it('should handle undefined or null', () => {
      expect(normalizeAnswer(undefined)).toBe('');
      expect(normalizeAnswer(null)).toBe('');
    });
  });

  describe('renderOpShorthands', () => {
    it('should render &box(val)', () => {
      expect(renderOpShorthands('Find &box(4)')).toBe('Find <span class="op-box">4</span>');
    });

    it('should render &highlight(val)', () => {
      expect(renderOpShorthands('See &highlight(7)')).toBe('See <span class="op-hl">7</span>');
    });

    it('should render &frac(numerator,denominator)', () => {
      expect(renderOpShorthands('Fraction &frac(1,2)')).toBe('Fraction <span class="frac"><span class="fn">1</span><span class="fd">2</span></span>');
      expect(renderOpShorthands('Mixed &frac(3 , 4)')).toBe('Mixed <span class="frac"><span class="fn">3</span><span class="fd">4</span></span>');
    });

    it('should handle empty or null strings', () => {
      expect(renderOpShorthands('')).toBe('');
      expect(renderOpShorthands(null)).toBe(null);
    });
  });

  describe('SETTINGS Constants', () => {
    it('should have essential timing values', () => {
      expect(SETTINGS.ERROR_FLASH_DURATION).toBeDefined();
      expect(SETTINGS.SUCCESS_ADVANCE_DELAY).toBeDefined();
      expect(SETTINGS.TIMER_INTERVAL).toBe(1000);
    });
  });
});

import { seriesPlayer } from '../src/assets/js/modules/player.js';

describe('seriesPlayer Logic', () => {
  const mockExercises = [
    { title: 'Ex 1', type: 'number-check', operation: '10 = 6 + ?', answers: ['4'] },
    { title: 'Ex 2', type: 'number-check', operation: '? / 2 = 5', answers: ['10'] },
    { title: 'Ex 3', type: 'number-check', operation: '1/2 + 1/2 = ?', answers: ['1'] },
  ];

  it('should initialize correctly', () => {
    const p = seriesPlayer(mockExercises, 'test-series');
    expect(p.exercises).toEqual(mockExercises);
    expect(p.currentIndex).toBe(0);
    expect(p.trouInputs).toEqual([]); // Initial state before init()/_setupCurrentExercise()
  });

  describe('trouParts parser', () => {
    it('should parse simple operation with ?', () => {
      const p = seriesPlayer(mockExercises, 'test-series');
      Object.defineProperty(p, 'cur', { get: () => mockExercises[0] });
      
      const parts = p.trouParts;
      // "10", " = 6 + ", "?"
      expect(parts.length).toBeGreaterThanOrEqual(2);
      expect(parts.some(p => p.t === 'i')).toBe(true);
      expect(parts.find(p => p.t === 'i')).toMatchObject({ idx: 0 });
    });

    it('should parse fractional parts with ?', () => {
      const ex = { operation: '?/4 = 1/4 + 2/4' };
      const p = seriesPlayer([ex], 'test-f');
      Object.defineProperty(p, 'cur', { get: () => ex });

      const parts = p.trouParts;
      // "?/4", " ", "=", " ", "1/4", " ", "+", " ", "2/4"
      expect(parts[0]).toMatchObject({ t: 'fi', idx: 0, d: '4' });
    });
    
    it('should correctly tokenize text and fractions', () => {
        const ex = { operation: 'Calculate 1/2 + 1/4 = ?' };
        const p = seriesPlayer([ex], 'test-msg');
        Object.defineProperty(p, 'cur', { get: () => ex });
        
        const parts = p.trouParts;
        expect(parts.some(p => p.t === 'f' && p.n === '1' && p.d === '2')).toBe(true);
        expect(parts.some(p => p.t === 'x' && p.v.includes('Calculate'))).toBe(true);
    });
  });
});

import { localStore } from '../src/assets/js/modules/store.js';

describe('localStore Persistence', () => {
  it('should handle user identity', () => {
    const user = { slug: 'lucas', username: 'Lucas', sticker_id: '1' };
    localStore.setUser(user);
    expect(localStore.getUser()).toMatchObject(user);
    
    localStore.clearUser();
    expect(localStore.getUser()).toBeNull();
  });

  it('should handle progress marking', () => {
    localStore.markDone('series-1');
    const p = localStore.getProgress();
    expect(p['series-1']).toBeDefined();
    expect(p['series-1'].done).toBe(true);
  });
});

describe('Magic-Color Logic', () => {
  const mockEx = {
    type: 'magic-color',
    magicColor: {
      cells: [
        { colorIdx: 0 },
        { colorIdx: 1 },
      ]
    }
  };

  it('mcPaint should set and toggle color (erasing)', () => {
    const p = seriesPlayer([mockEx], 'mc-1');
    p.mcActiveColor = 0;
    p.mcPaint(0);
    expect(p.mcColors[0]).toBe(0);
    
    // Toggle again with same color -> erase (null)
    p.mcPaint(0);
    expect(p.mcColors[0]).toBeNull();
  });

  it('mcAllColored should track if all cells have a color', () => {
    const p = seriesPlayer([mockEx], 'mc-2');
    Object.defineProperty(p, 'cur', { get: () => mockEx });
    p.mcActiveColor = 1;
    
    expect(p.mcAllColored()).toBe(false);
    p.mcPaint(0);
    expect(p.mcAllColored()).toBe(false);
    p.mcPaint(1);
    expect(p.mcAllColored()).toBe(true);
  });

  it('check should validate colors and flash errors', () => {
    const p = seriesPlayer([mockEx], 'mc-3');
    Object.defineProperty(p, 'cur', { get: () => mockEx });
    p._flashError = vi.fn();
    p._markSolvedAndAdvance = vi.fn();
    
    // Wrong colors
    p.mcColors = [1, 0];
    p.check();
    expect(p.mcErrors).toEqual([0, 1]);
    expect(p._flashError).toHaveBeenCalled();
    
    // Correct colors
    p._flashError.mockClear();
    p.mcColors = [0, 1];
    p.check();
    expect(p.mcErrors).toEqual([]);
    expect(p._markSolvedAndAdvance).toHaveBeenCalled();
  });
});

// ─── Futoshiki Logic ──────────────────────────────────────────────────────────

describe('Futoshiki Logic', () => {
  // 3×3 puzzle: no given cells, no constraints — just latin-square check
  const size = 3;
  const mkEx = (given = [], hCons = [], vCons = []) => ({
    type: 'futoshiki',
    futoshiki: { size, given, hCons, vCons, rows: Array.from({ length: size }, (_, r) => ({
      cells: Array.from({ length: size }, (_, c) => ({ given: null, idx: r * size + c })),
      hCons: Array(size - 1).fill(null),
      vCons: r < size - 1 ? Array(size).fill(null) : null,
    })) },
  });

  it('_setupCurrentExercise initialises futoInputs to empty strings', () => {
    const ex = mkEx();
    const p = seriesPlayer([ex], 'futo-1');
    Object.defineProperty(p, 'cur', { get: () => ex });
    p._setupCurrentExercise();
    expect(p.futoInputs).toHaveLength(size * size);
    expect(p.futoInputs.every(v => v === '')).toBe(true);
  });

  it('correct latin square passes check()', () => {
    const ex = mkEx();
    const p = seriesPlayer([ex], 'futo-2');
    Object.defineProperty(p, 'cur', { get: () => ex });
    p._markSolvedAndAdvance = vi.fn();
    p._flashError = vi.fn();
    // Valid 3×3 latin square: rows [1,2,3],[2,3,1],[3,1,2]
    p.futoInputs = ['1','2','3','2','3','1','3','1','2'];
    p.check();
    expect(p._markSolvedAndAdvance).toHaveBeenCalled();
    expect(p.futoErrors).toEqual([]);
  });

  it('row repeat triggers errors', () => {
    const ex = mkEx();
    const p = seriesPlayer([ex], 'futo-3');
    Object.defineProperty(p, 'cur', { get: () => ex });
    p._markSolvedAndAdvance = vi.fn();
    p._flashError = vi.fn();
    // Row 0 has [1,1,3] — duplicate
    p.futoInputs = ['1','1','3','2','3','1','3','2','2'];
    p.check();
    expect(p.futoErrors).toContain(0);
    expect(p.futoErrors).toContain(1);
    expect(p._flashError).toHaveBeenCalled();
  });

  it('column repeat triggers errors', () => {
    const ex = mkEx();
    const p = seriesPlayer([ex], 'futo-4');
    Object.defineProperty(p, 'cur', { get: () => ex });
    p._markSolvedAndAdvance = vi.fn();
    p._flashError = vi.fn();
    // Col 0 has [1,1,3] — duplicate
    p.futoInputs = ['1','2','3','1','3','2','3','1','2'];
    p.check();
    expect(p.futoErrors).toContain(0); // row0,col0
    expect(p.futoErrors).toContain(3); // row1,col0
    expect(p._flashError).toHaveBeenCalled();
  });

  it('violated hCon (<) triggers errors', () => {
    const ex = mkEx([], [{ r: 0, c: 0, sign: '<' }]); // cell[0,0] < cell[0,1]
    // Override rows to carry the hCon
    ex.futoshiki.rows[0].hCons[0] = '<';
    const p = seriesPlayer([ex], 'futo-5');
    Object.defineProperty(p, 'cur', { get: () => ex });
    p._markSolvedAndAdvance = vi.fn();
    p._flashError = vi.fn();
    // Violate: [0,0]=3, [0,1]=2 → 3 < 2 is false
    p.futoInputs = ['3','2','1','1','3','2','2','1','3'];
    p.check();
    expect(p.futoErrors).toContain(0);
    expect(p.futoErrors).toContain(1);
  });
});

// ─── KenKen Logic ────────────────────────────────────────────────────────────

describe('KenKen Logic', () => {
  // 3×3 with one + cage (top row) and two single cages
  const size = 3;
  const mkKKEx = (cages) => ({
    type: 'kenken',
    kenken: { size, cages, cells: [] },
  });

  it('_setupCurrentExercise initialises kkInputs', () => {
    const ex = mkKKEx([]);
    const p = seriesPlayer([ex], 'kk-1');
    Object.defineProperty(p, 'cur', { get: () => ex });
    p._setupCurrentExercise();
    expect(p.kkInputs).toHaveLength(size * size);
    expect(p.kkInputs.every(v => v === '')).toBe(true);
  });

  it('kkSetCell updates kkInputs and clears errors', () => {
    const ex = mkKKEx([]);
    const p = seriesPlayer([ex], 'kk-2');
    Object.defineProperty(p, 'cur', { get: () => ({ ...ex, kenken: { size, cages: [] } }) });
    p.kkInputs = Array(9).fill('');
    p.kkErrors = [0];
    p.kkSetCell(0, 0, '2');
    expect(p.kkInputs[0]).toBe('2');
    expect(p.kkErrors).toEqual([]);
  });

  it('correct 3×3 solution passes check()', () => {
    // Solution: [1,2,3],[2,3,1],[3,1,2]
    // Two single cages + one + cage covering row0
    const cages = [
      { op: '+', target: 6, cells: [[0,0],[0,1],[0,2]] },
      { op: '', target: 2, cells: [[1,0]] },
      { op: '+', target: 4, cells: [[1,1],[1,2]] },
      { op: '+', target: 4, cells: [[2,0],[2,1]] },
      { op: '', target: 2, cells: [[2,2]] },
    ];
    const ex = mkKKEx(cages);
    const p = seriesPlayer([ex], 'kk-3');
    Object.defineProperty(p, 'cur', { get: () => ex });
    p._markSolvedAndAdvance = vi.fn();
    p._flashError = vi.fn();
    p.kkInputs = ['1','2','3','2','3','1','3','1','2'];
    p.check();
    expect(p._markSolvedAndAdvance).toHaveBeenCalled();
    expect(p.kkErrors).toEqual([]);
  });

  it('wrong cage arithmetic triggers kkErrors', () => {
    const cages = [{ op: '+', target: 10, cells: [[0,0],[0,1],[0,2]] }]; // 1+2+3=6≠10
    const ex = mkKKEx(cages);
    const p = seriesPlayer([ex], 'kk-4');
    Object.defineProperty(p, 'cur', { get: () => ex });
    p._markSolvedAndAdvance = vi.fn();
    p._flashError = vi.fn();
    p.kkInputs = ['1','2','3','2','3','1','3','1','2'];
    p.check();
    expect(p.kkErrors).toContain(0);
    expect(p.kkErrors).toContain(1);
    expect(p.kkErrors).toContain(2);
    expect(p._flashError).toHaveBeenCalled();
  });

  it('row duplicate triggers kkErrors', () => {
    const cages = [{ op: '+', target: 6, cells: [[0,0],[0,1],[0,2]] }];
    const ex = mkKKEx(cages);
    const p = seriesPlayer([ex], 'kk-5');
    Object.defineProperty(p, 'cur', { get: () => ex });
    p._markSolvedAndAdvance = vi.fn();
    p._flashError = vi.fn();
    // Row 0: [1,1,1] — all same
    p.kkInputs = ['1','1','1','2','3','1','3','2','2'];
    p.check();
    expect(p.kkErrors.length).toBeGreaterThan(0);
    expect(p._flashError).toHaveBeenCalled();
  });
});

// ─── Numberlink Logic ────────────────────────────────────────────────────────

describe('Numberlink Logic', () => {
  // 4×4 grid with 2 pairs
  const mkNLEx = () => ({
    type: 'numberlink',
    numberlink: {
      size: 4,
      pairs: [[[0,0],[3,3]], [[0,3],[3,0]]],
      rows: [
        [1,0,0,2],
        [0,0,0,0],
        [0,0,0,0],
        [2,0,0,1],
      ],
    },
  });

  it('_setupCurrentExercise resets nlkPaths/Active/Errors', () => {
    const ex = mkNLEx();
    const p = seriesPlayer([ex], 'nl-1');
    Object.defineProperty(p, 'cur', { get: () => ex });
    p.nlkPaths = { 1: [[0,0]] };
    p.nlkActive = 1;
    p.nlkErrors = [[0,0]];
    p._setupCurrentExercise();
    expect(p.nlkPaths).toEqual({});
    expect(p.nlkActive).toBeNull();
    expect(p.nlkErrors).toEqual([]);
  });

  it('nlkTap starts path at an endpoint', () => {
    const ex = mkNLEx();
    const p = seriesPlayer([ex], 'nl-2');
    Object.defineProperty(p, 'cur', { get: () => ex });
    p.nlkPaths = {};
    p.nlkActive = null;
    p.nlkTap(0, 0); // endpoint for pair 1
    expect(p.nlkPaths[1]).toEqual([[0,0]]);
    expect(p.nlkActive).toBe(1);
  });

  it('nlkTap ignores non-endpoint when path empty', () => {
    const ex = mkNLEx();
    const p = seriesPlayer([ex], 'nl-3');
    Object.defineProperty(p, 'cur', { get: () => ex });
    p.nlkPaths = {};
    p.nlkActive = null;
    p.nlkTap(1, 1); // empty cell
    expect(p.nlkPaths).toEqual({});
    expect(p.nlkActive).toBeNull();
  });

  it('nlkTap extends path to adjacent cell', () => {
    const ex = mkNLEx();
    const p = seriesPlayer([ex], 'nl-4');
    Object.defineProperty(p, 'cur', { get: () => ex });
    p.nlkPaths = { 1: [[0,0]] };
    p.nlkActive = 1;
    p.nlkTap(0, 1);
    expect(p.nlkPaths[1]).toEqual([[0,0],[0,1]]);
  });

  it('nlkTap ignores non-adjacent cell', () => {
    const ex = mkNLEx();
    const p = seriesPlayer([ex], 'nl-5');
    Object.defineProperty(p, 'cur', { get: () => ex });
    p.nlkPaths = { 1: [[0,0]] };
    p.nlkActive = 1;
    p.nlkTap(2, 2); // diagonal — not adjacent
    expect(p.nlkPaths[1]).toEqual([[0,0]]);
  });

  it('nlkTap retracts last cell when tapping it again', () => {
    const ex = mkNLEx();
    const p = seriesPlayer([ex], 'nl-6');
    Object.defineProperty(p, 'cur', { get: () => ex });
    p.nlkPaths = { 1: [[0,0],[0,1]] };
    p.nlkActive = 1;
    p.nlkTap(0, 1);
    expect(p.nlkPaths[1]).toEqual([[0,0]]);
  });

  it('nlkReset clears all paths', () => {
    const ex = mkNLEx();
    const p = seriesPlayer([ex], 'nl-7');
    Object.defineProperty(p, 'cur', { get: () => ex });
    p.nlkPaths = { 1: [[0,0],[0,1]], 2: [[0,3]] };
    p.nlkActive = 2;
    p.nlkReset();
    expect(p.nlkPaths).toEqual({});
    expect(p.nlkActive).toBeNull();
  });

  it('nlkAllConnected returns false when paths incomplete', () => {
    const ex = mkNLEx();
    const p = seriesPlayer([ex], 'nl-8');
    Object.defineProperty(p, 'cur', { get: () => ex });
    p.nlkPaths = {};
    expect(p.nlkAllConnected()).toBe(false);
  });

  it('nlkAllConnected returns true when both pairs connected endpoint-to-endpoint', () => {
    const ex = mkNLEx();
    const p = seriesPlayer([ex], 'nl-9');
    Object.defineProperty(p, 'cur', { get: () => ex });
    p.nlkPaths = {
      1: [[0,0],[1,0],[2,0],[3,0],[3,1],[3,2],[3,3]],
      2: [[0,3],[1,3],[2,3],[3,3]], // won't work — shares endpoint, but logic check only cares about endpoints
    };
    // Override paths so pair 2 ends at [3,0]
    p.nlkPaths[2] = [[0,3],[0,2],[0,1],[1,1],[2,1],[3,1],[3,0]];
    expect(p.nlkAllConnected()).toBe(true);
  });
});
