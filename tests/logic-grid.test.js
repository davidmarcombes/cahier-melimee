import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { cluesOf, parseClue, solveGrid } = require('../scripts/lib/logic-grid.js');

const SPORTS = { columns: ['Amir', 'Chloé', 'Théo'], rows: ['Football', 'Tennis', 'Natation'] };
const body = (...clues) => '\n' + clues.map((c) => `- ${c}`).join('\n') + '\n';

describe('logic grid clues', () => {
  it('reads the markdown list items of the body', () => {
    expect(cluesOf('\nIntro.\n\n- Un.\n* Deux.\n1. Trois.\n')).toEqual(['Un.', 'Deux.', 'Trois.']);
  });

  it('reads negative and positive direct clues, accents and case aside', () => {
    expect(parseClue('Théo ne fait ni football ni tennis.', SPORTS.columns, SPORTS.rows)).toEqual({
      pairs: [
        ['Théo', 'Football'],
        ['Théo', 'Tennis'],
      ],
      negated: true,
    });
    expect(parseClue("Chloé n'aime pas la natation.", SPORTS.columns, SPORTS.rows).negated).toBe(true);
    expect(parseClue('Amir préfère le TENNIS.', SPORTS.columns, SPORTS.rows)).toEqual({
      pairs: [['Amir', 'Tennis']],
      negated: false,
    });
  });

  it('does not read descriptive clues', () => {
    expect(parseClue('Amir dribble avec un ballon.', SPORTS.columns, SPORTS.rows)).toBeNull();
  });
});

describe('logic grid solutions', () => {
  it('finds two solutions when a clue is implied by the others (da73b97f #2, before the fix)', () => {
    const r = solveGrid({
      ...SPORTS,
      body: body('Théo ne fait ni football ni tennis.', "Chloé n'aime pas la natation."),
    });
    expect(r.checked).toBe(true);
    expect(r.solutions).toHaveLength(2);
  });

  it('finds the single solution of a well-formed grid', () => {
    const r = solveGrid({
      ...SPORTS,
      body: body('Théo ne fait ni football ni tennis.', 'Chloé ne joue pas au tennis.'),
    });
    expect(r.solutions).toEqual([{ Amir: 'Tennis', Chloé: 'Football', Théo: 'Natation' }]);
  });

  it('finds no solution when the clues contradict', () => {
    const r = solveGrid({ ...SPORTS, body: body('Théo préfère le tennis.', 'Théo ne fait pas de tennis.') });
    expect(r.solutions).toEqual([]);
  });

  it('leaves grids with a descriptive clue to the human check', () => {
    const r = solveGrid({
      ...SPORTS,
      body: body('Théo ne fait ni football ni tennis.', 'Amir frappe une balle jaune.'),
    });
    expect(r.checked).toBe(false);
  });
});
