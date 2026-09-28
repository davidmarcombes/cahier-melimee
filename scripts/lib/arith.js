/**
 * French-notation arithmetic, shared by the build (.eleventy.js) and the answer oracle
 * (scripts/check-answers.js). A small recursive-descent parser — never eval():
 * decimal comma, spaces as thousands separators, × x * ÷ : / − –, parentheses, fractions (a/b),
 * "?" holes filled from a list. Anything else throws Unparseable.
 */
const NBSP = String.fromCharCode(0xa0);
const NNBSP = String.fromCharCode(0x202f);

class Unparseable extends Error {}

// "1 250,5" → 1250.5 ; strips HTML, markdown glue (__), NBSPs, KaTeX $
function clean(s) {
  return String(s ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .split(NBSP)
    .join(' ')
    .split(NNBSP)
    .join(' ')
    .replace(/__/g, ' ')
    .replace(/\$/g, '')
    .trim();
}

// Notations used in the content → plain arithmetic: &box( ) highlight groups, &frac(a,b), 10^{3},
// "moitié de 24", "3/4 de 12", "1 dizaine et ? unités"
const PLACE = {
  millier: 1000,
  milliers: 1000,
  centaine: 100,
  centaines: 100,
  dizaine: 10,
  dizaines: 10,
  unité: 1,
  unités: 1,
};
function mathify(s) {
  return clean(s)
    .replace(/&(ensp|emsp|thinsp|nbsp);/g, ' ')
    .replace(/&box\(/g, '(')
    .replace(/&frac\(([^,()]+),([^,()]+)\)/g, '($1/$2)')
    .replace(/\^\{([^}]*)\}/g, '^($1)')
    .replace(/\b(la |le )?moitié de /gi, '(1/2) × ')
    .replace(/\b(le )?double de /gi, '2 × ')
    .replace(/\b(le )?triple de /gi, '3 × ')
    .replace(/\b(le )?tiers de /gi, '(1/3) × ')
    .replace(/\b(le )?quart de /gi, '(1/4) × ')
    .replace(/([0-9?]+) (milliers?|centaines?|dizaines?|unités?)(?![a-zé])/g, (_, n, w) => `(${n} × ${PLACE[w]})`)
    .replace(/\) et \(/g, ') + (')
    .replace(/(\)|[0-9]) de /g, '$1 × ');
}

function tokenize(src) {
  const s = mathify(src);
  const out = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === ' ') {
      i++;
      continue;
    }
    if (/[0-9]/.test(c)) {
      // number: digits, thousands spaces (only before exactly 3 digits), one decimal comma/point
      let j = i;
      let txt = '';
      while (j < s.length) {
        if (/[0-9]/.test(s[j])) txt += s[j++];
        else if (s[j] === ' ' && /^ [0-9]{3}(?![0-9])/.test(s.slice(j))) j++;
        else if ((s[j] === ',' || s[j] === '.') && /[0-9]/.test(s[j + 1] || '') && !txt.includes('.')) {
          txt += '.';
          j++;
        } else break;
      }
      out.push({ t: 'n', v: Number(txt) });
      i = j;
      continue;
    }
    const op = {
      '+': '+',
      '-': '-',
      '−': '-',
      '–': '-',
      '×': '*',
      x: '*',
      '*': '*',
      '÷': '/',
      ':': '/',
      '/': '/',
      '^': '^',
    }[c];
    if (op) {
      out.push({ t: 'o', v: op });
      i++;
      continue;
    }
    if (c === '(' || c === ')' || c === '?' || c === '=' || c === '<' || c === '>') {
      out.push({ t: c });
      i++;
      continue;
    }
    throw new Unparseable(`unexpected "${c}" in "${s}"`);
  }
  return out;
}

// Recursive descent over a token slice; "?" tokens take values from `holes` in order
function evaluate(tokens, holes = []) {
  let pos = 0;
  let h = 0;
  const peek = () => tokens[pos];
  const expr = () => {
    let v = term();
    while (peek() && peek().t === 'o' && (peek().v === '+' || peek().v === '-')) {
      const o = tokens[pos++].v;
      const r = term();
      v = o === '+' ? v + r : v - r;
    }
    return v;
  };
  const term = () => {
    let v = power();
    while (peek() && peek().t === 'o' && (peek().v === '*' || peek().v === '/')) {
      const o = tokens[pos++].v;
      const r = power();
      v = o === '*' ? v * r : v / r;
    }
    return v;
  };
  // a ^ b (right-associative, binds tighter than × and ÷)
  const power = () => {
    const b = factor();
    if (peek() && peek().t === 'o' && peek().v === '^') {
      pos++;
      return b ** power();
    }
    return b;
  };
  const factor = () => {
    const tk = tokens[pos++];
    if (!tk) throw new Unparseable('unexpected end');
    if (tk.t === 'n') return tk.v;
    if (tk.t === '?') {
      if (h >= holes.length) throw new Unparseable('more ? than answers');
      return holes[h++];
    }
    if (tk.t === 'o' && tk.v === '-') return -factor();
    if (tk.t === '(') {
      const v = expr();
      if (!tokens[pos] || tokens[pos++].t !== ')') throw new Unparseable('missing )');
      return v;
    }
    throw new Unparseable('unexpected token');
  };
  const v = expr();
  if (pos !== tokens.length) throw new Unparseable('trailing tokens');
  return v;
}

const num = (s) => {
  const t = tokenize(s);
  return evaluate(t);
};
const same = (a, b) =>
  Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
const fmt = (v) => String(Math.round(v * 1e6) / 1e6);

module.exports = { Unparseable, clean, tokenize, evaluate, num, same, fmt };
