#!/usr/bin/env node
/**
 * check-answers.js — answer oracle. Recomputes expected answers independently of what the
 * content declares, so "7 × 8 = ?" with answer 54 fails even though the page would accept 54.
 *
 *   Static exercises: read from the BUILT pages (_site/), i.e. exactly what students see.
 *   Generated exercises: each generator is run GEN_RUNS times with its file's params.
 *
 * Each check substitutes the declared answer into the question and verifies it (equation holds,
 * sequence step is constant, pyramid cells are sums, conversion factor is right…). Anything the
 * oracle cannot parse with confidence is counted as "unchecked", never as an error.
 *
 * Usage: node scripts/check-answers.js [--verbose]   (requires a build: npm run build:e2e)
 */
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const ROOT = path.join(__dirname, '..');
const SITE = path.join(ROOT, process.env.SITE_OUT || '_site', 'fr');
const GEN_RUNS = 20;
const VERBOSE = process.argv.includes('--verbose');

const { Unparseable, clean, tokenize, evaluate, num, same, fmt, checkEquation } = require('./lib/arith.js');
const { GEN_CHECKS } = require('./lib/gen-checks.js');

// ─── Units ────────────────────────────────────────────────────────────────────

const UNITS = {};
const scale = (dim, list) => list.forEach(([u, f]) => (UNITS[u] = { dim, f }));
scale('m', [
  ['km', 1000],
  ['hm', 100],
  ['dam', 10],
  ['m', 1],
  ['dm', 0.1],
  ['cm', 0.01],
  ['mm', 0.001],
]);
scale('g', [
  ['t', 1e6],
  ['q', 1e5],
  ['kg', 1000],
  ['hg', 100],
  ['dag', 10],
  ['g', 1],
  ['dg', 0.1],
  ['cg', 0.01],
  ['mg', 0.001],
]);
scale('L', [
  ['kL', 1000],
  ['hL', 100],
  ['daL', 10],
  ['L', 1],
  ['l', 1],
  ['dL', 0.1],
  ['dl', 0.1],
  ['cL', 0.01],
  ['cl', 0.01],
  ['mL', 0.001],
  ['ml', 0.001],
]);
scale('s', [
  ['j', 86400],
  ['h', 3600],
  ['min', 60],
  ['s', 1],
]);
scale('€', [
  ['€', 1],
  ['c', 0.01],
]);

// "2 h 30 min", "1,5 km", "3 t" → { dim, value in base unit }
function quantity(text) {
  const s = clean(text)
    .replace(/ ?= ?\.*$/, '')
    .replace(/\.{2,}|…/g, '')
    .trim();
  const parts = s.match(/[0-9][0-9 ]*(?:[.,][0-9]+)? ?[a-zA-Z€]+/g);
  if (!parts || parts.join('').replace(/ /g, '') !== s.replace(/ /g, '')) throw new Unparseable('quantity ' + s);
  let dim = null,
    total = 0;
  for (const p of parts) {
    const m = p.match(/^([0-9][0-9 ]*(?:[.,][0-9]+)?) ?([a-zA-Z€]+)$/);
    const u = UNITS[m[2]];
    if (!u) throw new Unparseable('unit ' + m[2]);
    if (dim && dim !== u.dim) throw new Unparseable('mixed dims');
    dim = u.dim;
    total += num(m[1]) * u.f;
  }
  return { dim, value: total };
}

// ─── Per-type checks: return null (ok), a string (error), or throw Unparseable ─

const numericList = (list) => list.map((x) => num(x));

function constantStep(values) {
  if (values.length < 3) throw new Unparseable('too short');
  const d = values[1] - values[0];
  if (values.every((v, i) => i === 0 || same(v - values[i - 1], d))) return null;
  if (values[0] !== 0) {
    const r = values[1] / values[0];
    if (values.every((v, i) => i === 0 || same(v / values[i - 1], r))) return null;
  }
  return `sequence ${values.map(fmt).join(', ')} has no constant step`;
}

const timeToMin = (s) => {
  const m = clean(s).match(/^([0-9]{1,2}) ?h ?([0-9]{2})?(?: ?min)?$/);
  if (!m) throw new Unparseable('time ' + s);
  return Number(m[1]) * 60 + Number(m[2] || 0);
};

const CHECKS = {
  'number-check': (e) => {
    if (!clean(e.operation)) throw new Unparseable('no operation');
    const err = checkEquation(e.operation, e.answers || []);
    // Euclidean division ("Écris le quotient entier", "… reste 1"): the whole quotient is expected
    if (err && !clean(e.operation).includes('?') && /quotient|reste/i.test(clean(`${e.title} ${e.body}`))) {
      const q = Math.floor(num(e.operation));
      if ((e.answers || []).some((a) => same(num(a), q))) return null;
    }
    return err;
  },
  estimation: (e) => checkEquation(e.operation, e.answers || []),
  'calc-chain': (e) => {
    let cur = num(e.chain.start);
    for (const [i, s] of e.chain.steps.entries()) {
      cur = num(`${fmt(cur)} ${s.op}`);
      if (!same(cur, num(s.answer))) return `step ${i + 1} (${s.op}) gives ${fmt(cur)}, declared ${s.answer}`;
    }
    return null;
  },
  pyramid: (e) => {
    const rows = e.pyramid.rows;
    const add = rows.every(
      (row, r) => r === rows.length - 1 || row.every((v, c) => same(v, rows[r + 1][c] + rows[r + 1][c + 1]))
    );
    const mul = rows.every(
      (row, r) => r === rows.length - 1 || row.every((v, c) => same(v, rows[r + 1][c] * rows[r + 1][c + 1]))
    );
    if (!add && !mul) return 'a cell is not the sum (nor product) of the two below';
    // Solvable by a child: every hidden cell must follow from ONE addition or subtraction of
    // known neighbours, repeatedly. A pyramid needing algebra (2 160 + 3 × ? = 3 240) is refused.
    const known = e.pyramid.given.map((row) => [...row]);
    let changed = true;
    while (changed) {
      changed = false;
      for (let r = 0; r < known.length - 1; r++)
        for (let c = 0; c < known[r].length; c++) {
          const p = known[r][c],
            a = known[r + 1][c],
            b = known[r + 1][c + 1];
          if (!p && a && b) changed = known[r][c] = true;
          if (p && a && !b) changed = known[r + 1][c + 1] = true;
          if (p && !a && b) changed = known[r + 1][c] = true;
        }
    }
    return known.every((row) => row.every(Boolean))
      ? null
      : 'not solvable step by step (needs algebra) — reveal one more cell so each hidden cell follows from one + or − of known neighbours';
  },
  'tri-arith': (e) => {
    const [A, B, C] = e.triangle.vertices.map(Number),
      [f, d, g] = e.triangle.edges.map(Number);
    const sum = same(f, A + B) && same(d, A + C) && same(g, B + C);
    const prod = same(f, A * B) && same(d, A * C) && same(g, B * C);
    return sum || prod ? null : 'an edge is not the sum/product of its vertices';
  },
  'column-op': (e) => {
    const c = e.colOp;
    const top = num(c.top.join('')),
      bottom = num((c.bottom || []).join(''));
    let k = 0;
    const res = num(c.result.map((d) => (d === '?' ? e.answers[k++] : d)).join(''));
    const want = num(`${top} ${c.operation} ${bottom}`);
    return same(res, want) ? null : `${top} ${c.operation} ${bottom} = ${fmt(want)}, answer digits give ${fmt(res)}`;
  },
  sequence: (e) => {
    const s = e.sequence;
    if (s.items) {
      const raw = s.items.map((it) => (it.blank ? it.answer : it.value));
      const vals = s.timeMode ? raw.map(timeToMin) : numericList(raw);
      return constantStep(vals);
    }
    return constantStep(numericList([...s.given, ...s.answers]));
  },
  compare: (e) => {
    for (const c of e.comparisons) {
      const l = num(c.left),
        r = num(c.right);
      const sign = same(l, r) ? '=' : l < r ? '<' : '>';
      if (sign !== c.answer) return `${c.left} ${sign} ${c.right}, declared ${c.answer}`;
    }
    return null;
  },
  bounding: (e) => {
    const n = num(e.bounding.number);
    const [lo, hi] = e.bounding.answers.map(num);
    return lo <= n && n <= hi && lo < hi ? null : `${fmt(n)} is not between ${fmt(lo)} and ${fmt(hi)}`;
  },
  convert: (e) => {
    const { items, answers } = e.convert;
    for (const [i, it] of items.entries()) {
      const q = quantity(it.prompt);
      const u = UNITS[clean(it.unit)];
      if (!u) throw new Unparseable('unit ' + it.unit);
      if (u.dim !== q.dim) return `${it.prompt} cannot be converted to ${it.unit}`;
      const want = q.value / u.f;
      if (!same(want, num(answers[i]))) return `${clean(it.prompt)} = ${fmt(want)} ${it.unit}, declared ${answers[i]}`;
    }
    return null;
  },
  'fact-family': (e) => {
    for (const q of e.ffEquations) {
      const v = num(clean(q.expr).replace(/=$/, ''));
      if (!same(v, num(q.answer))) return `${q.expr} ${fmt(v)}, declared ${q.answer}`;
    }
    return null;
  },
  'base-10': (e) => {
    const b = e.base10;
    const v = b.number || (b.hundreds || 0) * 100 + (b.tens || 0) * 10 + (b.ones || 0);
    return e.answers.some((a) => same(num(a), v)) ? null : `blocks show ${v}, declared ${e.answers.join(' / ')}`;
  },
  clock: (e) => {
    const ok = e.answers.some((a) => {
      const m = clean(a).match(/^([0-9]{1,2}) ?[:h] ?([0-9]{2})$/);
      return m && Number(m[1]) % 12 === e.hour % 12 && Number(m[2]) === e.minute;
    });
    return ok ? null : `clock shows ${e.hour}:${String(e.minute).padStart(2, '0')}, declared ${e.answers.join(' / ')}`;
  },
  fraction: (e) => {
    const f = e.fraction;
    return e.answers.some((a) => same(num(a), f.numerator / f.denominator))
      ? null
      : `shape shows ${f.numerator}/${f.denominator}, declared ${e.answers.join(' / ')}`;
  },
  'fraction-check': (e) => {
    if (!clean(e.operation)) throw new Unparseable('no operation');
    const v = num(clean(e.operation).replace(/=\s*\?$/, ''));
    return e.answers.some((a) => same(num(a), v))
      ? null
      : `${clean(e.operation)} = ${fmt(v)}, declared ${e.answers.join(' / ')}`;
  },
  'true-false': (e) => {
    let checked = 0;
    for (const s of e.statements) {
      const t = clean(s.text).replace(/[.!]$/, '');
      let toks;
      try {
        toks = tokenize(t);
      } catch {
        continue;
      }
      const rel = toks.findIndex((k) => k.t === '=' || k.t === '<' || k.t === '>');
      if (rel < 0 || toks.some((k) => k.t === '?')) continue;
      let l, r;
      try {
        l = evaluate(toks.slice(0, rel));
        r = evaluate(toks.slice(rel + 1));
      } catch {
        continue;
      }
      const truth = toks[rel].t === '=' ? same(l, r) : toks[rel].t === '<' ? l < r : l > r;
      checked++;
      if (truth !== s.answer) return `"${t}" is ${truth ? 'true' : 'false'}, declared ${s.answer}`;
    }
    if (!checked) throw new Unparseable('no arithmetic statement');
    return null;
  },
  'error-analysis': (e) => {
    const steps = e.eaSteps || e.steps || [];
    if (e.wrongStep !== steps.length - 1 || !/^=/.test(clean(steps[steps.length - 1])))
      throw new Unparseable('not a final-result error');
    const v = num(steps[0]);
    if (same(v, num(clean(steps[steps.length - 1]).slice(1))))
      return `the "wrong" step ${clean(steps[steps.length - 1])} is actually correct`;
    return same(v, num(e.correction)) ? null : `${clean(steps[0])} = ${fmt(v)}, correction declared ${e.correction}`;
  },
  'number-forms': (e) => {
    const target = num(e.forms.target);
    for (const r of e.forms.rows) {
      const v = num(`${r.before} ${r.answer} ${r.after}`);
      if (!same(v, target)) return `${r.before} ${r.answer} ${r.after} = ${fmt(v)}, not ${e.forms.target}`;
    }
    return null;
  },
  'op-triangle': (e) => {
    const { nodes, ops, answers } = e.opTri;
    const val = (c) => num(c.blank ? answers[c.idx] : c.value);
    const [a, b, c] = nodes.map(val);
    const [k1, k2, k3] = ops.map(val);
    const f = (x, k) => (ops[0].sign === ':' ? x / k : x * k);
    return same(f(a, k1), b) && same(f(b, k2), c) && same(f(a, k3), c) ? null : 'chain and shortcut disagree';
  },
  'emoji-equations': (e) => {
    const val = {};
    for (const { lhs, rhs } of e.eqLines) {
      const m = clean(lhs).match(/^([0-9]+) × (.+)$/);
      const terms = m ? Array(Number(m[1])).fill(m[2]) : clean(lhs).split(' + ');
      const unknown = [...new Set(terms.filter((t) => !(t in val)))];
      if (unknown.length !== 1)
        return `line "${clean(lhs)}" has ${unknown.length} unknowns — not solvable line by line`;
      const known = terms.filter((t) => t in val).reduce((s, t) => s + val[t], 0);
      val[unknown[0]] = (num(rhs) - known) / terms.filter((t) => t === unknown[0]).length;
    }
    const q = clean(e.eqQuestion)
      .split(/ ([+×]) /)
      .map((t) => (t === '+' || t === '×' ? t : t in val ? fmt(val[t]) : null));
    if (q.includes(null)) return 'question uses an emoji with no value';
    const v = num(q.join(' '));
    return e.answers.some((a) => same(num(a), v))
      ? null
      : `${clean(e.eqQuestion)} = ${fmt(v)}, declared ${e.answers.join(' / ')}`;
  },
};
CHECKS['compare-expressions'] = CHECKS.compare;

// ─── Run ──────────────────────────────────────────────────────────────────────

const stats = {}; // type → { ok, unchecked, errors }
const errors = [];
const unparsed = {};
// Per series, per exercise ("unit": a static exercise, or a generated file and all its draws):
// true when every answer of the unit was recomputed and correct → reports/oracle-coverage.json
const coverage = {}; // seriesId → { unitKey → boolean }

function run(item, where, unit) {
  const t = item.type || 'number-check';
  const st = (stats[t] ??= { ok: 0, unchecked: 0, errors: 0 });
  // A generator check (by name) recomputes what the type check cannot read
  const genCheck = unit && unit.gen && GEN_CHECKS[unit.gen];
  const check = genCheck ? (it) => genCheck(it, unit.params || {}) : CHECKS[t];
  // Static exercise: one run. Generated file: verified when at least one of its draws was
  // recomputed (a wrong draw fails the whole run anyway) — keeps the file stable across random draws
  const mark = (ok) => {
    if (!unit || !unit.series) return;
    const cov = (coverage[unit.series] ??= {});
    cov[unit.key] = unit.generated ? Boolean(cov[unit.key]) || ok : (cov[unit.key] ?? true) && ok;
  };
  if (!check) return mark(false);
  try {
    const err = check(item);
    if (err) {
      st.errors++;
      errors.push(`${where} (${t}): ${err}`);
      mark(false);
    } else {
      st.ok++;
      mark(true);
    }
  } catch (e) {
    mark(false);
    if (!(e instanceof Unparseable)) {
      st.errors++;
      errors.push(`${where} (${t}): oracle crashed — ${e.message}`);
      return;
    }
    st.unchecked++;
    (unparsed[t] ??= []).push(`${where}: ${e.message}`);
  }
}

// Series id → source folder, for readable locations
const idToDir = {};
const walk = (d) =>
  fs
    .readdirSync(d, { withFileTypes: true })
    .flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
for (const sec of ['exercices', 'applications', 'defis']) {
  for (const f of walk(path.join(ROOT, 'src', 'fr', sec)).filter((f) => f.endsWith('index.yaml'))) {
    const id = yaml.load(fs.readFileSync(f, 'utf8'))?.id;
    if (id) idToDir[id] = path.relative(ROOT, path.dirname(f)).split(path.sep).join('/');
  }
}

const dirToId = Object.fromEntries(Object.entries(idToDir).map(([id, dir]) => [dir, id]));

// 1. Static exercises, from the built pages
if (!fs.existsSync(SITE)) {
  console.error('No _site/ — run npm run build:e2e first.');
  process.exit(2);
}
const PAYLOAD = /x-data='(?:seriesPlayer|timedPlayer)\((\[[\s\S]*?\]), "([a-z0-9]+)"/;
for (const sec of ['exercices', 'applications', 'defis']) {
  const dir = path.join(SITE, sec);
  if (!fs.existsSync(dir)) continue;
  for (const id of fs.readdirSync(dir)) {
    const f = path.join(dir, id, 'index.html');
    if (!fs.existsSync(f)) continue;
    const m = fs.readFileSync(f, 'utf8').match(PAYLOAD);
    if (!m) continue;
    JSON.parse(m[1]).forEach((ex, i) => {
      if (!ex._gen) run(ex, `${idToDir[id] || sec + '/' + id} #${i + 1}`, { series: id, key: `#${i}` });
    });
  }
}

// 2. Generated exercises: run each generator with its file's params
global.clockSvg = () => '<svg/>';
const generators = require('../src/assets/js/generators/index.js');
for (const sec of ['exercices', 'applications', 'defis']) {
  for (const f of walk(path.join(ROOT, 'src', 'fr', sec)).filter((f) => f.endsWith('.md'))) {
    const parts = fs.readFileSync(f, 'utf8').split('---');
    if (parts.length < 3) continue;
    const d = yaml.load(parts[1]) || {};
    const gen = d.generator && generators[d.generator];
    if (!gen) continue;
    const rel = path.relative(ROOT, f).split(path.sep).join('/');
    const unit = {
      series: dirToId[path.dirname(rel)],
      key: rel,
      generated: true,
      gen: d.generator,
      params: d.params || {},
    };
    for (let k = 0; k < GEN_RUNS; k++)
      run(gen.generate(JSON.parse(JSON.stringify(d.params || {}))), `${rel} [${d.generator} draw ${k + 1}]`, unit);
  }
}

// ─── Report ───────────────────────────────────────────────────────────────────

const tot = Object.values(stats).reduce(
  (a, s) => ({ ok: a.ok + s.ok, unchecked: a.unchecked + s.unchecked, errors: a.errors + s.errors }),
  { ok: 0, unchecked: 0, errors: 0 }
);
if (VERBOSE) {
  console.log('\nType'.padEnd(22) + 'ok'.padStart(7) + 'unchecked'.padStart(11) + 'errors'.padStart(8));
  for (const [t, s] of Object.entries(stats).sort())
    console.log(
      t.padEnd(21) + String(s.ok).padStart(7) + String(s.unchecked).padStart(11) + String(s.errors).padStart(8)
    );
  for (const [t, list] of Object.entries(unparsed))
    console.log(`\nUnchecked ${t} (sample):\n  ${list.slice(0, 5).join('\n  ')}`);
}
// --unchecked=<type>: list why each exercise of that type could not be checked (to extend the oracle)
const dumpType = (process.argv.find((a) => a.startsWith('--unchecked=')) || '').slice(12);
if (dumpType) for (const l of unparsed[dumpType] || []) console.log('UNCHECKED ' + l);
if (errors.length) {
  // Generated: one line per file+problem, not per draw
  const seen = new Set();
  const uniq = errors.filter((e) => {
    const key = e.replace(/ draw [0-9]+\]/, ']').replace(/: .*$/, '');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  console.error(`\n✗ Answer oracle: ${uniq.length} wrong answer(s)`);
  for (const e of uniq) console.error('  - ' + e);
  process.exit(1);
}
// Coverage per series, for the admin dashboard's « MV » (machine-verified) column. Written only
// when every recomputed answer is correct. Sorted keys, no timestamp: the file only changes when
// coverage does.
const covOut = {};
for (const id of Object.keys(coverage).sort()) {
  const units = Object.values(coverage[id]);
  covOut[id] = { verified: units.filter(Boolean).length, total: units.length };
}
fs.writeFileSync(path.join(ROOT, 'reports', 'oracle-coverage.json'), JSON.stringify(covOut, null, 1) + '\n');
console.log(`✓ Answer oracle: ${tot.ok} answers recomputed and correct (${tot.unchecked} not machine-checkable)`);
