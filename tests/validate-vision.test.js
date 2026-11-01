import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { corrupt, untrustedBatches, fileVerdict } = require('../scripts/validate-vision.js');

describe('canaries: a wrong claim of the same shape', () => {
  it('changes every kind of claim', () => {
    const claims = [
      { kind: 'number', claim: '18' },
      { kind: 'number', claim: '3,5' },
      { kind: 'clock', claim: '4:25' },
      { kind: 'choice', claim: 'Autant' },
      { kind: 'coord', claim: '(2 ; 3)', x: 2, y: 3 },
      { kind: 'tiles', claim: 'tuiles 1, 3', tiles: [0, 2], n: 4 },
      { kind: 'fraction', claim: 'la figure est partagée en 6 parts égales', den: 6 },
      {
        kind: 'questions',
        claim: 'Mardi ? → 18 ; Quel jour ? → mercredi',
        texts: ['Mardi ?', 'Quel jour ?'],
        answers: ['18', 'mercredi'],
        step: 2,
      },
    ];
    for (const c of claims) {
      const wrong = corrupt(c);
      expect(wrong, c.kind).toBeTruthy();
      expect(wrong, c.kind).not.toBe(c.claim);
    }
    expect(corrupt({ kind: 'questions', texts: ['Mardi ?'], answers: ['18'], step: 2 })).toBe('Mardi ? → 20');
  });
  it('gives up when no wrong claim of that shape exists', () => {
    expect(corrupt({ kind: 'tiles', claim: 'tuiles 1, 2', tiles: [0, 1], n: 2 })).toBeNull();
    expect(corrupt({ kind: 'number', claim: 'mercredi' })).toBeNull();
  });
});

describe('import', () => {
  const manifest = {
    '001-01': { batch: 'batch-001', canary: false },
    '001-02': { batch: 'batch-001', canary: true },
    '002-01': { batch: 'batch-002', canary: false },
    '002-02': { batch: 'batch-002', canary: true },
    '003-01': { batch: 'batch-003', canary: true },
  };
  it('ignores a batch that accepted a planted wrong answer or did not judge it', () => {
    const results = {
      '001-02': { verdict: 'INCORRECT' },
      '002-02': { verdict: 'CORRECT' },
    };
    expect(Object.keys(untrustedBatches(manifest, results))).toEqual(['batch-002', 'batch-003']);
  });
  it('a file is ok only when every item is CORRECT, and waits for all its results', () => {
    expect(fileVerdict([{ verdict: 'CORRECT' }, { verdict: 'CORRECT' }])).toBe('ok');
    expect(fileVerdict([{ verdict: 'CORRECT' }, { verdict: 'UNREADABLE' }])).toBe('fail');
    expect(fileVerdict([{ verdict: 'INCORRECT' }])).toBe('fail');
    expect(fileVerdict([{ verdict: 'CORRECT' }, undefined])).toBeNull();
  });
});
