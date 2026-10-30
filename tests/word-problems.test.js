import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { WORD_PROBLEM_CHECKS: C, checkTrace } = require('../scripts/lib/word-problems.js');
const { Unparseable } = require('../scripts/lib/arith.js');

const body =
  '<p>Une école achète <strong>8 classeurs à 4,50 € chacun</strong> et <strong>15 cahiers à 1,20 € chacun</strong>.</p>';

describe('problem: operation trace', () => {
  const ex = (operation, answers, b = body) => ({
    type: 'problem',
    title: 'Les classeurs',
    body: b,
    operation,
    answers,
  });

  it('accepts a correct multi-step trace, with units', () => {
    expect(C.problem(ex('8 × 4,50 = 36 €  ;  15 × 1,20 = 18 €  ;  36 − 18 = 18 €', ['18']))).toBeNull();
  });
  it('refuses a false step', () => {
    expect(C.problem(ex('8 × 4,50 = 32 ; 15 × 1,20 = 18 ; 32 − 18 = 14', ['14']))).toMatch(/false/);
  });
  it('refuses a declared answer the trace does not reach', () => {
    expect(C.problem(ex('8 × 4,50 = 36 ; 15 × 1,20 = 18 ; 36 − 18 = 18', ['16']))).toMatch(/gives 18/);
  });
  it('refuses a number that is not in the statement (« 4,50 », trace written with 4)', () => {
    expect(C.problem(ex('8 × 4 = 32 ; 15 × 1,20 = 18 ; 32 − 18 = 14', ['14']))).toMatch(/uses 4,/);
  });
  it('accepts percentages and whole ratios of given numbers', () => {
    const soldes = '<p>Un manteau à <strong>80 €</strong> a une <strong>réduction de 25 %</strong>.</p>';
    expect(C.problem(ex('80 × 0,25 = 20 ; 80 - 20 = 60', ['60'], soldes))).toBeNull();
    const lait = '<p><strong>6 briques</strong> coûtent <strong>5,40 €</strong>. Il en prend <strong>18</strong>.</p>';
    expect(C.problem(ex('5,40 × 3 = 16,20', ['16,20'], lait))).toBeNull();
  });
  it('accepts number words and rounding steps', () => {
    const b = '<p>Il y a <strong>douze</strong> œufs et <strong>85 + 35</strong> élèves en <strong>7</strong> bus.</p>';
    expect(C.problem(ex('12 × 2 = 24', ['24'], b.replace('douze', 'douze') + 'le double'))).toBeNull();
    expect(C.problem(ex('85 + 35 = 120 ; 120 ÷ 7 ≈ 17', ['17'], b))).toBeNull();
    expect(C.problem(ex('85 + 35 = 120 ; 120 ÷ 7 ≈ 15', ['15'], b))).toMatch(/round/);
  });
  it('leaves a problem without operation unchecked', () => {
    expect(() => C.problem(ex('', ['18']))).toThrow(Unparseable);
  });
});

describe('multi-question: per-question operation', () => {
  const ex = (ops, answers) => ({
    type: 'multi-question',
    title: 'Le marché',
    body: '<table><tr><td>Pommes</td><td>24</td><td>36</td></tr><tr><td>Poires</td><td>18</td><td>27</td></tr></table>',
    mqQuestions: answers.map((answer, i) => ({ text: 'Question ?', answer, operation: ops[i] })),
  });
  it('checks every question against the table', () => {
    expect(C['multi-question'](ex(['36 + 27 = 63', '36 − 24 = 12'], ['63', '12']))).toBeNull();
    expect(C['multi-question'](ex(['36 + 27 = 63', '36 − 24 = 12'], ['63', '11']))).toMatch(/question 2/);
  });
  it('stays unchecked while a question has no operation, but still reports a wrong one', () => {
    expect(() => C['multi-question'](ex(['36 + 27 = 63', ''], ['63', 'Nice']))).toThrow(Unparseable);
    expect(C['multi-question'](ex(['36 + 27 = 64', ''], ['64', 'Nice']))).toMatch(/question 1/);
  });
});

describe('inverse-problem', () => {
  const ip = (inverses) => ({
    type: 'inverse-problem',
    ipBase: { text: 'On installe <strong>6</strong> rangées de <strong>8</strong> chaises. Combien ?', answer: '48' },
    ipInverses: inverses,
  });
  it('accepts the same numbers swapped around', () => {
    expect(
      C['inverse-problem'](
        ip([
          { text: '<strong>48</strong> chaises en <strong>6</strong> rangées. Par rangée ?', answer: '8' },
          { text: '<strong>48</strong> chaises par <strong>8</strong>. Combien de rangées ?', answer: '6' },
        ])
      )
    ).toBeNull();
  });
  it('refuses a variant with other numbers or a wrong answer', () => {
    expect(
      C['inverse-problem'](ip([{ text: '<strong>40</strong> chaises en <strong>5</strong>.', answer: '8' }]))
    ).toMatch(/base problem/);
    expect(C['inverse-problem'](ip([{ text: '<strong>48</strong> en <strong>6</strong>.', answer: '6' }]))).toMatch(
      /uses/
    );
  });
  it('checks three-number proportions', () => {
    const recette = (a) => ({
      type: 'inverse-problem',
      ipBase: {
        text: 'Pour <strong>4</strong> personnes, <strong>0,6 kg</strong>. Pour <strong>10</strong> ?',
        answer: a,
      },
      ipInverses: [],
    });
    expect(C['inverse-problem'](recette('1,5'))).toBeNull();
    expect(C['inverse-problem'](recette('2,4'))).toMatch(/proportional/);
  });
});

describe('guided-problem', () => {
  const gp = (numbers, op, result, extra = []) => ({
    type: 'guided-problem',
    gpSteps: [
      { kind: 'numbers', tokens: numbers },
      ...extra,
      ...(op ? [{ kind: 'operation', choices: ['+', '−'], answers: [op] }] : []),
      { kind: 'calculate', answers: [result] },
    ],
  });
  it('combines the tapped numbers with the chosen operation, in either order for − and ÷', () => {
    expect(C['guided-problem'](gp(['12', '5'], '+', '17'))).toBeNull();
    expect(C['guided-problem'](gp(['5', '8'], '−', '3'))).toBeNull();
    expect(C['guided-problem'](gp(['12', '5'], '+', '18'))).toMatch(/does not give/);
    expect(C['guided-problem'](gp(['12', '5'], '−', '17'))).toMatch(/does not give/);
  });
  it('reads clock times and durations', () => {
    expect(C['guided-problem'](gp(['11 h 45', '1 heure 15 minutes'], '−', '10 h 30'))).toBeNull();
    expect(C['guided-problem'](gp(['20 h 15', '1 heure 40 minutes'], null, '21 h 55'))).toBeNull();
    expect(C['guided-problem'](gp(['20 h 15', '1 heure 40 minutes'], null, '21 h 45'))).toMatch(/does not give/);
  });
  it('checks an arithmetic convert step', () => {
    const convert = (a) => [{ kind: 'convert', question: '15 min + 40 min = ___ min', answers: [a] }];
    expect(C['guided-problem'](gp(['20 h 15', '1 heure 40 minutes'], null, '21 h 55', convert('55')))).toBeNull();
    expect(C['guided-problem'](gp(['20 h 15', '1 heure 40 minutes'], null, '21 h 55', convert('45')))).toMatch(
      /convert/
    );
  });
  it('leaves fraction results unchecked', () => {
    expect(() => C['guided-problem'](gp(['3', '8'], '−', '5/8'))).toThrow(Unparseable);
  });
});

describe('checkTrace', () => {
  it('fills a ? from the answers', () => {
    expect(checkTrace('45 + 15 = ? × 6', ['10'], '45 et 15, par 6')).toBeNull();
    expect(checkTrace('45 + 15 = ? × 6', ['12'], '45 et 15, par 6')).toMatch(/false/);
  });
});
