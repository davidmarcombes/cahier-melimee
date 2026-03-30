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
