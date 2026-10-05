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
  let v = s
    .toString()
    .replace(',', '.')
    .replace(/[\s\u00a0\u202f]/g, '')
    .trim()
    .toLowerCase();
  // Strip trailing decimal zeros: "1.50" → "1.5", "3.10" → "3.1", "2.00" → "2"
  if (/^-?\d+\.\d+$/.test(v)) {
    v = parseFloat(v).toString();
  }
  // Strip leading zeros of whole numbers: "08" → "8" (5 408 c = 54 € 8 c, typed « 08 »)
  else if (/^-?\d+$/.test(v)) {
    v = v.replace(/^(-?)0+(?=\d)/, '$1');
  }
  // Times: "16h30", "16 h 30", "16h30min", "16:30", "16h", "09h05" → "16:30" / "16:00" / "9:05".
  // Colon form needs two-digit minutes, so a division like "12:3" is left alone.
  const t = v.match(/^(\d{1,2})(?:h(\d{2})?(?:min)?|:(\d{2}))$/);
  if (t && +t[1] <= 24 && +(t[2] ?? t[3] ?? 0) < 60) {
    v = `${+t[1]}:${t[2] ?? t[3] ?? '00'}`;
  }
  return v;
}
