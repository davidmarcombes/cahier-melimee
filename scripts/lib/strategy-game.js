/**
 * Strategy game against the computer — course à N (say the next number, adding one of `moves`; who
 * says N wins) and allumettes (take one of `moves` sticks; who takes the last one wins, or loses when
 * `misere`). Both are one game: `left` steps remain, a move takes m of them. The pupil is given the
 * seat that can always win, so a win is earned by finding the strategy. Independent of the player
 * (build, validator, answer oracle).
 */

// win[r]: the player about to move with r left can force a win. Normal play: r = 0 means the other
// player has just won (reached N, took the last stick); misère: the other player took the last one, lost.
function sgWinning(total, moves, misere = false) {
  const win = [misere];
  for (let r = 1; r <= total; r++) win[r] = moves.some((m) => m <= r && !win[r - m]);
  return win;
}

// Who must start so that the pupil can always win: the pupil when the start is a winning position
function sgFirst(sg) {
  return sgWinning(sg.total, sg.moves, sg.misere)[sg.total] ? 'eleve' : 'ordi';
}

// null when the game is good: whole moves, at least two, 1 among them, the pupil's seat wins whatever the
// computer does
function sgProblem(sg) {
  if (!sg || !Number.isInteger(sg.total) || !Array.isArray(sg.moves)) return 'no total or moves';
  if (!['course', 'allumettes'].includes(sg.kind)) return `unknown kind ${sg.kind}`;
  if (sg.moves.length < 2 || sg.moves.some((m) => !Number.isInteger(m) || m < 1))
    return 'moves must be 2+ whole numbers';
  if (!sg.moves.includes(1)) return 'moves must include 1 (else a player can be left without a move)';
  if (sg.total < Math.max(...sg.moves) + 2 || sg.total > 100) return `total ${sg.total} out of range`;
  // The computer starts from a losing position: whatever it plays, the pupil can win
  const first = sgFirst(sg);
  if (sg.first !== first) return `the pupil cannot force a win when ${sg.first} starts (${first} should)`;
  if (!(sg.smart >= 0 && sg.smart <= 1)) return 'smart must be between 0 and 1';
  return null;
}

module.exports = { sgWinning, sgFirst, sgProblem };
