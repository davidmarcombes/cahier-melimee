/**
 * GS manipulations (boiteDix, jeuOie, balanceGS) — box of 10, die, balance read back from the SVG markup
 * alone, apart from the generator, for gen-checks.js and validate-llm.js.
 */
const num = (s) => Number(String(s).trim());
const attr = (tag, name) => {
  const m = tag.match(new RegExp(`\\s${name}="([^"]*)"`));
  return m ? m[1] : null;
};
const tags = (svg, name) => [...String(svg || '').matchAll(new RegExp(`<${name}\\b[^>]*>`, 'g'))].map((m) => m[0]);

// Box of 10: { cells, tokens } — cells drawn, tokens (circles) each inside a different cell
function readTensFrame(svg) {
  const cells = tags(svg, 'rect').map((t) => ['x', 'y', 'width', 'height'].map((k) => num(attr(t, k))));
  const tokens = tags(svg, 'circle').map((t) => [num(attr(t, 'cx')), num(attr(t, 'cy'))]);
  const used = tokens.map(([x, y]) =>
    cells.findIndex(([cx, cy, w, h]) => x > cx && x < cx + w && y > cy && y < cy + h)
  );
  const problems = [];
  if (used.some((i) => i < 0)) problems.push('a token outside the cells');
  if (new Set(used).size !== used.length) problems.push('two tokens in one cell');
  return { cells: cells.length, tokens: tokens.length, problems };
}

// Die face: its pips
const readDie = (svg) => tags(svg, 'circle').length;

// Balance: the objects on each pan (text x left / right of the post) and which side hangs lower
function readBalance(svg) {
  const post = tags(svg, 'line').find((t) => attr(t, 'x1') === attr(t, 'x2'));
  if (!post) return null;
  const mid = num(attr(post, 'x1'));
  const objects = [...String(svg).matchAll(/<text\b([^>]*)>([^<]+)<\/text>/g)].map(([, a, o]) => ({
    o: o.trim(),
    x: num(attr(a, 'x')),
    y: num(attr(a, 'y')),
    size: num(attr(a, 'font-size')),
  }));
  const left = objects.filter((t) => t.x < mid);
  const right = objects.filter((t) => t.x > mid);
  if (left.length !== 1 || right.length !== 1) return null;
  const lower = left[0].y > right[0].y ? 'left' : right[0].y > left[0].y ? 'right' : null;
  return { left: left[0], right: right[0], lower };
}

// For the LLM prompt: the drawing in words, from the markup
function manipulationText(svg) {
  const b = readBalance(svg);
  if (b)
    return `balance : à gauche ${b.left.o}, à droite ${b.right.o} ; le plateau ${b.lower === 'left' ? 'de gauche' : b.lower === 'right' ? 'de droite' : '?'} est le plus bas`;
  if (/aria-label="Dé/.test(svg)) return `dé montrant ${readDie(svg)} points`;
  return '';
}

// ten-frame: the number of tokens asked follows from what is shown (the number, the die) or from the
// red tokens (one more / one less) and fits in the boxes; null when it does
function tenFrameProblem(tf) {
  if (!tf) return 'no ten-frame';
  const cap = 10 * (tf.frames || 1);
  const { given = 0, target, by = 1 } = tf;
  const want =
    tf.ask === 'plus' ? given + by : tf.ask === 'moins' ? given - by : tf.show && (tf.show.digit ?? tf.show.dots);
  if (want == null) return `ask ${tf.ask} shows no number`;
  if (target !== want) return `${tf.ask}: ${want} tokens expected, target ${target}`;
  if (target < 0 || target > cap || given > cap) return `${target} tokens (${given} given) do not fit in ${cap} cells`;
  if (tf.ask === 'moins' ? given < by : tf.ask === 'plus' ? target === given : target < 1)
    return `${tf.ask} by ${by} from ${given}: nothing to do`;
  return null;
}

module.exports = { readTensFrame, readDie, readBalance, manipulationText, tenFrameProblem };
