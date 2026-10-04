/**
 * Per-generator answer checks for the oracle (scripts/check-answers.js), tested by
 * tests/gen-checks.test.js on real draws and on corrupted answers.
 */
const { Unparseable, clean, num, same, fmt, checkEquation } = require('./arith.js');

// Generated exercises whose answer is not an "operation = ?" the type checks can read. Each check
// recomputes the answer from what the pupil SEES (title, labels, tiles, rule text) — never from
// the generator's own helpers, which would only re-run the same code. (item, params) → null | error

const strongOf = (html) => {
  const m = String(html || '').match(/<strong>([^<]+)<\/strong>/);
  if (!m) throw new Unparseable('no <strong> value');
  return num(m[1]);
};

const ROMAN = [
  [1000, 'M'],
  [900, 'CM'],
  [500, 'D'],
  [400, 'CD'],
  [100, 'C'],
  [90, 'XC'],
  [50, 'L'],
  [40, 'XL'],
  [10, 'X'],
  [9, 'IX'],
  [5, 'V'],
  [4, 'IV'],
  [1, 'I'],
];
const toRoman = (n) =>
  ROMAN.reduce((s, [v, r]) => {
    while (n >= v) {
      s += r;
      n -= v;
    }
    return s;
  }, '');
const fromRoman = (s) => {
  const val = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  let total = 0;
  for (let i = 0; i < s.length; i++) {
    const v = val[s[i]];
    if (!v) throw new Unparseable('roman ' + s);
    total += v < (val[s[i + 1]] || 0) ? -v : v;
  }
  if (toRoman(total) !== s) return NaN; // not in canonical form (IIII, VX…)
  return total;
};

// Venn labels as displayed → predicate
function vennRule(label) {
  const l = clean(label).toLowerCase();
  let m;
  if (l === 'nombre pair') return (n) => n % 2 === 0;
  if (l === 'nombre impair') return (n) => n % 2 !== 0;
  if (l === 'nombre premier')
    return (n) => n > 1 && Array.from({ length: Math.floor(Math.sqrt(n)) - 1 }, (_, i) => i + 2).every((d) => n % d);
  if ((m = l.match(/^multiple de (\d+)$/))) return (n) => n % Number(m[1]) === 0;
  if ((m = l.match(/^diviseur de (\d+)$/))) return (n) => n > 0 && Number(m[1]) % n === 0;
  if ((m = l.match(/^inférieur à (\d+)$/))) return (n) => n < Number(m[1]);
  if ((m = l.match(/^supérieur à (\d+)$/))) return (n) => n > Number(m[1]);
  throw new Unparseable('venn label ' + label);
}

// "🍉 🍉 + 🍉 🍉 🍉 🍉" → "2 + 4": each operand made of repeated symbols becomes its count
function countSymbols(operation) {
  return String(operation)
    .split(/\s*([+−\-×÷:=])\s*/)
    .map((part, i) => {
      if (i % 2 === 1 || /^[0-9 ,?]+$/.test(part.trim())) return part;
      return String(part.trim().split(/\s+/).filter(Boolean).length);
    })
    .join(' ');
}

// French number words → number, strict (one « mille », known words only): « quatre-vingt-trois
// mille soixante-trois » → 83063. Written independently of the generators' number-to-words.
const WORDS = {
  zéro: 0,
  un: 1,
  une: 1,
  deux: 2,
  trois: 3,
  quatre: 4,
  cinq: 5,
  six: 6,
  sept: 7,
  huit: 8,
  neuf: 9,
  dix: 10,
  onze: 11,
  douze: 12,
  treize: 13,
  quatorze: 14,
  quinze: 15,
  seize: 16,
  vingt: 20,
  vingts: 20,
  trente: 30,
  quarante: 40,
  cinquante: 50,
  soixante: 60,
};
function wordsToNumber(text) {
  const words = clean(text)
    .toLowerCase()
    .split(/[\s-]+/)
    .filter((w) => w && w !== 'et');
  let total = 0,
    cur = 0,
    thousands = false;
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (w === 'mille') {
      if (thousands) throw new Unparseable('two « mille » in ' + text);
      thousands = true;
      total = (cur || 1) * 1000;
      cur = 0;
    } else if (w === 'cent' || w === 'cents') cur = (cur || 1) * 100;
    else if ((w === 'vingt' || w === 'vingts') && words[i - 1] === 'quatre') cur += 80 - 4;
    else if (w in WORDS) cur += WORDS[w];
    else throw new Unparseable('word ' + w);
  }
  return total + cur;
}

const PLACES = {
  unités: 1,
  dizaines: 10,
  centaines: 100,
  milliers: 1000,
  'dizaines de milliers': 10000,
  'centaines de milliers': 100000,
  dixièmes: 0.1,
  centièmes: 0.01,
  millièmes: 0.001,
};
const placeOf = (word) => {
  const p =
    PLACES[
      clean(word)
        .toLowerCase()
        .replace(/^(unité|dizaine|centaine|millier|dixième|centième|millième)(?!s)/, '$1s') // 1 dizaine de milliers
    ];
  if (!p) throw new Unparseable('place ' + word);
  return p;
};
const isPlaceComponent = (v) => v > 0 && /^[1-9]0*$|^0[.,]0*[1-9]$/.test(fmt(v).replace(',', '.'));

// HTML fraction spans → "n/d", then "a + n/d + …" → value
const fracText = (html) =>
  clean(
    String(html)
      .replace(/<span class="fn">([^<]*)<\/span><span class="fd">([^<]*)<\/span>/g, '$1/$2')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  );
const fracValue = (html) => num(fracText(html));

// « deux dixièmes », « douze dix-neuvièmes », « trois quarts » → [n, d]
const ORDINALS = { demi: 2, demis: 2, tiers: 3, quart: 4, quarts: 4 };
function fractionWords(text) {
  const words = clean(text).toLowerCase().split(/\s+/);
  const last = words.pop();
  let d = ORDINALS[last];
  if (!d) {
    const base = last.replace(/ièmes?$/, '');
    if (base === last) throw new Unparseable('ordinal ' + last);
    const fix = base.replace(/neuv$/, 'neuf').replace(/cinqu$/, 'cinq');
    try {
      d = wordsToNumber(fix);
    } catch {
      d = wordsToNumber(fix + 'e'); // quatr(e), onz(e), douz(e), seiz(e), trent(e)…
    }
  }
  return [wordsToNumber(words.join(' ')), d];
}

// « 2900 millilitres », « 15 mètres » → value in base unit
const UNIT_WORDS = {
  millilitres: 0.001,
  centilitres: 0.01,
  décilitres: 0.1,
  litres: 1,
  décalitres: 10,
  hectolitres: 100,
  millimètres: 0.001,
  centimètres: 0.01,
  décimètres: 0.1,
  mètres: 1,
  décamètres: 10,
  hectomètres: 100,
  kilomètres: 1000,
};
const measure = (s) => {
  const m = clean(s).match(/^([0-9][0-9 ,]*)\s*([a-zéè]+)$/i);
  const unit = m && m[2].toLowerCase().replace(/s?$/, 's'); // litre → litres
  if (!m || !(unit in UNIT_WORDS)) throw new Unparseable('measure ' + s);
  return num(m[1]) * UNIT_WORDS[unit];
};

// Rows of a generated HTML table: [[label, value], …]
const tableRows = (html) =>
  [...String(html).matchAll(/<tr[^>]*>\s*<td[^>]*>([^<]+)<\/td>\s*<td[^>]*>([^<]+)<\/td>/g)].map((m) => [
    clean(m[1]),
    num(m[2]),
  ]);

const DECOMP_PLACES = {
  dizaines: 10,
  unités: 1,
  centaines: 100,
  milliers: 1000,
  dixièmes: 0.1,
  centièmes: 0.01,
  millièmes: 0.001,
};
// Each labelled part is the digit of that place in the number
const decompCheck = (e) => {
  const n = num(e.decomp.number);
  for (const p of e.decomp.parts) {
    if (p.comma) continue;
    const place = DECOMP_PLACES[p.label];
    if (!place) throw new Unparseable('place ' + p.label);
    const digit = Math.floor(Math.round((n / place) * 1000) / 1000) % 10;
    if (digit !== num(p.answer)) return `${p.label} of ${e.decomp.number} is ${digit}, declared ${p.answer}`;
  }
  return null;
};

// MCQ « Lequel est le plus grand, A ou B ? » with choices A / B / « aucun : les deux sont égaux »
const compareMeasures = (e) => {
  const m = clean(e.title).match(/plus grand, (.+) ou (.+) \?$/);
  if (!m) throw new Unparseable('question');
  const a = measure(m[1]),
    b = measure(m[2]);
  const want = same(a, b) ? 2 : a > b ? 0 : 1;
  return e.mcqAnswer === want ? null : `expected « ${e.mcqChoices[want]} », declared « ${e.mcqChoices[e.mcqAnswer]} »`;
};

// Tile selections over numbers written with fractions: the selected tiles are exactly the
// ones equal to the target
const selectEqual = (e, target) => {
  const vals = e.tiles.map(fracValue);
  const good = vals.map((v, i) => (same(v, target) ? i : -1)).filter((i) => i >= 0);
  const sel = [...e.tileAnswers].sort((a, b) => a - b);
  return JSON.stringify(good) === JSON.stringify(sel)
    ? null
    : `tiles equal to ${fmt(target)}: ${good.join(',')}, selected ${sel.join(',')}`;
};

const GEN_CHECKS = {
  // « 467 + 99 » : b ends in 8 or 9 (≤ 99); the chain goes to the next ten, then corrects by 1 or 2
  astuceDizaineSup: (e) => {
    const src = e.type === 'calc-chain' ? String(e.title).replace(/^Calcule | avec.*$/g, '') : String(e.operation);
    const m = clean(src).match(/^([\d\s]+?)\s*([+−-])\s*(\d+)$/);
    if (!m) throw new Unparseable(`no « a ± b » in ${src}`);
    const [a, sign, b] = [num(m[1]), m[2] === '+' ? '+' : '-', Number(m[3])];
    if (b > 99 || ![8, 9].includes(b % 10)) return `${b} does not end in 8 or 9`;
    const result = sign === '+' ? a + b : a - b;
    if (e.type !== 'calc-chain') return checkEquation(`${fmt(a)} ${sign} ${b}`, e.answers);
    const round = Math.ceil(b / 10) * 10;
    const [s1, s2] = e.chain.steps;
    if (num(e.chain.start) !== a) return `chain starts at ${e.chain.start}, not ${a}`;
    if (num(clean(s1.op).replace(/^[+−-]\s*/, '')) !== round)
      return `first step ${s1.op} is not the next ten (${round})`;
    if (!same(num(s2.answer), result)) return `${a} ${sign} ${b} = ${result}, chain ends at ${s2.answer}`;
    return null;
  },
  // "🍎 = 8" chips in the title, emojis in the operation
  decodageEmojis: (e) => {
    const legend = [...String(e.title).matchAll(/>([^<>]+?) = (-?[0-9]+)</g)].map((m) => [m[1].trim(), m[2]]);
    if (!legend.length) throw new Unparseable('no emoji legend');
    let op = String(e.operation);
    for (const [sym, v] of legend.sort((a, b) => b[0].length - a[0].length)) op = op.split(sym).join(v);
    return checkEquation(op, e.answers);
  },
  // "902 ≈ ?" rounded to 10^order
  arrondirNombre: (e, p) => {
    const n = num(clean(e.operation).replace(/≈.*$/, ''));
    const unit = 10 ** (p.order ?? 1);
    const want = Math.round(n / unit) * unit;
    return same(num(e.answers[0]), want) ? null : `${n} rounded to ${unit} is ${want}, declared ${e.answers[0]}`;
  },
  // Blocks to colour: Σ answer × value = the number of the title, one digit per place
  blocsValeurPosition: (e) => {
    const n = strongOf(e.title);
    const cols = e.columns || [];
    if (cols.some((c) => c.answer > 9 || c.answer > c.max)) return 'a place needs more than 9 blocks';
    const sum = cols.reduce((s, c) => s + c.answer * c.value, 0);
    return sum === n ? null : `blocks make ${sum}, title says ${n}`;
  },
  // Every number 1…count in the grid exactly once
  huntNombres: (e) => {
    const seen = e.grid.filter((v) => v >= 1);
    for (let k = 1; k <= e.count; k++)
      if (seen.filter((v) => v === k).length !== 1) return `${k} appears ${seen.filter((v) => v === k).length} times`;
    return null;
  },
  vennNombres: (e) => {
    const a = vennRule(e.venn.labelA),
      b = vennRule(e.venn.labelB);
    for (const it of e.venn.items) {
      const n = num(it.char);
      const zone = a(n) && b(n) ? 'ab' : a(n) ? 'a' : b(n) ? 'b' : 'out';
      if (zone !== it.zone) return `${it.char} belongs in ${zone}, placed in ${it.zone}`;
    }
    return null;
  },
  // The proposed rule fits every pair, and no other choice does (one right answer)
  functionMachineDiscover: (e) => {
    const fits = (rule) => e.machine.pairs.every((pr) => same(num(`${pr.in} ${rule}`), pr.out));
    const ok = e.machine.choices.map(fits);
    if (!ok[e.machine.answer]) return `rule ${e.machine.choices[e.machine.answer]} does not fit the pairs`;
    if (ok.filter(Boolean).length > 1)
      return `several rules fit: ${e.machine.choices.filter((_, i) => ok[i]).join(' / ')}`;
    return null;
  },
  functionMachineCompute: (e) => {
    const out = num(`${e.machine.input} ${e.machine.rule}`);
    return same(out, num(e.machine.answer))
      ? null
      : `${e.machine.input} ${e.machine.rule} = ${fmt(out)}, declared ${e.machine.answer}`;
  },
  // "plus petit" / "plus grand": the selected tile is the min / max, and it is unique
  comparerNombres: (e) => {
    const vals = e.tiles.map(num);
    const small = /plus petit/.test(e.title),
      big = /plus grand/.test(e.title);
    if (!small && !big) throw new Unparseable('comparison word');
    const target = small ? Math.min(...vals) : Math.max(...vals);
    const idx = vals.map((v, i) => (v === target ? i : -1)).filter((i) => i >= 0);
    if (idx.length !== 1) return `${fmt(target)} appears ${idx.length} times`;
    return e.tileAnswers.length === 1 && e.tileAnswers[0] === idx[0] ? null : `expected tile ${e.tiles[idx[0]]}`;
  },
  // Exactly the tiles whose sum is the target are selected
  sommesCibles: (e) => {
    const target = strongOf(e.body);
    const good = e.tiles.map((t, i) => (same(num(t), target) ? i : -1)).filter((i) => i >= 0);
    const sel = [...e.tileAnswers].sort((a, b) => a - b);
    return JSON.stringify(good) === JSON.stringify(sel)
      ? null
      : `tiles equal to ${fmt(target)}: ${good.join(',')}, selected ${sel.join(',')}`;
  },
  romanNumerals: (e) => {
    const v = fromRoman(clean(e.operation));
    return same(v, num(e.answers[0])) ? null : `${e.operation} = ${v}, declared ${e.answers[0]}`;
  },
  // Counting pictures: "🐜 🐜 🐜 − 2" → "3 − 2"
  comptageFruits: (e) => checkEquation(countSymbols(e.operation), e.answers),
  comptageInsectes: (e) => checkEquation(countSymbols(e.operation), e.answers),
  // "8 × 30 = &box(8 × 3) × 10 = ? × 10 = ?" → answers [8 × 3, 8 × 30]
  multiplicationsEtapes: (e) => {
    const op = clean(e.operation);
    const left = op.split('=')[0];
    const inner = (String(e.operation).match(/&box\(([^)]*)\)/) || [])[1];
    if (!inner) throw new Unparseable('no &box');
    const [a0, a1] = e.answers.map(num);
    if (!same(num(inner), a0)) return `${inner} = ${fmt(num(inner))}, declared ${e.answers[0]}`;
    return same(num(left), a1) ? null : `${left} = ${fmt(num(left))}, declared ${e.answers[1]}`;
  },
  // Side labels of the drawn shape
  perimetreFormes: (e) => {
    const p = e.svg.par;
    const cm = (s) => num(String(s).replace(/\s*cm$/, ''));
    const shape = (e.title.match(/du (carré|rectangle|triangle)/) || [])[1];
    const per =
      shape === 'carré'
        ? 4 * cm(p.label)
        : shape === 'rectangle'
          ? 2 * (cm(p.labelW) + cm(p.labelH))
          : shape === 'triangle'
            ? cm(p.labelA) + cm(p.labelB) + cm(p.labelC)
            : NaN;
    if (Number.isNaN(per)) throw new Unparseable('shape');
    return same(per, num(e.answers[0])) ? null : `perimeter ${fmt(per)}, declared ${e.answers[0]}`;
  },
  // Selected tiles are place-value parts (4 ; 0,2) that add up to the number of the title
  decomposerDecimal: (e) => {
    const target = num(clean(e.title).replace(/^.*composent\s*/, ''));
    const parts = e.tileAnswers.map((i) => num(e.tiles[i]));
    if (!parts.every(isPlaceComponent)) return `selected tiles are not place-value parts: ${parts.map(fmt).join(', ')}`;
    const sum = parts.reduce((s, v) => s + v, 0);
    return same(sum, target) ? null : `selected tiles make ${fmt(sum)}, not ${fmt(target)}`;
  },
  // "Enlève 8 milliers et Ajoute 2 centaines" applied to the number of the title
  calcMentalGrands: (e) => {
    let n = num(e.title);
    for (const step of clean(e.operation).split(/\s+et\s+/)) {
      const m = step.match(/^(Ajoute|Enlève)\s+(\d+)\s+(.+)$/);
      if (!m) throw new Unparseable('step ' + step);
      n += (m[1] === 'Ajoute' ? 1 : -1) * Number(m[2]) * placeOf(m[3]);
    }
    return same(n, num(e.answers[0])) ? null : `result ${fmt(n)}, declared ${e.answers[0]}`;
  },
  // The order is computed by the game; the content must not contain equal values (two right orders)
  trierDecimaux: (e) => {
    const vals = e.tiles.map(num);
    return new Set(vals).size === vals.length ? null : `equal values among ${e.tiles.join(' ; ')}`;
  },
  pairOuImpair: (e) => {
    const want = num(e.operation) % 2 === 0 ? 'pair' : 'impair';
    return clean(e.answers[0]).toLowerCase() === want ? null : `${e.operation} is ${want}`;
  },
  // Table in the body; « le moins / le plus »: the selected row is the unique min / max
  lireTableauTile: (e) => {
    const rows = [...String(e.body).matchAll(/<tr[^>]*>\s*<td[^>]*>([^<]+)<\/td>\s*<td[^>]*>([^<]+)<\/td>/g)].map(
      (m) => [clean(m[1]), num(m[2])]
    );
    if (!rows.length) throw new Unparseable('table');
    // « le moins », « la plus basse », « le plus petit » → min ; « le plus », « la plus haute » → max
    const least = /moins|basse|plus petit/.test(e.title),
      most = !least && /plus|haute/.test(e.title);
    if (!least && !most) throw new Unparseable('question word');
    const target = least ? Math.min(...rows.map((r) => r[1])) : Math.max(...rows.map((r) => r[1]));
    const winners = rows.filter((r) => r[1] === target).map((r) => r[0]);
    if (winners.length !== 1) return `${winners.length} rows have ${fmt(target)}`;
    const picked = e.tileAnswers.map((i) => clean(e.tiles[i]));
    return picked.length === 1 && picked[0] === winners[0]
      ? null
      : `expected ${winners[0]}, selected ${picked.join(', ')}`;
  },
  // "748" vs "1c2d2u" (1 centaine, 2 dizaines, 2 unités)
  comparaisonNombres: (e) => {
    const val = (s) => {
      const m = clean(s).match(/^(?:(\d+)c)?(?:(\d+)d)?(?:(\d+)u)?$/);
      return m && /[cdu]/.test(s) ? Number(m[1] || 0) * 100 + Number(m[2] || 0) * 10 + Number(m[3] || 0) : num(s);
    };
    for (const c of e.comparisons) {
      const a = val(c.left),
        b = val(c.right);
      const want = a < b ? '<' : a > b ? '>' : '=';
      if (c.answer !== want) return `${c.left} ${want} ${c.right}, declared ${c.answer}`;
    }
    return null;
  },
  // Beads per row × row value
  lireAbacus: (e) => {
    const rows = e.svg.par.rows;
    if (rows.some((r) => r.value > 9)) return 'a row has more than 9 beads';
    const n = rows.reduce((s, r) => s + r.value * num(r.label), 0);
    return same(n, num(e.answers[0])) ? null : `abacus shows ${n}, declared ${e.answers[0]}`;
  },
  // Each number is a multiple of its category's divisor — and of no other category (else ambiguous)
  classerMultiples: (e) => {
    const div = Object.fromEntries(
      e.categories.map((c) => {
        const m = c.label.match(/multiples? de (\d+)/);
        if (!m) throw new Unparseable('category ' + c.label);
        return [c.id, Number(m[1])];
      })
    );
    for (const it of e.items) {
      const n = num(it.html);
      const fits = Object.keys(div).filter((id) => n % div[id] === 0);
      if (!fits.includes(it.cat)) return `${n} is not a multiple of ${div[it.cat]}`;
      if (fits.length > 1) return `${n} fits several categories (${fits.map((id) => div[id]).join(', ')})`;
    }
    return null;
  },
  multiplesOfTile: (e) => {
    const k = Number((clean(e.title).match(/multiples de (\d+)/) || [])[1]);
    if (!k) throw new Unparseable('divisor');
    const good = e.tiles.map((t, i) => (num(t) % k === 0 ? i : -1)).filter((i) => i >= 0);
    const sel = [...e.tileAnswers].sort((a, b) => a - b);
    return JSON.stringify(good) === JSON.stringify(sel)
      ? null
      : `multiples of ${k}: ${good.join(',')}, selected ${sel.join(',')}`;
  },
  // Number words: read each tile, count its digits
  nombreChiffresSelect: (e) => {
    const WANT = { deux: 2, trois: 3, quatre: 4, cinq: 5 };
    const d = WANT[(clean(e.title).match(/avec (\w+) chiffres/) || [])[1]];
    if (!d) throw new Unparseable('digit count');
    const good = e.tiles.map((t, i) => (String(wordsToNumber(t)).length === d ? i : -1)).filter((i) => i >= 0);
    const sel = [...e.tileAnswers].sort((a, b) => a - b);
    return JSON.stringify(good) === JSON.stringify(sel)
      ? null
      : `${d}-digit tiles: ${good.join(',')}, selected ${sel.join(',')}`;
  },
  // "Dans 455, quel est le chiffre des unités ?"
  chiffrePlaceValeur: (e) => {
    const strongs = [...String(e.title).matchAll(/<strong>([^<]+)<\/strong>/g)].map((m) => m[1]);
    if (strongs.length < 2) throw new Unparseable('title');
    const n = num(strongs[0]),
      p = placeOf(strongs[1]);
    const digit = Math.floor(n / p) % 10;
    return same(digit, num(e.answers[0])) ? null : `${strongs[1]} digit of ${strongs[0]} is ${digit}`;
  },
  // « 80 = (3 × ?) + ? » → quotient 26, remainder 2
  divisionEuclidienne: (e) => {
    const m = clean(e.mqContext).match(/^(\d+) = \((\d+) × \?\) \+ \?$/);
    if (!m) throw new Unparseable('context');
    const [a, b] = [Number(m[1]), Number(m[2])];
    const [q, r] = e.mqQuestions.map((x) => num(x.answer));
    return q === Math.floor(a / b) && r === a % b
      ? null
      : `${a} = ${b} × ${Math.floor(a / b)} + ${a % b}, declared ${q}, ${r}`;
  },
  // Fractions sorted into < 1 / = 1 / > 1
  classerFractions: (e) => {
    const cmp = { lt: (v) => v < 1, eq: (v) => same(v, 1), gt: (v) => v > 1 };
    for (const it of e.items) {
      const v = fracValue(it.html);
      if (!cmp[it.cat]) throw new Unparseable('category ' + it.cat);
      if (!cmp[it.cat](v) || (it.cat !== 'eq' && same(v, 1))) return `${fracText(it.html)} is not in « ${it.cat} »`;
    }
    return null;
  },
  fractionEnLettres: (e) => {
    const [n, d] = fractionWords(e.operation);
    return clean(e.answers[0]) === `${n}/${d}` ? null : `« ${e.operation} » is ${n}/${d}, declared ${e.answers[0]}`;
  },
  comparerVolumes: compareMeasures,
  comparerLongueurs: compareMeasures,
  // Fraction = decimal, and the place digits [dizaines, unités, dixièmes, centièmes, millièmes]
  decimalTriple: (e) => {
    const v = e.dtFrac.num / e.dtFrac.den;
    if (!same(v, num(e.dtDecimal))) return `${e.dtFrac.num}/${e.dtFrac.den} = ${fmt(v)}, declared ${e.dtDecimal}`;
    const places = [10, 1, 0.1, 0.01, 0.001];
    for (const [i, d] of e.dtPlaces.entries()) {
      if (d == null) continue;
      const digit = Math.floor(Math.round((v / places[i]) * 1000) / 1000) % 10;
      if (digit !== d) return `place ${places[i]} of ${fmt(v)} is ${digit}, declared ${d}`;
    }
    return null;
  },
  decompoAdditif: decompCheck,
  decompoAdditifDecimal: decompCheck,
  // « Coche toutes les expressions qui valent 35/10 »
  egalitesFractions: (e) => selectEqual(e, fracValue(e.title.replace(/^.*valent\s*/, ''))),
  // « Clique sur les 3 nombres égaux »: the selected tiles share one value no other tile has
  fractionsEgales5: (e) => {
    const k = Number((clean(e.title).match(/les (\d+) nombres égaux/) || [])[1]);
    if (!k) throw new Unparseable('count');
    const v = fracValue(e.tiles[e.tileAnswers[0]]);
    if (e.tileAnswers.length !== k) return `${e.tileAnswers.length} tiles selected, ${k} asked`;
    return selectEqual(e, v);
  },
  plusGrandeFraction: (e) => {
    const vals = e.tiles.map(fracValue);
    const max = Math.max(...vals);
    const idx = vals.map((v, i) => (same(v, max) ? i : -1)).filter((i) => i >= 0);
    if (idx.length !== 1) return `${idx.length} tiles have the largest value`;
    return e.tileAnswers.length === 1 && e.tileAnswers[0] === idx[0] ? null : `expected tile ${idx[0]}`;
  },
  // « 1 + 5/10 + 2/100 » = 152/100
  recomposerFractions: (e) => {
    const v = fracValue(e.operation);
    return same(v, num(e.answers[0])) ? null : `${fracText(e.operation)} = ${fmt(v)}, declared ${e.answers[0]}`;
  },
  // « 🏆 vaut **5** et 🎖️ vaut **2**. Quelle combinaison vaut **21** ? » — exactly one choice is right
  enigmeSymboles: (e) => {
    const vals = [...String(e.title).matchAll(/(\S+) vaut \*\*(\d+)\*\*/g)];
    const target = vals.pop();
    if (!vals.length || !target) throw new Unparseable('symbols');
    const worth = (choice) => {
      let rest = choice.replace(/\s+/g, ''),
        total = 0;
      for (const [, sym, v] of vals.sort((a, b) => b[1].length - a[1].length)) {
        const n = rest.split(sym).length - 1;
        total += n * Number(v);
        rest = rest.split(sym).join('');
      }
      if (rest) throw new Unparseable('unknown symbol in ' + choice);
      return total;
    };
    const good = e.mcqChoices.map((c, i) => (worth(c) === Number(target[2]) ? i : -1)).filter((i) => i >= 0);
    if (good.length !== 1) return `${good.length} choices make ${target[2]}`;
    return good[0] === e.mcqAnswer ? null : `choice ${good[0]} makes ${target[2]}, declared ${e.mcqAnswer}`;
  },
  // Table: « en tout / total / somme » → sum, otherwise the row named in the question
  lireTableauNombre: (e) => {
    const rows = tableRows(e.body);
    if (!rows.length) throw new Unparseable('table');
    const q = clean(String(e.title).replace(/<[^>]+>/g, ''));
    let want;
    if (/en tout|total|somme/.test(q)) want = rows.reduce((s, r) => s + r[1], 0);
    else {
      const row = rows.find((r) => new RegExp(`(^|[^\\p{L}])${r[0].replace('.', '\\.')}([^\\p{L}]|$)`, 'u').test(q));
      if (!row) throw new Unparseable('row in question');
      want = row[1];
    }
    return same(want, num(e.answers[0])) ? null : `expected ${fmt(want)}, declared ${e.answers[0]}`;
  },
  // « 991 + 6 unités »
  ajouterPositionnel: (e) => {
    const m = clean(e.operation).match(/^([0-9 ]+) \+ (\d+) (.+)$/);
    if (!m) throw new Unparseable('operation');
    const want = num(m[1]) + Number(m[2]) * placeOf(m[3]);
    return same(want, num(e.answers[0])) ? null : `${e.operation} = ${want}, declared ${e.answers[0]}`;
  },
  // « ? centaines = 50 dizaines », « 8 dizaines = ? unités »
  convertirValeurPos: (e) => {
    const m = clean(e.operation).match(/^(\?|\d+) (\S+) = (\?|\d+) (\S+)$/);
    if (!m) throw new Unparseable('operation');
    const [, a, pa, b, pb] = m;
    const want = a === '?' ? (Number(b) * placeOf(pb)) / placeOf(pa) : (Number(a) * placeOf(pa)) / placeOf(pb);
    return same(want, num(e.answers[0])) ? null : `${e.operation}: ${fmt(want)}, declared ${e.answers[0]}`;
  },
  // Three question forms: fraction → decimal, digit of a place, largest / smallest
  mcqDecimaux: (e) => {
    // Two identical buttons: clicking the « other » right value is refused
    if (new Set(e.mcqChoices.map((c) => clean(c))).size !== e.mcqChoices.length)
      return `duplicate choices: ${e.mcqChoices.join(' | ')}`;
    const t = fracText(e.title);
    const answer = clean(e.mcqChoices[e.mcqAnswer]);
    let want;
    let m;
    if ((m = t.match(/Écris (\d+\/\d+) sous forme décimale/))) want = fmt(num(m[1]));
    else if ((m = t.match(/Dans ([0-9,]+) ?, quel est le chiffre des (\S+) \?/))) {
      const place = { dixièmes: 0.1, centièmes: 0.01, millièmes: 0.001, unités: 1, dizaines: 10 }[m[2]];
      if (!place) return `unknown place « ${m[2]} »`;
      want = String(Math.floor(Math.round((num(m[1]) / place) * 1000) / 1000) % 10);
    } else if (/plus (grand|petit) de ces nombres/.test(t)) {
      const vals = e.mcqChoices.map(num);
      want = fmt(/grand/.test(t) ? Math.max(...vals) : Math.min(...vals));
    } else throw new Unparseable('mcq form');
    return same(num(answer), num(want)) ? null : `expected ${want}, declared ${answer}`;
  },
  // « 5__dizaines 2__unités__=__? »
  decompositionBase10: (e) => {
    const s = clean(String(e.operation).replace(/_+/g, ' '));
    const parts = [...s.matchAll(/(\d+) (dizaines?|unités?|centaines?)/g)];
    if (!parts.length) throw new Unparseable('operation');
    const want = parts.reduce((t, p) => t + Number(p[1]) * placeOf(p[2]), 0);
    return same(want, num(e.answers[0])) ? null : `${s} → ${want}, declared ${e.answers[0]}`;
  },
  romanNumeralsReverse: (e) => {
    const r = toRoman(num(e.operation));
    return r === String(e.answers[0]).trim() ? null : `${e.operation} = ${r}, declared ${e.answers[0]}`;
  },
};

module.exports = { GEN_CHECKS, toRoman, fromRoman, vennRule, wordsToNumber, countSymbols };
