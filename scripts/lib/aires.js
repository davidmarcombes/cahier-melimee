/**
 * Areas on squared paper (generators aireQuadrillage, comparerAires in geometrie.js) — read back from the
 * drawing: each <rect> is a square of the grid, each <polygon> is measured (shoelace formula) in squares.
 * (oracle)
 */

const { boardProblems } = require('./grid-board.js');

const SVG_RE = /<svg\b[\s\S]*?<\/svg>/g;

// Area of a figure drawing, in squares of the grid (side data-s), or a problem string
function readArea(svg) {
  const s = Number((svg.match(/data-s="([\d.]+)"/) || [])[1]);
  if (!s) return 'no grid size';
  let area = 0;
  const seen = new Set();
  for (const m of svg.matchAll(/<rect x="([\d.-]+)" y="([\d.-]+)" width="([\d.]+)" height="([\d.]+)"/g)) {
    const [x, y, w, h] = m.slice(1).map(Number);
    if (w !== s || h !== s || x % s || y % s) return `a rect is not a square of the grid (${m[0]})`;
    seen.add(`${x},${y}`);
    area += 1;
  }
  for (const m of svg.matchAll(/<polygon points="([^"]+)"/g)) {
    const P = m[1].split(' ').map((p) => p.split(',').map(Number));
    let a2 = 0;
    for (let i = 0; i < P.length; i++) {
      const [x1, y1] = P[i];
      const [x2, y2] = P[(i + 1) % P.length];
      a2 += x1 * y2 - x2 * y1;
    }
    const sq = Math.abs(a2) / 2 / (s * s);
    if (P.length !== 3 || Math.abs(sq - 0.5) > 1e-9) return `a polygon is not a half square (${sq} squares)`;
    // inside one square of the grid, not one already whole
    const x0 = Math.min(...P.map((p) => p[0]));
    const y0 = Math.min(...P.map((p) => p[1]));
    if (seen.has(`${x0},${y0}`)) return 'a half square lies on a whole one';
    area += 0.5;
  }
  return area;
}

const AREA_CHECKS = {
  aireQuadrillage: (e) => {
    const svg = (String(e.body).match(SVG_RE) || [])[0];
    if (!svg) return 'no drawing';
    const area = readArea(svg);
    if (typeof area === 'string') return area;
    const said = Number(String(e.answers[0]).replace(',', '.'));
    return said === area ? null : `the figure covers ${area} squares, declared ${e.answers[0]}`;
  },
  comparerAires: (e) => {
    const pics = String(e.body).match(SVG_RE) || [];
    if (pics.length !== 2) return 'body is not two figures';
    const [a, b] = pics.map(readArea);
    if (typeof a === 'string') return `A: ${a}`;
    if (typeof b === 'string') return `B: ${b}`;
    if (!/plus grande aire/.test(e.title)) return `title « ${e.title} »`;
    const want = a === b ? 2 : a > b ? 0 : 1;
    if (!/A$/.test(e.mcqChoices[0]) || !/B$/.test(e.mcqChoices[1]) || !/même aire/.test(e.mcqChoices[2]))
      return `choices are ${e.mcqChoices.join(' / ')}`;
    return e.mcqAnswer === want ? null : `A ${a}, B ${b}: answer ${want}, declared ${e.mcqAnswer}`;
  },
  colorierAire: (e) => {
    const pb = boardProblems(e.board);
    if (pb.length) return pb.join('; ');
    const m = String(e.title);
    const b = e.board;
    if (b.task === 'aire' || b.task === 'perimetre') {
      const n = (m.match(/aire (\d+) carreau/) || [])[1];
      if (Number(n) !== b.area) return `title area ${n}, board ${b.area}`;
    }
    if (b.task === 'perimetre' && Number((m.match(/périmètre (\d+)/) || [])[1]) !== b.perimeter)
      return `title perimeter, board ${b.perimeter}`;
    if (b.task === 'meme-aire' && !/même aire[\s\S]*autre forme/.test(m)) return `title « ${m} »`;
    if (b.task === 'autre-perimetre' && !/même aire[\s\S]*autre périmètre/.test(m)) return `title « ${m} »`;
    return null;
  },
};

module.exports = { AREA_CHECKS };
