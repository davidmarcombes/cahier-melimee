/**
 * Calculatrice cassée — make the calculator show `target` without its broken keys (digits or
 * operations). The target holds a broken digit, so it cannot simply be typed; one operation between
 * two numbers typed with the keys left always does it here (build, validator, answer oracle).
 */
const OPS = { '+': (a, b) => a + b, '−': (a, b) => a - b, '×': (a, b) => a * b, '÷': (a, b) => (b ? a / b : null) };
const typable = (n, broken) =>
  Number.isInteger(n) &&
  n >= 0 &&
  !String(n)
    .split('')
    .some((d) => broken.includes(d));

// One operation [a, op, b] with typable a and b (≤ max), or null. Tried in the order of `ops`, small first.
function bcSolve(target, broken, { ops = ['+', '−', '×', '÷'], max = 999 } = {}) {
  const keys = ops.filter((o) => !broken.includes(o));
  for (const op of keys)
    for (let a = 1; a <= max; a++) {
      if (!typable(a, broken)) continue;
      const b = op === '+' ? target - a : op === '−' ? a - target : op === '×' ? target / a : a / target;
      if (op === '÷') {
        // a ÷ b = target: b = a / target
        if (Number.isInteger(b) && b > 1 && typable(b, broken)) return [a, op, b];
      } else if (b >= 1 && b <= max && typable(b, broken) && !(op === '×' && b === 1)) return [a, op, b];
    }
  return null;
}

// null when the calculator works, else what is wrong
function bcProblem(bc) {
  if (!bc || !Number.isInteger(bc.target) || !Array.isArray(bc.broken)) return 'no target or broken keys';
  const broken = bc.broken.map(String);
  if (typable(bc.target, broken)) return `${bc.target} can be typed directly: break one of its digits`;
  if (!bcSolve(bc.target, broken, bc))
    return `${bc.target} cannot be made with one operation without ${broken.join(', ')}`;
  if (bc.solution) {
    const [a, op, b] = bc.solution;
    if (broken.includes(op) || !(bc.ops || Object.keys(OPS)).includes(op)) return `solution uses the ${op} key`;
    if (!typable(a, broken) || !typable(b, broken)) return `solution types ${a} ${op} ${b} with a broken key`;
    if (OPS[op](a, b) !== bc.target) return `solution ${a} ${op} ${b} is not ${bc.target}`;
  }
  return null;
}

module.exports = { bcSolve, bcProblem };
