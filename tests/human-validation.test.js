import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'node:module';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Temporary records: never touch reports/human-validate.csv or reports/human-flags.json
const dir = mkdtempSync(join(tmpdir(), 'human-'));
process.env.HUMAN_CSV = join(dir, 'validate.csv');
process.env.HUMAN_FLAGS = join(dir, 'flags.json');
const require = createRequire(import.meta.url);
const {
  addFlag,
  resolveTarget,
  fingerprint,
  listSeries,
  loadGenerators,
  readFlags,
  readValidations,
  setFlag,
  status,
  unvalidateSeries,
  validateSeries,
  writeValidations,
} = require('../scripts/lib/human-validation.js');

const STATIC = 'a3f0b05b'; // hand-written series (emoji equations, CM1)
const GENERATED = 'b2025e33'; // generated series (sequences with a check cell, CM1)
const statusOf = (id) => status().find((s) => s.id === id);

beforeEach(() => {
  rmSync(process.env.HUMAN_CSV, { force: true });
  rmSync(process.env.HUMAN_FLAGS, { force: true });
});

describe('human validation', () => {
  it('a series is pending until validated, then ok', () => {
    expect(statusOf(STATIC).status).toBe('pending');
    const { files, previous } = validateSeries(STATIC);
    expect(files).toBeGreaterThan(0);
    expect(previous).toEqual([]);
    const s = statusOf(STATIC);
    expect(s.status).toBe('ok');
    expect(s.validated).toBe(s.total);
    expect(s.url).toBe(`/fr/exercices/${STATIC}/`);
  });

  it('a validated file whose content changed since is stale (regression)', () => {
    validateSeries(STATIC);
    const map = readValidations();
    const [first] = [...map.values()].filter((v) => v.seriesId === STATIC);
    map.set(first.path, { ...first, hash: 'deadbeefdeadbeef' }); // as if the file changed after validation
    writeValidations(map);
    const s = statusOf(STATIC);
    expect(s.status).toBe('stale');
    expect(s.stale).toHaveLength(1);
  });

  it("a generated exercise's fingerprint includes its generator code", () => {
    const series = listSeries().find((s) => s.id === GENERATED);
    const file = series.files[0];
    const gens = loadGenerators();
    const name = Object.keys(gens).find((k) =>
      require('node:fs').readFileSync(file, 'utf8').includes(`generator: ${k}`)
    );
    const before = fingerprint(file, gens);
    const edited = { ...gens, [name]: { generate: () => ({ type: 'sequence', changed: true }) } };
    expect(fingerprint(file, edited)).not.toBe(before);
  });

  it('undoing a first validation makes the series pending again and reopens the flags it closed', () => {
    const f = addFlag(STATIC, 'look at #1');
    const done = validateSeries(STATIC);
    expect(done.closedFlags).toEqual([f.id]);
    unvalidateSeries(STATIC, { previous: done.previous, reopen: done.closedFlags });
    expect(statusOf(STATIC).status).toBe('pending');
    expect([...readValidations().values()].filter((v) => v.seriesId === STATIC)).toEqual([]);
    expect(readFlags().find((x) => x.id === f.id).resolvedAt).toBeNull();
  });

  it('undoing a re-validation restores the previous (stale) validation, not a blank one', () => {
    validateSeries(STATIC);
    const map = readValidations();
    const [first] = [...map.values()].filter((v) => v.seriesId === STATIC);
    map.set(first.path, { ...first, hash: 'deadbeefdeadbeef', validatedAt: '2026-01-01T00:00:00.000Z' });
    writeValidations(map);
    const before = [...readValidations().values()].filter((v) => v.seriesId === STATIC);
    const done = validateSeries(STATIC);
    expect(statusOf(STATIC).status).toBe('ok');
    unvalidateSeries(STATIC, { previous: done.previous, reopen: done.closedFlags });
    expect([...readValidations().values()].filter((v) => v.seriesId === STATIC)).toEqual(before);
    expect(statusOf(STATIC).status).toBe('stale');
  });

  it('undo only touches its own series and flags closed by validation', () => {
    validateSeries(GENERATED);
    const other = [...readValidations().values()].filter((v) => v.seriesId === GENERATED);
    const f = addFlag(STATIC, 'closed by hand');
    setFlag(f.id, 'resolve');
    const done = validateSeries(STATIC);
    // A forged row for another series and a hand-closed flag are ignored
    unvalidateSeries(STATIC, { previous: [{ ...other[0], hash: 'x' }], reopen: [f.id] });
    expect([...readValidations().values()].filter((v) => v.seriesId === GENERATED)).toEqual(other);
    expect(readFlags().find((x) => x.id === f.id).resolvedBy).toBe('human');
    expect(done.closedFlags).toEqual([]);
  });

  it('status(id) returns just that series', () => {
    const one = status(STATIC);
    expect(one).toHaveLength(1);
    expect(one[0].id).toBe(STATIC);
  });

  it('series URLs use their section (applications, not exercices)', () => {
    expect(statusOf(GENERATED).url).toBe(`/fr/applications/${GENERATED}/`);
  });
});

describe('flags', () => {
  it('adds a flag from a URL (keeping the #n anchor), without duplicates', () => {
    const f = addFlag(`http://localhost:8080/fr/exercices/${STATIC}/#2`, 'check the wording');
    expect(f.url).toBe(`/fr/exercices/${STATIC}/#2`);
    expect(f.seriesId).toBe(STATIC);
    expect(addFlag(`/fr/exercices/${STATIC}/#2`, 'check the wording').id).toBe(f.id);
    expect(readFlags()).toHaveLength(1);
  });

  it('resolves a target given as id, URL or path', () => {
    expect(resolveTarget(STATIC).series.id).toBe(STATIC);
    expect(resolveTarget(`http://localhost:8080/fr/exercices/${STATIC}/#4`)).toMatchObject({ anchor: '#4' });
    expect(() => resolveTarget('zzzzzzzz')).toThrow(/unknown series/);
  });

  it('refuses an unknown series', () => {
    expect(() => addFlag('zzzzzzzz', 'nope')).toThrow(/unknown series/);
  });

  it('validating the series resolves its open flags; a flag can be reopened', () => {
    const f = addFlag(STATIC, 'look at #3');
    validateSeries(STATIC);
    const resolved = readFlags().find((x) => x.id === f.id);
    expect(resolved.resolvedBy).toBe('validated');
    setFlag(f.id, 'reopen');
    expect(readFlags().find((x) => x.id === f.id).resolvedAt).toBeNull();
    setFlag(f.id, 'resolve');
    expect(readFlags().find((x) => x.id === f.id).resolvedBy).toBe('human');
  });
});

// Leave nothing behind
process.on('exit', () => rmSync(dir, { recursive: true, force: true }));
writeFileSync(join(dir, '.keep'), '');
