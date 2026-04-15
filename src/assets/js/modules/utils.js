/* Operation shorthand renderer — mirrors .eleventy.js renderShorthands for runtime use.
   Converts &box(content) → <span class="op-box">content</span>
   Converts &highlight(content) → <span class="op-hl">content</span> */
export function renderOpShorthands(str) {
  if (!str) return str;
  return str
    .replace(/&box\(([^)]*)\)/g, (_, c) => `<span class="op-box">${c}</span>`)
    .replace(/&highlight\(([^)]*)\)/g, (_, c) => `<span class="op-hl">${c}</span>`)
    .replace(
      /&frac\(([^,]*),([^)]*)\)/g,
      (_, n, d) => `<span class="frac"><span class="fn">${n.trim()}</span><span class="fd">${d.trim()}</span></span>`
    );
}

/**
 * Standard normalizer for answer checking (ignores case, spaces, and commas/dots).
 */
export function normalizeAnswer(s) {
  if (!s) return '';
  return s
    .toString()
    .replace(',', '.')
    .replace(/[\s\u00a0\u202f]/g, '')
    .trim()
    .toLowerCase();
}
