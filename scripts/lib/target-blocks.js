/**
 * Blocs cibles — number tiles dropped into overlapping square blocks; each block's tiles, combined with
 * its operation, must give the block's target. A tile in an overlap counts in every block around it.
 * + and × only (− and ÷ were dropped: their order cannot be shown on the board). Independent of the player
 * and the generator (validator, answer oracle).
 */
const OPS = {
  '+': (v) => v.reduce((a, b) => a + b, 0),
  '×': (v) => v.reduce((a, b) => a * b, 1),
};

// The blocks (indices) a point lies in
const blocksAt = (blocks, [x, y]) =>
  blocks.map((b, i) => (x > b.x && x < b.x + b.s && y > b.y && y < b.y + b.s ? i : -1)).filter((i) => i >= 0);

// What a block's tiles give with its operation (null: no tiles)
function blockValue(tb, k, values) {
  return values.length ? OPS[tb.blocks[k].op || tb.op || '+'](values) : null;
}

// null when tiles placed at `at` (a point per tile, null: left in the tray) solve the puzzle, else why not
function tbPlacementProblem(tb, at) {
  const inside = tb.tiles.map((_, i) => (at[i] ? blocksAt(tb.blocks, at[i]) : []));
  if (tb.useAll !== false && inside.some((b) => !b.length)) return 'a tile is not in any block';
  for (let k = 0; k < tb.blocks.length; k++) {
    const values = tb.tiles.filter((_, i) => inside[i].includes(k));
    const v = blockValue(tb, k, values);
    if (v !== tb.blocks[k].target) return `block ${k} makes ${v} with ${values.join(', ')}, not ${tb.blocks[k].target}`;
  }
  return null;
}

// null when the puzzle is good: blocks on the board, an operation each, the shipped solution works
function tbProblem(tb) {
  if (!tb || !Array.isArray(tb.blocks) || !Array.isArray(tb.tiles)) return 'no blocks or tiles';
  for (const [k, b] of tb.blocks.entries()) {
    if (!(b.x >= 0 && b.y >= 0 && b.x + b.s <= tb.w && b.y + b.s <= tb.h)) return `block ${k} is off the board`;
    if (!OPS[b.op || tb.op || '+']) return `block ${k}: unknown operation ${b.op || tb.op}`;
    if (!Number.isInteger(b.target)) return `block ${k} has no whole target`;
  }
  if (tb.tiles.some((v) => !Number.isInteger(v) || v < 0)) return 'tiles must be whole numbers';
  if (!Array.isArray(tb.solution) || tb.solution.length !== tb.tiles.length) return 'no solution for every tile';
  return tbPlacementProblem(tb, tb.solution);
}

module.exports = { blocksAt, tbPlacementProblem, tbProblem };
