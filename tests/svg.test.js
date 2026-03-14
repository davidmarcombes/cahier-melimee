// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

// ─── Load SVG functions from app.js ──────────────────────────────────────────
// app.js is browser-only (no exports). We use new Function() so that function
// declarations inside the file are locally scoped and we can return the ones
// we need. We pass explicit stubs for window and localStorage so this works in
// any environment (node or jsdom) without relying on implicit globals.

const __dirname = dirname(fileURLToPath(import.meta.url));
const appSrc = readFileSync(resolve(__dirname, '../src/assets/js/app.js'), 'utf8');

const _windowStub = {};
const _lsStub = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
// app.js calls document.addEventListener('alpine:init', ...) at the top level.
const _documentStub = { addEventListener: () => {} };

const {
  circleSvg,
  slicedPieSvg,
  mathGridSvg,
  rectangleSvg,
  squareSvg,
  triangleSvg,
  fractionShapesSvg,
} = new Function(
  'window',
  'localStorage',
  'document',
  appSrc +
    '\nreturn { circleSvg, slicedPieSvg, mathGridSvg, rectangleSvg, squareSvg, triangleSvg, fractionShapesSvg };'
)(_windowStub, _lsStub, _documentStub);

// ─── DOM validation utility ───────────────────────────────────────────────────
// Uses jsdom's DOMParser to verify the string is well-formed XML.
// A parse error is indicated by a <parsererror> element in the resulting document.

function validateXml(xmlStr) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlStr.trim(), 'text/xml');
  const parseError = doc.querySelector('parsererror');
  return {
    valid: parseError === null,
    error: parseError ? parseError.textContent.trim() : null,
  };
}

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
