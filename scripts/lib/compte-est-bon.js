/**
 * Le compte est bon — reach `target` by combining the numbers two at a time with the operations
 * allowed: each step replaces a and b by a op b. Subtractions stay positive, divisions exact (the
 * player refuses the others). `useAll` (Mathador): every number used, the last one left is the target.
 * Independent of the generator's own search (build, validator, answer oracle).
 */
const OPS = {
  '+': (a, b) => a + b,
  '−': (a, b) => (a > b ? a - b : null),
  '×': (a, b) => a * b,
  '÷': (a, b) => (b > 1 && a % b === 0 ? a / b : null),
};

// Fewest steps [a, op, b, result] to the target, or null. Breadth first over the multisets of numbers.
function cebSolve(numbers, target, { ops = Object.keys(OPS), useAll = false } = {}) {
  const done = (s) => (useAll ? s.length === 1 && s[0] === target : s.includes(target));
  const start = [...numbers].sort((x, y) => x - y);
  if (done(start)) return [];
  const seen = new Map([[start.join(','), null]]);
  let level = [start];
  while (level.length) {
    const next = [];
    for (const s of level) {
      for (let i = 0; i < s.length; i++)
        for (let j = 0; j < s.length; j++) {
          if (i === j) continue;
          for (const op of ops) {
            // + and × are symmetric: try each pair once
            if ((op === '+' || op === '×') && j < i) continue;
            const r = OPS[op](s[i], s[j]);
            if (r == null) continue;
            const t = s
              .filter((_, k) => k !== i && k !== j)
              .concat(r)
              .sort((x, y) => x - y);
            const key = t.join(',');
            if (seen.has(key)) continue;
            seen.set(key, { from: s.join(','), step: [s[i], op, s[j], r] });
            if (done(t)) {
              const steps = [];
              for (let k = key; seen.get(k); k = seen.get(k).from) steps.unshift(seen.get(k).step);
              return steps;
            }
            next.push(t);
          }
        }
    }
    level = next;
  }
  return null;
}

// null when `steps` reach the target from the numbers by the rules, else what is wrong
function cebStepsProblem(ceb, steps) {
  const left = [...ceb.numbers];
  const ops = ceb.ops || Object.keys(OPS);
  for (const [a, op, b, r] of steps) {
    if (!ops.includes(op)) return `${op} is not allowed`;
    for (const v of [a, b]) {
      const k = left.indexOf(v);
      if (k < 0) return `${a} ${op} ${b}: ${v} is not left`;
      left.splice(k, 1);
    }
    if (OPS[op](a, b) !== r) return `${a} ${op} ${b} = ${r} is wrong or not allowed`;
    left.push(r);
  }
  if (ceb.useAll ? left.length !== 1 || left[0] !== ceb.target : !left.includes(ceb.target))
    return `the steps end on ${left.join(', ')}, not ${ceb.target}${ceb.useAll ? ' alone' : ''}`;
  return null;
}

// A deck the pupil can solve (and the solution shipped with it works); null when it does
function cebProblem(ceb) {
  if (!ceb || !Array.isArray(ceb.numbers) || !Number.isInteger(ceb.target)) return 'no numbers or target';
  if (ceb.numbers.some((n) => !Number.isInteger(n) || n < 1)) return 'numbers must be whole and positive';
  if (ceb.numbers.includes(ceb.target) && !ceb.useAll) return `the target ${ceb.target} is already given`;
  if (!cebSolve(ceb.numbers, ceb.target, ceb)) return `${ceb.target} cannot be reached from ${ceb.numbers.join(', ')}`;
  return ceb.solution ? cebStepsProblem(ceb, ceb.solution) : null;
}

module.exports = { cebSolve, cebProblem };
