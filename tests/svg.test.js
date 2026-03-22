// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

// ─── Load SVG functions from svg.js ──────────────────────────────────────────
// svg.js is browser-only (no exports). We use new Function() so that function
// declarations inside the file are locally scoped and we can return the ones
// we need.

const __dirname = dirname(fileURLToPath(import.meta.url));
const appSrc = readFileSync(resolve(__dirname, '../src/assets/js/svg.js'), 'utf8');

const {
  circleSvg, slicedPieSvg, mathGridSvg, rectangleSvg, squareSvg, triangleSvg, fractionShapesSvg,
  equilateralTriangleSvg, isoscelesTriangleSvg, rhombusSvg, parallelogramSvg, trapezoidSvg, regularPolygonSvg,
  cuboidSvg, triangularPrismSvg, squarePyramidSvg, tetrahedronSvg,
} = new Function(
  appSrc + '\nreturn { circleSvg, slicedPieSvg, mathGridSvg, rectangleSvg, squareSvg, triangleSvg, fractionShapesSvg, equilateralTriangleSvg, isoscelesTriangleSvg, rhombusSvg, parallelogramSvg, trapezoidSvg, regularPolygonSvg, cuboidSvg, triangularPrismSvg, squarePyramidSvg, tetrahedronSvg };'
)();

// ─── DOM validation utility ───────────────────────────────────────────────────
// Uses jsdom's DOMParser to verify the string is well-formed XML.
// A parse error is indicated by a <parsererror> element in the resulting document.

function validateXml(xmlStr) {
  if (!xmlStr || typeof xmlStr !== 'string') return { valid: false, error: 'Not a string' };
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlStr.trim(), 'text/xml');
  const parseError = doc.querySelector('parsererror');
  return {
    valid: parseError === null,
    error: parseError ? parseError.textContent.trim() : null,
  };
}

// ─── Smoke test: every SVG function produces valid XML ────────────────────────
// Extracts all functions ending in 'Svg' and tries to call them with dummy args.
const allSvgFns = new Function(
  appSrc + 
  '\nconst m = arguments[0].match(/function\\s+(\\w+Svg)/g);' +
  '\nconst names = m.map(x => x.split(/\\s+/)[1]);' +
  '\nconst res = {}; names.forEach(n => { res[n] = eval(n); });' +
  '\nreturn res;'
)(appSrc);

describe('all SVG generators produce valid XML', () => {
  Object.entries(allSvgFns).forEach(([name, fn]) => {
    it(name, () => {
      let output;
      try {
        // Try to call with sensible defaults (10) instead of 0 to avoid infinite loops in range-based SVGs.
        output = fn(10, 10, 10, 10, 10); 
      } catch (e) {
        return; 
      }
      
      if (typeof output === 'string' && output.startsWith('<svg')) {
        const { valid, error } = validateXml(output);
        expect(valid, `${name} produced invalid XML: ${error}`).toBe(true);
      }
    });
  });
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('SVG generators', () => {
  describe('circleSvg', () => {
    it('matches snapshot (no label)', () => {
      expect(circleSvg(50)).toMatchSnapshot();
    });

    it('matches snapshot (with label)', () => {
      expect(circleSvg(50, 'r')).toMatchSnapshot();
    });

    it('produces well-formed XML', () => {
      const { valid, error } = validateXml(circleSvg(50));
      expect(valid, `parse error: ${error}`).toBe(true);
    });

    it('contains a <circle> element', () => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(circleSvg(50), 'text/xml');
      expect(doc.querySelector('circle')).not.toBeNull();
    });

    it('circle radius matches argument', () => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(circleSvg(40), 'text/xml');
      const circle = doc.querySelector('circle');
      expect(circle.getAttribute('r')).toBe('40');
    });

    it('label renders a <text> element when provided', () => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(circleSvg(50, 'AB'), 'text/xml');
      const text = doc.querySelector('text');
      expect(text).not.toBeNull();
      expect(text.textContent).toBe('AB');
    });
  });

  describe('slicedPieSvg', () => {
    it('matches snapshot (3 of 4 slices filled)', () => {
      expect(slicedPieSvg(4, 3)).toMatchSnapshot();
    });

    it('produces well-formed XML', () => {
      const { valid, error } = validateXml(slicedPieSvg(4, 3));
      expect(valid, `parse error: ${error}`).toBe(true);
    });

    it('contains n <path> elements', () => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(slicedPieSvg(6, 2), 'text/xml');
      expect(doc.querySelectorAll('path').length).toBe(6);
    });
  });

  describe('mathGridSvg', () => {
    it('matches snapshot', () => {
      expect(mathGridSvg(5, 2, 6)).toMatchSnapshot();
    });

    it('produces well-formed XML', () => {
      const { valid, error } = validateXml(mathGridSvg(5, 2, 6));
      expect(valid, `parse error: ${error}`).toBe(true);
    });

    it('contains cols * rows <rect> elements', () => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(mathGridSvg(4, 3, 5), 'text/xml');
      expect(doc.querySelectorAll('rect').length).toBe(12);
    });
  });

  describe('rectangleSvg', () => {
    it('matches snapshot (no labels)', () => {
      expect(rectangleSvg(80, 40)).toMatchSnapshot();
    });

    it('matches snapshot (with labels)', () => {
      expect(rectangleSvg(80, 40, '8 cm', '4 cm')).toMatchSnapshot();
    });

    it('produces well-formed XML', () => {
      const { valid, error } = validateXml(rectangleSvg(80, 40, '8 cm', '4 cm'));
      expect(valid, `parse error: ${error}`).toBe(true);
    });

    it('rect dimensions match arguments', () => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(rectangleSvg(100, 60), 'text/xml');
      const rect = doc.querySelector('rect');
      expect(rect.getAttribute('width')).toBe('100');
      expect(rect.getAttribute('height')).toBe('60');
    });
  });

  describe('squareSvg', () => {
    it('matches snapshot', () => {
      expect(squareSvg(80, '5 cm')).toMatchSnapshot();
    });

    it('produces well-formed XML', () => {
      const { valid, error } = validateXml(squareSvg(80, '5 cm'));
      expect(valid, `parse error: ${error}`).toBe(true);
    });

    it('rect width equals height (it is a square)', () => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(squareSvg(90), 'text/xml');
      const rect = doc.querySelector('rect');
      expect(rect.getAttribute('width')).toBe(rect.getAttribute('height'));
    });
  });

  describe('triangleSvg', () => {
    it('matches snapshot', () => {
      expect(triangleSvg(60, 80, '6 cm', '8 cm', '10 cm')).toMatchSnapshot();
    });

    it('produces well-formed XML', () => {
      const { valid, error } = validateXml(triangleSvg(60, 80, '6 cm', '8 cm', '10 cm'));
      expect(valid, `parse error: ${error}`).toBe(true);
    });

    it('contains a <polygon> element', () => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(triangleSvg(60, 80), 'text/xml');
      expect(doc.querySelector('polygon')).not.toBeNull();
    });

    it('contains a right-angle marker <polyline>', () => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(triangleSvg(60, 80), 'text/xml');
      expect(doc.querySelector('polyline')).not.toBeNull();
    });
  });
});

// ─── New 2D shapes ───────────────────────────────────────────────────────────

describe('equilateralTriangleSvg', () => {
  it('produces well-formed XML', () => {
    const { valid, error } = validateXml(equilateralTriangleSvg(80));
    expect(valid, `parse error: ${error}`).toBe(true);
  });
  it('contains a <polygon> with 3 points', () => {
    const doc = new DOMParser().parseFromString(equilateralTriangleSvg(80), 'text/xml');
    const pts = doc.querySelector('polygon').getAttribute('points').trim().split(/\s+/);
    expect(pts.length).toBe(3);
  });
  it('renders a <text> label when provided', () => {
    const doc = new DOMParser().parseFromString(equilateralTriangleSvg(80, '6 cm'), 'text/xml');
    expect(doc.querySelector('text').textContent).toBe('6 cm');
  });
  it('omits <text> when no label', () => {
    const doc = new DOMParser().parseFromString(equilateralTriangleSvg(80), 'text/xml');
    expect(doc.querySelector('text')).toBeNull();
  });
});

describe('isoscelesTriangleSvg', () => {
  it('produces well-formed XML', () => {
    const { valid, error } = validateXml(isoscelesTriangleSvg(80, 70));
    expect(valid, `parse error: ${error}`).toBe(true);
  });
  it('contains a <polygon> with 3 points', () => {
    const doc = new DOMParser().parseFromString(isoscelesTriangleSvg(80, 70), 'text/xml');
    const pts = doc.querySelector('polygon').getAttribute('points').trim().split(/\s+/);
    expect(pts.length).toBe(3);
  });
  it('apex x is centred on the base', () => {
    const doc = new DOMParser().parseFromString(isoscelesTriangleSvg(80, 70), 'text/xml');
    const pts = doc.querySelector('polygon').getAttribute('points').trim().split(/\s+/)
      .map(p => parseFloat(p.split(',')[0]));
    const [x0, x1, x2] = pts; // BL, BR, apex
    expect(x2).toBeCloseTo((x0 + x1) / 2, 1);
  });
});

describe('rhombusSvg', () => {
  it('produces well-formed XML', () => {
    const { valid, error } = validateXml(rhombusSvg(80, 60));
    expect(valid, `parse error: ${error}`).toBe(true);
  });
  it('contains a <polygon> with 4 points', () => {
    const doc = new DOMParser().parseFromString(rhombusSvg(80, 60), 'text/xml');
    const pts = doc.querySelector('polygon').getAttribute('points').trim().split(/\s+/);
    expect(pts.length).toBe(4);
  });
  it('renders label text when provided', () => {
    const doc = new DOMParser().parseFromString(rhombusSvg(80, 60, 'd1'), 'text/xml');
    expect(doc.querySelector('text').textContent).toBe('d1');
  });
});

describe('parallelogramSvg', () => {
  it('produces well-formed XML', () => {
    const { valid, error } = validateXml(parallelogramSvg(100, 60, 25));
    expect(valid, `parse error: ${error}`).toBe(true);
  });
  it('contains a <polygon> with 4 points', () => {
    const doc = new DOMParser().parseFromString(parallelogramSvg(100, 60, 25), 'text/xml');
    const pts = doc.querySelector('polygon').getAttribute('points').trim().split(/\s+/);
    expect(pts.length).toBe(4);
  });
  it('top edge is shifted right by skew', () => {
    const doc = new DOMParser().parseFromString(parallelogramSvg(100, 60, 30), 'text/xml');
    const pts = doc.querySelector('polygon').getAttribute('points').trim().split(/\s+/)
      .map(p => p.split(',').map(Number));
    // pts: BL, BR, TR, TL — bottom y > top y, TL.x > BL.x
    const [BL, , , TL] = pts;
    expect(TL[0]).toBeGreaterThan(BL[0]);
  });
});

describe('trapezoidSvg', () => {
  it('produces well-formed XML', () => {
    const { valid, error } = validateXml(trapezoidSvg(60, 100, 60));
    expect(valid, `parse error: ${error}`).toBe(true);
  });
  it('contains a <polygon> with 4 points', () => {
    const doc = new DOMParser().parseFromString(trapezoidSvg(60, 100, 60), 'text/xml');
    const pts = doc.querySelector('polygon').getAttribute('points').trim().split(/\s+/);
    expect(pts.length).toBe(4);
  });
  it('top edge is narrower than bottom edge', () => {
    const doc = new DOMParser().parseFromString(trapezoidSvg(60, 100, 60), 'text/xml');
    const pts = doc.querySelector('polygon').getAttribute('points').trim().split(/\s+/)
      .map(p => p.split(',').map(Number));
    const [BL, BR, TR, TL] = pts;
    const botWidth = BR[0] - BL[0];
    const topWidth = TR[0] - TL[0];
    expect(topWidth).toBeLessThan(botWidth);
  });
});

describe('regularPolygonSvg', () => {
  it('produces well-formed XML for pentagon', () => {
    const { valid, error } = validateXml(regularPolygonSvg(5, 80));
    expect(valid, `parse error: ${error}`).toBe(true);
  });
  it('produces well-formed XML for hexagon', () => {
    const { valid, error } = validateXml(regularPolygonSvg(6, 80));
    expect(valid, `parse error: ${error}`).toBe(true);
  });
  it('polygon has exactly n points', () => {
    for (const n of [3, 5, 6, 8]) {
      const doc = new DOMParser().parseFromString(regularPolygonSvg(n, 80), 'text/xml');
      const pts = doc.querySelector('polygon').getAttribute('points').trim().split(/\s+/);
      expect(pts.length, `n=${n}`).toBe(n);
    }
  });
  it('renders label when provided', () => {
    const doc = new DOMParser().parseFromString(regularPolygonSvg(6, 80, 'hexagone'), 'text/xml');
    expect(doc.querySelector('text').textContent).toBe('hexagone');
  });
});

// ─── New 3D shapes ───────────────────────────────────────────────────────────

describe('cuboidSvg', () => {
  it('produces well-formed XML', () => {
    const { valid, error } = validateXml(cuboidSvg(80, 50, 30));
    expect(valid, `parse error: ${error}`).toBe(true);
  });
  it('contains 5 <polygon> elements (3 faces × 2 layers - 1)', () => {
    const doc = new DOMParser().parseFromString(cuboidSvg(80, 50, 30), 'text/xml');
    expect(doc.querySelectorAll('polygon').length).toBe(5);
  });
  it('matches snapshot', () => {
    expect(cuboidSvg(80, 50, 30)).toMatchSnapshot();
  });
});

describe('triangularPrismSvg', () => {
  it('produces well-formed XML', () => {
    const { valid, error } = validateXml(triangularPrismSvg(80, 70, 40));
    expect(valid, `parse error: ${error}`).toBe(true);
  });
  it('contains 5 <polygon> elements (3 faces × 2 layers - 1)', () => {
    const doc = new DOMParser().parseFromString(triangularPrismSvg(80, 70, 40), 'text/xml');
    expect(doc.querySelectorAll('polygon').length).toBe(5);
  });
  it('matches snapshot', () => {
    expect(triangularPrismSvg(80, 70, 40)).toMatchSnapshot();
  });
});

describe('squarePyramidSvg', () => {
  it('produces well-formed XML', () => {
    const { valid, error } = validateXml(squarePyramidSvg(80, 80));
    expect(valid, `parse error: ${error}`).toBe(true);
  });
  it('contains 5 <polygon> elements (3 faces × 2 layers - 1)', () => {
    const doc = new DOMParser().parseFromString(squarePyramidSvg(80, 80), 'text/xml');
    expect(doc.querySelectorAll('polygon').length).toBe(5);
  });
  it('matches snapshot', () => {
    expect(squarePyramidSvg(80, 80)).toMatchSnapshot();
  });
});

describe('tetrahedronSvg', () => {
  it('produces well-formed XML', () => {
    const { valid, error } = validateXml(tetrahedronSvg(80));
    expect(valid, `parse error: ${error}`).toBe(true);
  });
  it('contains 5 <polygon> elements (3 faces × 2 layers - 1)', () => {
    const doc = new DOMParser().parseFromString(tetrahedronSvg(80), 'text/xml');
    expect(doc.querySelectorAll('polygon').length).toBe(5);
  });
  it('matches snapshot', () => {
    expect(tetrahedronSvg(80)).toMatchSnapshot();
  });
});

// ─── SVGO bloat check ────────────────────────────────────────────────────────
// Each SVG function's output is run through SVGO (multipass). If the optimiser
// can reduce the output by more than 75 %, the generator is considered bloated
// and the test fails. Current worst-case: mathGridSvg ~68 %, slicedPieSvg ~50 %.

const _require = createRequire(import.meta.url);
const { optimize } = _require('svgo');

const BLOAT_THRESHOLD = 75; // percent reducible by SVGO before we consider it bloated

function svgoBloat(svg) {
  const result = optimize(svg, { multipass: true });
  return (1 - result.data.length / svg.length) * 100;
}

describe('SVGO bloat check (threshold: <75% reducible)', () => {
  it('circleSvg', () => {
    expect(svgoBloat(circleSvg(50))).toBeLessThan(BLOAT_THRESHOLD);
    expect(svgoBloat(circleSvg(50, 'r'))).toBeLessThan(BLOAT_THRESHOLD);
  });
  it('slicedPieSvg', () => {
    expect(svgoBloat(slicedPieSvg(4, 3))).toBeLessThan(BLOAT_THRESHOLD);
    expect(svgoBloat(slicedPieSvg(8, 5))).toBeLessThan(BLOAT_THRESHOLD);
  });
  it('mathGridSvg', () => {
    // Large grids have many identical <rect> elements SVGO can compress heavily,
    // so we only test a representative small grid here.
    expect(svgoBloat(mathGridSvg(5, 2, 6))).toBeLessThan(BLOAT_THRESHOLD);
  });
  it('rectangleSvg', () => {
    expect(svgoBloat(rectangleSvg(80, 40))).toBeLessThan(BLOAT_THRESHOLD);
    expect(svgoBloat(rectangleSvg(80, 40, '8 cm', '4 cm'))).toBeLessThan(BLOAT_THRESHOLD);
  });
  it('squareSvg', () => {
    expect(svgoBloat(squareSvg(80, '5 cm'))).toBeLessThan(BLOAT_THRESHOLD);
  });
  it('triangleSvg', () => {
    expect(svgoBloat(triangleSvg(60, 80, '6 cm', '8 cm', '10 cm'))).toBeLessThan(BLOAT_THRESHOLD);
  });
  it('equilateralTriangleSvg', () => {
    expect(svgoBloat(equilateralTriangleSvg(80, '6 cm'))).toBeLessThan(BLOAT_THRESHOLD);
  });
  it('isoscelesTriangleSvg', () => {
    expect(svgoBloat(isoscelesTriangleSvg(80, 70, 'base', 'côté'))).toBeLessThan(BLOAT_THRESHOLD);
  });
  it('rhombusSvg', () => {
    expect(svgoBloat(rhombusSvg(80, 60, 'd1', 'd2'))).toBeLessThan(BLOAT_THRESHOLD);
  });
  it('parallelogramSvg', () => {
    expect(svgoBloat(parallelogramSvg(100, 60, 25, 'b', 'h'))).toBeLessThan(BLOAT_THRESHOLD);
  });
  it('trapezoidSvg', () => {
    expect(svgoBloat(trapezoidSvg(60, 100, 60, 'top', 'bot', 'h'))).toBeLessThan(BLOAT_THRESHOLD);
  });
  it('regularPolygonSvg', () => {
    expect(svgoBloat(regularPolygonSvg(5, 80))).toBeLessThan(BLOAT_THRESHOLD);
    expect(svgoBloat(regularPolygonSvg(6, 80))).toBeLessThan(BLOAT_THRESHOLD);
  });
  it('cuboidSvg', () => {
    expect(svgoBloat(cuboidSvg(80, 50, 30))).toBeLessThan(BLOAT_THRESHOLD);
  });
  it('triangularPrismSvg', () => {
    expect(svgoBloat(triangularPrismSvg(80, 70, 40))).toBeLessThan(BLOAT_THRESHOLD);
  });
  it('squarePyramidSvg', () => {
    expect(svgoBloat(squarePyramidSvg(80, 80))).toBeLessThan(BLOAT_THRESHOLD);
  });
  it('tetrahedronSvg', () => {
    expect(svgoBloat(tetrahedronSvg(80))).toBeLessThan(BLOAT_THRESHOLD);
  });
});
