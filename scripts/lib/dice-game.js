/**
 * Dice game — Ferme la boîte (shut the box): tiles 1…n are open; roll the dice, close open tiles whose
 * numbers add up to the dice; when no group of open tiles makes the total, the round ends and the score is
 * the sum of the tiles left (0: every tile closed). The pupil says « je ne peux plus jouer » — the player
 * refuses it while a move exists. Independent of the player (validator, answer oracle, e2e solver).
 */

// A group of open tiles adding up to total (fewest tiles first), or null
function dgMove(open, total) {
  const tiles = open.filter((t) => t <= total).sort((a, b) => b - a);
  let best = null;
  const go = (i, left, picked) => {
    if (left === 0) {
      if (!best || picked.length < best.length) best = [...picked];
      return;
    }
    for (let j = i; j < tiles.length; j++) if (tiles[j] <= left) go(j + 1, left - tiles[j], [...picked, tiles[j]]);
  };
  go(0, total, []);
  return best;
}

// The totals the dice can make, as [min, max]
const dgRange = (dice) => [dice, 6 * dice];

// null when the box is good
function dgProblem(dg) {
  if (!dg || dg.kind !== 'boite') return `unknown kind ${dg && dg.kind}`;
  if (!Number.isInteger(dg.tiles) || dg.tiles < 4 || dg.tiles > 12) return `tiles ${dg.tiles} out of 4…12`;
  if (![1, 2].includes(dg.dice)) return `dice ${dg.dice}: 1 or 2`;
  const [lo, hi] = dgRange(dg.dice);
  // the first roll can always be played: every total the dice make is a group of tiles
  const all = Array.from({ length: dg.tiles }, (_, i) => i + 1);
  for (let t = lo; t <= hi; t++) if (!dgMove(all, t)) return `a first roll of ${t} cannot be played`;
  if (dg.oneDie && dg.dice !== 2) return 'oneDie needs 2 dice';
  return null;
}

module.exports = { dgMove, dgProblem };
