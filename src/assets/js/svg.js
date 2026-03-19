/* ─────────────────────────────────────────────────────────────
   SVG / HTML generation helpers — loaded only on series pages.
   All functions are global so Alpine templates can call them via
   window[gen](...Object.values(par)).
   ───────────────────────────────────────────────────────────── */

function embedSvg(svg) {
  return svg;
}

function mathGridSvg(cols, rows, filled, color = 'var(--p)') {
  const size = 20;
  const gap = 1;
  let svgContent = '';
  for (let i = 0; i < cols * rows; i++) {
    const x = (i % cols) * size;
    const y = Math.floor(i / cols) * size;
    svgContent += `<rect x="${x}" y="${y}" width="${size - gap}" height="${size - gap}"
      fill="${i < filled ? color : 'var(--ss)'}" stroke="var(--cs)" stroke-width="0.5" />`;
  }
  const width = cols * size;
  const height = rows * size;
  return `<svg width="${width}" height="${height}" viewBox="0 -1 ${width} ${height + 1}" style="display:inline-block; margin:5px;">
            ${svgContent}
          </svg>`;
}

function slicedPieSvg(n, k, size = 100, color = 'var(--p)') {
  const c = size / 2;
  const r = size / 2 - 2;
  const f = v => Math.round(v * 100) / 100;
  let filled = '', empty = '';
  for (let i = 0; i < n; i++) {
    const a0 = (i * 2 * Math.PI) / n - Math.PI / 2;
    const a1 = ((i + 1) * 2 * Math.PI) / n - Math.PI / 2;
    const d = `M${c},${c}L${f(c+r*Math.cos(a0))},${f(c+r*Math.sin(a0))}A${r},${r},0,0,1,${f(c+r*Math.cos(a1))},${f(c+r*Math.sin(a1))}Z`;
    if (i < k) filled += `<path d="${d}" fill="${color}"/>`;
    else empty += `<path d="${d}" fill="var(--sf)"/>`;
  }
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg"><g stroke="var(--cs)" stroke-width="1">${filled}${empty}</g></svg>`;
}

function circleSvg(r, label = '', fillColor = 'var(--sf)') {
  const pad = label ? 40 : 5;
  const size = r * 2 + pad * 2;
  const center = r + pad;
  let labelHtml = '';
  if (label) {
    labelHtml = `
      <line x1="${center}" y1="${center}" x2="${center + r}" y2="${center}" stroke="var(--ct)" stroke-dasharray="4" />
      <text x="${center + r / 2}" y="${center - 10}" text-anchor="middle" font-size="14" font-family="Arial" fill="var(--ct)">${label}</text>`;
  }
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <circle cx="${center}" cy="${center}" r="${r}" fill="${fillColor}" stroke="var(--ct)" stroke-width="2" />
      ${labelHtml}
    </svg>`;
}

function rectangleSvg(w, h, labelW = '', labelH = '', fillColor = 'var(--sf)') {
  const pad = labelW || labelH ? 35 : 5;
  const totalW = w + pad * 2;
  const totalH = h + pad * 2;
  return `<svg width="${totalW}" height="${totalH}" viewBox="0 0 ${totalW} ${totalH}" xmlns="http://www.w3.org/2000/svg">
      <rect x="${pad}" y="${pad}" width="${w}" height="${h}" fill="${fillColor}" stroke="var(--ct)" stroke-width="2" />
      ${labelW ? `<text x="${pad + w / 2}" y="${pad + h + 25}" text-anchor="middle" font-family="Arial" fill="var(--ct)">${labelW}</text>` : ''}
      ${labelH ? `<text x="${pad - 10}" y="${pad + h / 2}" text-anchor="end" dominant-baseline="middle" font-family="Arial" fill="var(--ct)">${labelH}</text>` : ''}
    </svg>`;
}

function squareSvg(size, label = '', fillColor = 'var(--sf)') {
  const pad = 35;
  const total = size + pad * 2;
  return `<svg width="${total}" height="${total}" viewBox="0 0 ${total} ${total}" xmlns="http://www.w3.org/2000/svg">
      <rect x="${pad}" y="${pad}" width="${size}" height="${size}" fill="${fillColor}" stroke="var(--ct)" stroke-width="2" />
      ${label ? `<text x="${pad + size / 2}" y="${pad + size + 25}" text-anchor="middle" font-family="Arial" fill="var(--ct)">${label}</text>` : ''}
    </svg>`;
}

function triangleSvg(pixA, pixB, labelA = '', labelB = '', labelC = '', fillColor = 'var(--sf)') {
  const padX = 45, padTop = 15, padBot = 28;
  const totalW = pixA + padX * 2;
  const totalH = pixB + padTop + padBot;
  const x0 = padX, y0 = padTop + pixB;
  const x1 = padX + pixA, y1 = padTop + pixB;
  const x2 = padX, y2 = padTop;
  const m = 10;
  return `<svg width="${totalW}" height="${totalH}" viewBox="0 0 ${totalW} ${totalH}" xmlns="http://www.w3.org/2000/svg">
      <polygon points="${x0},${y0} ${x1},${y1} ${x2},${y2}" fill="${fillColor}" stroke="var(--ct)" stroke-width="2" />
      <polyline points="${x0 + m},${y0} ${x0 + m},${y0 - m} ${x0},${y0 - m}" fill="none" stroke="var(--ct)" stroke-width="1.5" />
      ${labelA ? `<text x="${(x0 + x1) / 2}" y="${y0 + 20}" text-anchor="middle" font-family="Arial" fill="var(--ct)">${labelA}</text>` : ''}
      ${labelB ? `<text x="${x0 - 8}" y="${(y0 + y2) / 2}" text-anchor="end" dominant-baseline="middle" font-family="Arial" fill="var(--ct)">${labelB}</text>` : ''}
      ${labelC ? `<text x="${(x1 + x2) / 2 + 15}" y="${(y1 + y2) / 2 - 6}" text-anchor="start" font-family="Arial" fill="var(--ct)">${labelC}</text>` : ''}
    </svg>`;
}

// pie chart for fraction n/d with the fraction label below
function fractionShapesSvg(n, d, size = 80) {
  const pie = slicedPieSvg(d, n, size);
  return `<span style="display:inline-flex;flex-direction:column;align-items:center;gap:0.4rem">${pie}<span class="frac text-lg"><span class="fn">${n}</span><span class="fd">${d}</span></span></span>`;
}

// --- 3D Shapes ---

function cubeSvg(size = 50, color = 'var(--p)', opacity = 1) {
  const tilt = size * 0.4;
  const w = size;
  const h = size;
  const totalW = w + tilt + 4;
  const totalH = h + tilt + 4;
  return `<svg width="${totalW}" height="${totalH}" viewBox="-2 -2 ${totalW} ${totalH}" style="opacity:${opacity}; display:inline-block; margin:4px;" xmlns="http://www.w3.org/2000/svg">
    <g stroke="var(--cs)" stroke-width="1.5" stroke-linejoin="round">
      <polygon points="${tilt},0 ${w + tilt},0 ${w},${tilt} 0,${tilt}" fill="${color}" />
      <polygon points="${tilt},0 ${w + tilt},0 ${w},${tilt} 0,${tilt}" fill="rgba(255,255,255,0.3)" />
      <polygon points="${w},${tilt} ${w + tilt},0 ${w + tilt},${h} ${w},${h + tilt}" fill="${color}" />
      <polygon points="${w},${tilt} ${w + tilt},0 ${w + tilt},${h} ${w},${h + tilt}" fill="rgba(0,0,0,0.2)" />
      <polygon points="0,${tilt} ${w},${tilt} ${w},${h + tilt} 0,${h + tilt}" fill="${color}" />
    </g>
  </svg>`;
}

function sphereSvg(r = 40, color = 'var(--p)', opacity = 1) {
  const size = r * 2 + 10;
  const cx = size / 2;
  const cy = size / 2;
  const gid = 'rg_' + Math.random().toString(36).substr(2, 5);
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="opacity:${opacity}; display:inline-block; margin:4px;" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="${gid}" cx="35%" cy="35%" r="65%">
        <stop offset="0%" stop-color="#fff" stop-opacity="0.6"/>
        <stop offset="40%" stop-color="${color}" stop-opacity="1"/>
        <stop offset="100%" stop-color="#000" stop-opacity="0.5"/>
      </radialGradient>
    </defs>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${gid})" stroke="var(--cs)" stroke-width="1.5" />
  </svg>`;
}

function cylinderSvg(w = 50, h = 80, color = 'var(--p)', opacity = 1) {
  const rx = w / 2;
  const ry = rx * 0.4;
  const totalW = w + 10;
  const totalH = h + ry * 2 + 10;
  const x0 = 5;
  const y0 = 5 + ry;
  const gid = 'lg_' + Math.random().toString(36).substr(2, 5);
  return `<svg width="${totalW}" height="${totalH}" viewBox="0 0 ${totalW} ${totalH}" style="opacity:${opacity}; display:inline-block; margin:4px;" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="${gid}" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#000" stop-opacity="0.3"/>
        <stop offset="30%" stop-color="${color}" stop-opacity="1"/>
        <stop offset="70%" stop-color="${color}" stop-opacity="1"/>
        <stop offset="100%" stop-color="#000" stop-opacity="0.5"/>
      </linearGradient>
    </defs>
    <g stroke="var(--cs)" stroke-width="1.5" stroke-linejoin="round">
      <path d="M ${x0},${y0} V ${y0 + h} A ${rx} ${ry} 0 0 0 ${x0 + w},${y0 + h} V ${y0} Z" fill="url(#${gid})" />
      <ellipse cx="${x0 + rx}" cy="${y0}" rx="${rx}" ry="${ry}" fill="${color}" />
      <ellipse cx="${x0 + rx}" cy="${y0}" rx="${rx}" ry="${ry}" fill="rgba(255,255,255,0.3)" />
    </g>
  </svg>`;
}

function coneSvg(w = 60, h = 90, color = 'var(--p)', opacity = 1) {
  const rx = w / 2;
  const ry = rx * 0.4;
  const totalW = w + 10;
  const totalH = h + ry + 10;
  const cx = totalW / 2;
  const topY = 5;
  const botY = topY + h;
  const x0 = cx - rx;
  const x1 = cx + rx;
  const gid = 'lg_' + Math.random().toString(36).substr(2, 5);
  return `<svg width="${totalW}" height="${totalH}" viewBox="0 0 ${totalW} ${totalH}" style="opacity:${opacity}; display:inline-block; margin:4px;" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="${gid}" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#000" stop-opacity="0.3"/>
        <stop offset="35%" stop-color="${color}" stop-opacity="1"/>
        <stop offset="100%" stop-color="#000" stop-opacity="0.6"/>
      </linearGradient>
    </defs>
    <g stroke="var(--cs)" stroke-width="1.5" stroke-linejoin="round">
      <path d="M ${cx},${topY} L ${x0},${botY} A ${rx} ${ry} 0 0 0 ${x1},${botY} Z" fill="url(#${gid})" />
    </g>
  </svg>`;
}

// decompoChipsHtml — place-value chips with dot rows (grouped 5+remainder)
// chips: [{ label, value }, ...] — value 0-9
function decompoChipsHtml(chips) {
  const COLORS = ['var(--orange, #e0743c)', 'var(--p)', 'var(--green, #4daa60)'];
  const parts = chips.map(({ label, value }, i) => {
    const c = COLORS[i % COLORS.length];
    let dots;
    if (value === 0) {
      dots = `<span style="color:var(--cs);font-size:11px;line-height:1">—</span>`;
    } else {
      const r1 = Math.min(value, 5), r2 = value - r1;
      const s = `display:block;color:${c};font-size:11px;line-height:1.3;letter-spacing:1px`;
      dots = `<span style="${s}">${'●'.repeat(r1)}</span>${r2 ? `<span style="${s}">${'●'.repeat(r2)}</span>` : ''}`;
    }
    return (
      `<div style="display:inline-flex;flex-direction:column;border-radius:8px;overflow:hidden;min-width:50px">` +
      `<div style="background:${c};color:#fff;padding:3px 6px;font-size:10px;font-weight:700;font-family:system-ui,sans-serif;text-align:center;white-space:nowrap">${label}</div>` +
      `<div style="background:var(--sf);border:1.5px solid ${c};border-top:none;border-radius:0 0 8px 8px;padding:5px 4px;display:flex;flex-direction:column;align-items:center;gap:2px;min-height:28px;justify-content:center">${dots}</div>` +
      `</div>`
    );
  });
  return `<div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center">${parts.join('')}</div>`;
}

// abacusSvg — boulier/abacus SVG
// rows: [{ label, value }, ...] — value 0..beadsPerRow
function abacusSvg(rows, beadsPerRow = 10) {
  const COLORS = ['var(--orange, #e0743c)', 'var(--p)', 'var(--green, #4daa60)'];
  const R = 7, SLOT = 18, ROW_H = 26, V_PAD = 10, H_PAD = 10;
  const ROD_W = beadsPerRow * SLOT + 10;
  const FRAME_W = ROD_W + H_PAD * 2;
  const LABEL_W = 76, GAP = 6;
  const TOTAL_W = LABEL_W + GAP + FRAME_W;
  const FRAME_H = rows.length * ROW_H + V_PAD * 2;
  const FX = LABEL_W + GAP;
  let g = '';

  g += `<rect x="${FX}" y="0" width="${FRAME_W}" height="${FRAME_H}" rx="6" fill="var(--sf)" stroke="var(--cs)" stroke-width="1.5"/>`;

  rows.forEach(({ label, value }, ri) => {
    const cy = V_PAD + ri * ROW_H + ROW_H / 2;
    const color = COLORS[ri % COLORS.length];
    const x1 = FX + H_PAD, x2 = FX + H_PAD + ROD_W;

    if (ri > 0)
      g += `<line x1="${FX + 1}" y1="${V_PAD + ri * ROW_H}" x2="${FX + FRAME_W - 1}" y2="${V_PAD + ri * ROW_H}" stroke="var(--cs)" stroke-width="0.5" opacity="0.4"/>`;
    g += `<line x1="${x1}" y1="${cy}" x2="${x2}" y2="${cy}" stroke="var(--cs)" stroke-width="1.5"/>`;
    g += `<text x="${LABEL_W}" y="${cy}" text-anchor="end" dominant-baseline="middle" font-family="system-ui,sans-serif" font-size="11" font-weight="600" fill="var(--ct)">${label}</text>`;

    for (let i = 0; i < value; i++) {
      const bx = x1 + R + i * SLOT;
      g += `<circle cx="${bx}" cy="${cy}" r="${R}" fill="${color}"/>`;
      g += `<circle cx="${bx - 2}" cy="${cy - 3}" r="2" fill="rgba(255,255,255,0.35)"/>`;
    }
    for (let j = 0; j < beadsPerRow - value; j++) {
      const bx = x2 - R - j * SLOT;
      g += `<circle cx="${bx}" cy="${cy}" r="${R}" fill="var(--ss)" stroke="var(--cs)" stroke-width="1"/>`;
    }
  });

  return `<svg width="${TOTAL_W}" height="${FRAME_H}" viewBox="0 0 ${TOTAL_W} ${FRAME_H}" xmlns="http://www.w3.org/2000/svg">${g}</svg>`;
}

function rulerSvg(min = 0, max = 10, step = 1, minorStep = 0.1, customLabels = {}, markColor = 'var(--p)', width = 500) {
  const height = 110;
  const pad = 40;
  const totalW = width + pad * 2;
  const range = max - min;
  const getX = (val) => pad + ((val - min) / range) * width;
  const lineY = 35;
  let ticks = '';
  let labels = '';

  for (let i = min; i <= max; i += minorStep) {
    const currentVal = Math.round(i * 1000) / 1000;
    const x = getX(currentVal);
    const isMajor = Math.abs((currentVal - min) % step) < 0.001;
    const tickHeight = isMajor ? 20 : 10;
    ticks += `<line x1="${x}" y1="${lineY}" x2="${x}" y2="${lineY - tickHeight}" stroke="var(--ct)" stroke-width="1.5" />`;
    if (isMajor) {
      labels += `<text x="${x}" y="${lineY - 25}" text-anchor="middle" font-family="Arial" font-size="12" fill="var(--cs)">${currentVal}</text>`;
    }
    if (customLabels[currentVal] !== undefined) {
      const stemLength = 25;
      const headSize = 8;
      const headHeight = 10;
      const points = `${x},${lineY} ${x + headSize},${lineY + headHeight} ${x - headSize},${lineY + headHeight}`;
      labels += `
        <polygon points="${points}" fill="${markColor}" />
        <line x1="${x}" y1="${lineY + headHeight}" x2="${x}" y2="${lineY + headHeight + stemLength}" stroke="${markColor}" stroke-width="2.5" />
        <text x="${x}" y="${lineY + headHeight + stemLength + 20}" text-anchor="middle" font-family="Arial" font-size="16" font-weight="bold" fill="${markColor}">
          ${customLabels[currentVal]}
        </text>`;
    }
  }

  return `<svg width="${totalW}" height="${height}" viewBox="0 0 ${totalW} ${height}" xmlns="http://www.w3.org/2000/svg">
      <line x1="${pad}" y1="${lineY}" x2="${pad + width}" y2="${lineY}" stroke="var(--ct)" stroke-width="2" />
      ${ticks}
      ${labels}
    </svg>`;
}

function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return { x: centerX + radius * Math.cos(angleInRadians), y: centerY + radius * Math.sin(angleInRadians) };
}

function describeArc(x, y, radius, startAngle, endAngle) {
  const start = polarToCartesian(x, y, radius, endAngle);
  const end = polarToCartesian(x, y, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return ['M', x, y, 'L', start.x, start.y, 'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y, 'Z'].join(' ');
}

// fractionShapesSvg — fraction shape renderer (circle/square) used by fraction type
function fractionShapesSvg(fraction) {
  if (!fraction) return [];
  const { numerator, denominator, shape, rows, cols } = fraction;
  if (!denominator) return [];
  const count = Math.ceil(numerator / denominator) || 1;
  const shapes = [];

  for (let sIdx = 1; sIdx <= count; sIdx++) {
    const filledInThisShape = Math.max(0, Math.min(denominator, numerator - (sIdx - 1) * denominator));
    let svgContent = '';

    if (shape === 'circle') {
      svgContent += `<circle cx="50" cy="50" r="48" fill="white" stroke="currentColor" stroke-width="2" class="fill-white dark:fill-slate-900 text-slate-300 dark:text-slate-600" />`;
      for (let pIdx = 1; pIdx <= denominator; pIdx++) {
        const arc = describeArc(50, 50, 48, (pIdx - 1) * (360 / denominator), pIdx * (360 / denominator));
        svgContent += `<path d="${arc}" fill="none" stroke="currentColor" stroke-width="1" class="text-slate-300 dark:text-slate-600" />`;
        if (pIdx <= filledInThisShape) {
          svgContent += `<path d="${arc}" class="fill-primary-500 stroke-primary-700" stroke-width="1" />`;
        }
      }
    } else if (shape === 'square') {
      svgContent += `<rect x="2" y="2" width="96" height="96" fill="white" stroke="currentColor" stroke-width="2" class="fill-white dark:fill-slate-900 text-slate-300 dark:text-slate-600" />`;
      const rCount = rows || 1;
      const cCount = cols || denominator || 1;
      const w = 96 / cCount;
      const h = 96 / rCount;
      for (let r = 1; r <= rCount; r++) {
        for (let c = 1; c <= cCount; c++) {
          const itemIdx = (r - 1) * cCount + c;
          const x = 2 + (c - 1) * w;
          const y = 2 + (r - 1) * h;
          svgContent += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="currentColor" stroke-width="1" class="text-slate-300 dark:text-slate-700" />`;
          if (itemIdx <= filledInThisShape) {
            svgContent += `<rect x="${x}" y="${y}" width="${w}" height="${h}" class="fill-primary-500 stroke-primary-700" stroke-width="1" />`;
          }
        }
      }
    }
    shapes.push({ idx: sIdx, svg: `<svg viewBox="0 0 100 100" class="w-full h-full drop-shadow-sm">${svgContent}</svg>` });
  }
  return shapes;
}

// ─── 2D shapes (curriculum additions) ────────────────────────────────────────

function equilateralTriangleSvg(size = 80, label = '', fillColor = 'var(--sf)') {
  const h = Math.round(size * Math.sqrt(3) / 2);
  const padX = 10, padTop = 10, padBot = label ? 28 : 10;
  const totalW = size + padX * 2;
  const totalH = h + padTop + padBot;
  const x0 = padX, y0 = padTop + h;
  const x1 = padX + size, y1 = padTop + h;
  const x2 = padX + size / 2, y2 = padTop;
  return `<svg width="${totalW}" height="${totalH}" viewBox="0 0 ${totalW} ${totalH}" xmlns="http://www.w3.org/2000/svg">
    <polygon points="${x0},${y0} ${x1},${y1} ${x2},${y2}" fill="${fillColor}" stroke="var(--ct)" stroke-width="2"/>
    ${label ? `<text x="${totalW / 2}" y="${y0 + 20}" text-anchor="middle" font-family="Arial" fill="var(--ct)">${label}</text>` : ''}
  </svg>`;
}

function isoscelesTriangleSvg(base = 80, height = 70, labelBase = '', labelSide = '', fillColor = 'var(--sf)') {
  const padX = labelSide ? 45 : 10, padTop = 10, padBot = labelBase ? 28 : 10;
  const totalW = base + padX * 2;
  const totalH = height + padTop + padBot;
  const x0 = padX, y0 = padTop + height;
  const x1 = padX + base, y1 = padTop + height;
  const x2 = padX + base / 2, y2 = padTop;
  return `<svg width="${totalW}" height="${totalH}" viewBox="0 0 ${totalW} ${totalH}" xmlns="http://www.w3.org/2000/svg">
    <polygon points="${x0},${y0} ${x1},${y1} ${x2},${y2}" fill="${fillColor}" stroke="var(--ct)" stroke-width="2"/>
    ${labelBase ? `<text x="${(x0 + x1) / 2}" y="${y0 + 20}" text-anchor="middle" font-family="Arial" fill="var(--ct)">${labelBase}</text>` : ''}
    ${labelSide ? `<text x="${x0 - 8}" y="${(y0 + y2) / 2}" text-anchor="end" dominant-baseline="middle" font-family="Arial" fill="var(--ct)">${labelSide}</text>` : ''}
  </svg>`;
}

// losange — all 4 sides equal, diagonals w (horizontal) and h (vertical)
function rhombusSvg(w = 80, h = 60, labelW = '', labelH = '', fillColor = 'var(--sf)') {
  const padX = labelH ? 40 : 10, padY = labelW ? 30 : 10;
  const totalW = w + padX * 2;
  const totalH = h + padY * 2;
  const cx = totalW / 2, cy = totalH / 2;
  const pts = `${cx},${cy - h / 2} ${cx + w / 2},${cy} ${cx},${cy + h / 2} ${cx - w / 2},${cy}`;
  return `<svg width="${totalW}" height="${totalH}" viewBox="0 0 ${totalW} ${totalH}" xmlns="http://www.w3.org/2000/svg">
    <polygon points="${pts}" fill="${fillColor}" stroke="var(--ct)" stroke-width="2"/>
    ${labelW ? `<text x="${cx}" y="${cy + h / 2 + 20}" text-anchor="middle" font-family="Arial" fill="var(--ct)">${labelW}</text>` : ''}
    ${labelH ? `<text x="${cx - w / 2 - 8}" y="${cy}" text-anchor="end" dominant-baseline="middle" font-family="Arial" fill="var(--ct)">${labelH}</text>` : ''}
  </svg>`;
}

// parallélogramme — skew is horizontal offset of the top edge (default w/4)
function parallelogramSvg(w = 100, h = 60, skew = 25, labelW = '', labelH = '', fillColor = 'var(--sf)') {
  const padX = labelH ? 40 : 10, padY = labelW ? 30 : 10;
  const totalW = w + skew + padX * 2;
  const totalH = h + padY * 2;
  const x0 = padX, y0 = padY + h;
  const x1 = padX + w, y1 = padY + h;
  const x2 = padX + w + skew, y2 = padY;
  const x3 = padX + skew, y3 = padY;
  return `<svg width="${totalW}" height="${totalH}" viewBox="0 0 ${totalW} ${totalH}" xmlns="http://www.w3.org/2000/svg">
    <polygon points="${x0},${y0} ${x1},${y1} ${x2},${y2} ${x3},${y3}" fill="${fillColor}" stroke="var(--ct)" stroke-width="2"/>
    ${labelW ? `<text x="${(x0 + x1) / 2}" y="${y0 + 22}" text-anchor="middle" font-family="Arial" fill="var(--ct)">${labelW}</text>` : ''}
    ${labelH ? `<text x="${x0 - 8}" y="${(y0 + y3) / 2}" text-anchor="end" dominant-baseline="middle" font-family="Arial" fill="var(--ct)">${labelH}</text>` : ''}
  </svg>`;
}

// trapèze — topW < botW for standard trapezoid (wider base)
function trapezoidSvg(topW = 60, botW = 100, h = 60, labelTop = '', labelBot = '', labelH = '', fillColor = 'var(--sf)') {
  const padX = labelH ? 40 : 10;
  const padTop = labelTop ? 28 : 10, padBot = labelBot ? 28 : 10;
  const offset = (botW - topW) / 2;
  const totalW = botW + padX * 2;
  const totalH = h + padTop + padBot;
  const x0 = padX, y0 = padTop + h;
  const x1 = padX + botW, y1 = padTop + h;
  const x2 = padX + offset + topW, y2 = padTop;
  const x3 = padX + offset, y3 = padTop;
  return `<svg width="${totalW}" height="${totalH}" viewBox="0 0 ${totalW} ${totalH}" xmlns="http://www.w3.org/2000/svg">
    <polygon points="${x0},${y0} ${x1},${y1} ${x2},${y2} ${x3},${y3}" fill="${fillColor}" stroke="var(--ct)" stroke-width="2"/>
    ${labelBot ? `<text x="${(x0 + x1) / 2}" y="${y0 + 20}" text-anchor="middle" font-family="Arial" fill="var(--ct)">${labelBot}</text>` : ''}
    ${labelTop ? `<text x="${(x2 + x3) / 2}" y="${y2 - 8}" text-anchor="middle" font-family="Arial" fill="var(--ct)">${labelTop}</text>` : ''}
    ${labelH ? `<text x="${x0 - 8}" y="${(y0 + y3) / 2}" text-anchor="end" dominant-baseline="middle" font-family="Arial" fill="var(--ct)">${labelH}</text>` : ''}
  </svg>`;
}

// polygone régulier — n sides, first vertex at top; covers pentagon, hexagon, octagon, etc.
function regularPolygonSvg(n = 6, size = 80, label = '', fillColor = 'var(--sf)') {
  const r = size / 2;
  const pad = 10, labelPad = label ? 24 : 0;
  const totalSize = size + pad * 2;
  const totalH = totalSize + labelPad;
  const cx = totalSize / 2, cy = totalSize / 2;
  const pts = Array.from({ length: n }, (_, i) => {
    const a = (i * 2 * Math.PI / n) - Math.PI / 2;
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  }).join(' ');
  return `<svg width="${totalSize}" height="${totalH}" viewBox="0 0 ${totalSize} ${totalH}" xmlns="http://www.w3.org/2000/svg">
    <polygon points="${pts}" fill="${fillColor}" stroke="var(--ct)" stroke-width="2"/>
    ${label ? `<text x="${cx}" y="${cy + r + 22}" text-anchor="middle" font-family="Arial" fill="var(--ct)">${label}</text>` : ''}
  </svg>`;
}

// ─── 3D shapes (curriculum additions) ────────────────────────────────────────
// All use the same oblique projection as cubeSvg: depth d maps to (+tilt, -tilt)
// where tilt = d * 0.4. Faces are layered back-to-front (painter's algorithm)
// with rgba overlays to simulate lighting (white=bright top, black=dark right/bottom).

// pavé droit — rectangular prism with distinct width, height, depth
function cuboidSvg(fw = 80, fh = 50, d = 30, color = 'var(--p)', opacity = 1) {
  const tilt = d * 0.4;
  const totalW = fw + tilt + 4;
  const totalH = fh + tilt + 4;
  return `<svg width="${totalW}" height="${totalH}" viewBox="-2 -2 ${totalW} ${totalH}" style="opacity:${opacity}; display:inline-block; margin:4px;" xmlns="http://www.w3.org/2000/svg">
    <g stroke="var(--cs)" stroke-width="1.5" stroke-linejoin="round">
      <polygon points="${tilt},0 ${fw + tilt},0 ${fw},${tilt} 0,${tilt}" fill="${color}"/>
      <polygon points="${tilt},0 ${fw + tilt},0 ${fw},${tilt} 0,${tilt}" fill="rgba(255,255,255,0.3)"/>
      <polygon points="${fw},${tilt} ${fw + tilt},0 ${fw + tilt},${fh} ${fw},${fh + tilt}" fill="${color}"/>
      <polygon points="${fw},${tilt} ${fw + tilt},0 ${fw + tilt},${fh} ${fw},${fh + tilt}" fill="rgba(0,0,0,0.2)"/>
      <polygon points="0,${tilt} ${fw},${tilt} ${fw},${fh + tilt} 0,${fh + tilt}" fill="${color}"/>
    </g>
  </svg>`;
}

// prisme triangulaire — triangular cross-section (equilateral by default), depth d
function triangularPrismSvg(fw = 80, fh = 70, d = 40, color = 'var(--p)', opacity = 1) {
  const tilt = d * 0.4;
  const totalW = fw + tilt + 4;
  const totalH = fh + tilt + 4;
  // Front triangle vertices
  const fa = [fw / 2, tilt], fb = [0, fh + tilt], fc = [fw, fh + tilt];
  // Back triangle = front + (tilt, -tilt)
  const ba = [fw / 2 + tilt, 0], bb = [tilt, fh], bc = [fw + tilt, fh];
  const p = v => v.join(',');
  return `<svg width="${totalW}" height="${totalH}" viewBox="-2 -2 ${totalW} ${totalH}" style="opacity:${opacity}; display:inline-block; margin:4px;" xmlns="http://www.w3.org/2000/svg">
    <g stroke="var(--cs)" stroke-width="1.5" stroke-linejoin="round">
      <polygon points="${p(fb)} ${p(fc)} ${p(bc)} ${p(bb)}" fill="${color}"/>
      <polygon points="${p(fb)} ${p(fc)} ${p(bc)} ${p(bb)}" fill="rgba(0,0,0,0.3)"/>
      <polygon points="${p(fc)} ${p(fa)} ${p(ba)} ${p(bc)}" fill="${color}"/>
      <polygon points="${p(fc)} ${p(fa)} ${p(ba)} ${p(bc)}" fill="rgba(0,0,0,0.15)"/>
      <polygon points="${p(fa)} ${p(fb)} ${p(fc)}" fill="${color}"/>
    </g>
  </svg>`;
}

// pyramide à base carrée
function squarePyramidSvg(base = 80, pyh = 80, color = 'var(--p)', opacity = 1) {
  const tilt = base * 0.4;
  const totalW = base + tilt + 4;
  const totalH = pyh + tilt + 4;
  const BFL = `0,${pyh + tilt}`, BFR = `${base},${pyh + tilt}`;
  const BBR = `${base + tilt},${pyh}`, BBL = `${tilt},${pyh}`;
  const APX = `${(base + tilt) / 2},${tilt / 2}`;
  return `<svg width="${totalW}" height="${totalH}" viewBox="-2 -2 ${totalW} ${totalH}" style="opacity:${opacity}; display:inline-block; margin:4px;" xmlns="http://www.w3.org/2000/svg">
    <g stroke="var(--cs)" stroke-width="1.5" stroke-linejoin="round">
      <polygon points="${BFL} ${BFR} ${BBR} ${BBL}" fill="${color}"/>
      <polygon points="${BFL} ${BFR} ${BBR} ${BBL}" fill="rgba(0,0,0,0.35)"/>
      <polygon points="${BFR} ${BBR} ${APX}" fill="${color}"/>
      <polygon points="${BFR} ${BBR} ${APX}" fill="rgba(0,0,0,0.15)"/>
      <polygon points="${BFL} ${BFR} ${APX}" fill="${color}"/>
    </g>
  </svg>`;
}

// tétraèdre (pyramide à base triangulaire régulière)
function tetrahedronSvg(size = 80, color = 'var(--p)', opacity = 1) {
  const h = size * 0.866; // equilateral triangle height
  const tilt = size * 0.3;
  const pad = 4;
  const totalW = size + tilt + pad * 2;
  const totalH = h + tilt + pad * 2;
  // Base: equilateral triangle in oblique projection
  const A = [size / 2 + pad, h + tilt + pad]; // front vertex
  const B = [pad, tilt + pad];                 // back-left
  const C = [size + pad, tilt + pad];          // back-right
  // Apex: above centroid
  const cx = (A[0] + B[0] + C[0]) / 3;
  const cy = (A[1] + B[1] + C[1]) / 3;
  const D = [cx + tilt * 0.2, cy - h * 0.55];
  const p = v => v.map(n => n.toFixed(1)).join(',');
  return `<svg width="${totalW}" height="${totalH}" viewBox="0 0 ${totalW} ${totalH}" style="opacity:${opacity}; display:inline-block; margin:4px;" xmlns="http://www.w3.org/2000/svg">
    <g stroke="var(--cs)" stroke-width="1.5" stroke-linejoin="round">
      <polygon points="${p(B)} ${p(C)} ${p(D)}" fill="${color}"/>
      <polygon points="${p(B)} ${p(C)} ${p(D)}" fill="rgba(0,0,0,0.25)"/>
      <polygon points="${p(A)} ${p(C)} ${p(D)}" fill="${color}"/>
      <polygon points="${p(A)} ${p(C)} ${p(D)}" fill="rgba(0,0,0,0.1)"/>
      <polygon points="${p(A)} ${p(B)} ${p(D)}" fill="${color}"/>
    </g>
  </svg>`;
}

// rowsOfSvg — equal rows of items (multiplication / division intuition)
// rows: number of rows, cols: items per row
// emoji: any emoji char, or '●' for filled dot
// color: CSS color/var for dots (ignored for emoji)
function rowsOfSvg(rows, cols, emoji = '●', color = 'var(--p)') {
  const ITEM = 26, CGAP = 6, RGAP = 12, PAD = 10;
  const useEmoji = emoji !== '●';
  const W = cols * (ITEM + CGAP) - CGAP + PAD * 2;
  const H = rows * (ITEM + RGAP) - RGAP + PAD * 2;
  let g = '';
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cx = PAD + c * (ITEM + CGAP) + ITEM / 2;
      const cy = PAD + r * (ITEM + RGAP) + ITEM / 2;
      if (useEmoji) {
        g += `<text x="${cx}" y="${cy + 1}" text-anchor="middle" font-size="${ITEM}" font-family="system-ui,sans-serif">${emoji}</text>`;
      } else {
        g += `<circle cx="${cx}" cy="${cy}" r="${ITEM / 2 - 2}" fill="${color}"/>`;
      }
    }
  }
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">${g}</svg>`;
}

// packetsOfSvg — groups of items in rounded packets (multiplication / division intuition)
// packets: number of groups, perPacket: items per group
// emoji: any emoji char, or '●' for filled dot
// color: CSS color/var for dots and packet border
function packetsOfSvg(packets, perPacket, emoji = '●', color = 'var(--p)') {
  const ITEM = 22, IGAP = 5, IPAD = 8, PGAP = 14, PAD = 8;
  const useEmoji = emoji !== '●';
  const pCols = perPacket <= 3 ? perPacket : Math.ceil(Math.sqrt(perPacket));
  const pRows = Math.ceil(perPacket / pCols);
  const pW = pCols * ITEM + (pCols - 1) * IGAP + IPAD * 2;
  const pH = pRows * ITEM + (pRows - 1) * IGAP + IPAD * 2;
  const maxPerRow = Math.min(packets, 5);
  const pRowCount = Math.ceil(packets / maxPerRow);
  const W = maxPerRow * pW + (maxPerRow - 1) * PGAP + PAD * 2;
  const H = pRowCount * pH + (pRowCount - 1) * PGAP + PAD * 2;
  let g = '';
  for (let p = 0; p < packets; p++) {
    const pCol = p % maxPerRow;
    const pRow = Math.floor(p / maxPerRow);
    const px = PAD + pCol * (pW + PGAP);
    const py = PAD + pRow * (pH + PGAP);
    g += `<rect x="${px}" y="${py}" width="${pW}" height="${pH}" rx="10" fill="var(--sf)" stroke="${color}" stroke-width="2"/>`;
    for (let i = 0; i < perPacket; i++) {
      const ic = i % pCols;
      const ir = Math.floor(i / pCols);
      const ix = px + IPAD + ic * (ITEM + IGAP) + ITEM / 2;
      const iy = py + IPAD + ir * (ITEM + IGAP) + ITEM / 2;
      if (useEmoji) {
        g += `<text x="${ix}" y="${iy + 1}" text-anchor="middle" font-size="${ITEM}" font-family="system-ui,sans-serif">${emoji}</text>`;
      } else {
        g += `<circle cx="${ix}" cy="${iy}" r="${ITEM / 2 - 2}" fill="${color}"/>`;
      }
    }
  }
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">${g}</svg>`;
}

function rulerExerciseSvg(r) {
  if (!r) return '';
  const W = 420, PAD = 40, Y = 60;
  const range = r.max - r.min;
  if (range <= 0) return '';
  const uw = W / range;
  const divs = r.divisions || 1;
  const subs = r.subdivisions || 0;
  let s = `<line x1="${PAD}" y1="${Y}" x2="${PAD + W}" y2="${Y}" stroke="currentColor" stroke-width="2"/>`;
  for (let u = 0; u <= range; u++) {
    const x = PAD + u * uw;
    s += `<line x1="${x}" y1="${Y - 18}" x2="${x}" y2="${Y}" stroke="currentColor" stroke-width="2"/>`;
    s += `<text x="${x}" y="${Y + 16}" text-anchor="middle" fill="currentColor" font-size="12" font-weight="500">${r.min + u}</text>`;
    if (u < range) {
      for (let d = 1; d < divs; d++) {
        s += `<line x1="${x + (d * uw) / divs}" y1="${Y - 12}" x2="${x + (d * uw) / divs}" y2="${Y}" stroke="currentColor" stroke-width="1.5"/>`;
      }
      if (subs > 0) {
        for (let d = 0; d < divs; d++) {
          for (let sub = 1; sub < subs; sub++) {
            const xs = x + ((d + sub / subs) * uw) / divs;
            s += `<line x1="${xs}" y1="${Y - 7}" x2="${xs}" y2="${Y}" stroke="currentColor" stroke-width="1"/>`;
          }
        }
      }
    }
  }
  if (r.markers) {
    r.markers.forEach((m) => {
      const x = PAD + (m.value - r.min) * uw;
      s += `<polygon points="${x},${Y - 22} ${x - 6},${Y - 34} ${x + 6},${Y - 34}" class="fill-red-500 dark:fill-red-400"/>`;
      s += `<text x="${x}" y="${Y - 38}" text-anchor="middle" fill="currentColor" font-size="14" font-weight="700" class="fill-red-600 dark:fill-red-400">${m.label}</text>`;
    });
  }
  return s;
}

function numberLineSvg(nl) {
  if (!nl) return '';
  const min = nl.min ?? 0;
  const max = nl.max ?? 10;
  const range = max - min;
  if (range <= 0) return '';

  const PAD = 40, W = 420, LY = 58;
  const uw = W / range;
  const step = nl.step ?? 1;
  const subs = nl.subdivisions ?? 0;

  let s = '';

  // Horizontal line with right arrowhead
  s += `<line x1="${PAD}" y1="${LY}" x2="${PAD + W + 8}" y2="${LY}" stroke="currentColor" stroke-width="2"/>`;
  s += `<polygon points="${PAD + W + 14},${LY} ${PAD + W + 5},${LY - 5} ${PAD + W + 5},${LY + 5}" fill="currentColor"/>`;

  // Major ticks and labels
  for (let v = min, i = 0; v <= max + 1e-9; v = Math.round((v + step) * 1e9) / 1e9, i++) {
    const x = PAD + (v - min) * uw;
    s += `<line x1="${x}" y1="${LY - 10}" x2="${x}" y2="${LY + 6}" stroke="currentColor" stroke-width="2"/>`;
    const lbl = Number.isInteger(v) ? String(v) : String(Math.round(v * 1000) / 1000);
    s += `<text x="${x}" y="${LY + 21}" text-anchor="middle" fill="currentColor" font-size="12" font-weight="500">${lbl}</text>`;

    // Minor ticks (subdivisions) between this major tick and the next
    if (subs > 0 && v < max - 1e-9) {
      const subStep = step / subs;
      for (let si = 1; si < subs; si++) {
        const sv = Math.round((v + si * subStep) * 1e9) / 1e9;
        if (sv >= max - 1e-9) break;
        const sx = PAD + (sv - min) * uw;
        s += `<line x1="${sx}" y1="${LY - 5}" x2="${sx}" y2="${LY + 3}" stroke="currentColor" stroke-width="1.5"/>`;
      }
    }
  }

  // Named point in read mode
  if (nl.mode !== 'place' && nl.value != null) {
    const mx = PAD + (nl.value - min) * uw;
    const lbl = nl.label || 'A';
    s += `<circle cx="${mx}" cy="${LY}" r="6" class="fill-primary-500"/>`;
    s += `<line x1="${mx}" y1="${LY - 6}" x2="${mx}" y2="${LY - 15}" stroke-width="2" class="stroke-primary-500"/>`;
    s += `<text x="${mx}" y="${LY - 19}" text-anchor="middle" font-size="13" font-weight="700" class="fill-primary-600 dark:fill-primary-400">${lbl}</text>`;
  }

  return s;
}

/* Coordinate grid — quadrillage with axes, ticks, labels, and optional named points.
   cg: { cols, rows, points: [{x, y, label}] }
   ViewBox: 420×410. Grid area 360×360 with PAD_LEFT=40, PAD_RIGHT=20, PAD_TOP=20, PAD_BOTTOM=30.
   Cell size: 360/cols × 360/rows (60px/cell for 6×6, 36px for 10×10). */
function coordinateGridSvg(cg) {
  if (!cg) return '';
  const cols = cg.cols ?? 6;
  const rows = cg.rows ?? 6;

  const VW = 420, VH = 410;
  const PL = 40, PR = 20, PT = 20, PB = 30;
  const GW = VW - PL - PR; // 360
  const GH = VH - PT - PB; // 360
  const cw = GW / cols;
  const ch = GH / rows;

  // SVG coords: col/row → pixel (row 0 at bottom, y flipped)
  const toX = (col) => PL + col * cw;
  const toY = (row) => PT + (rows - row) * ch;

  let s = '';

  // Grid lines (very light)
  for (let c = 0; c <= cols; c++) {
    const x = toX(c);
    s += `<line x1="${x}" y1="${PT}" x2="${x}" y2="${PT + GH}" stroke="currentColor" stroke-width="0.5" opacity="0.25"/>`;
  }
  for (let r = 0; r <= rows; r++) {
    const y = toY(r);
    s += `<line x1="${PL}" y1="${y}" x2="${PL + GW}" y2="${y}" stroke="currentColor" stroke-width="0.5" opacity="0.25"/>`;
  }

  // x-axis (y=0 → top of axis is at bottom of grid)
  const ay = toY(0);
  s += `<line x1="${PL}" y1="${ay}" x2="${PL + GW + 10}" y2="${ay}" stroke="currentColor" stroke-width="2"/>`;
  s += `<polygon points="${PL + GW + 15},${ay} ${PL + GW + 7},${ay - 4} ${PL + GW + 7},${ay + 4}" fill="currentColor"/>`;
  s += `<text x="${PL + GW + 18}" y="${ay + 5}" font-size="12" fill="currentColor" font-style="italic">x</text>`;

  // y-axis (x=0 → left edge of grid)
  const ax = toX(0);
  s += `<line x1="${ax}" y1="${PT + GH}" x2="${ax}" y2="${PT - 10}" stroke="currentColor" stroke-width="2"/>`;
  s += `<polygon points="${ax},${PT - 15} ${ax - 4},${PT - 7} ${ax + 4},${PT - 7}" fill="currentColor"/>`;
  s += `<text x="${ax}" y="${PT - 18}" font-size="12" fill="currentColor" font-style="italic" text-anchor="middle">y</text>`;

  // Origin label "O"
  s += `<text x="${ax - 9}" y="${ay + 16}" font-size="11" fill="currentColor" text-anchor="middle">0</text>`;

  // x-axis ticks and labels (1 … cols)
  for (let c = 1; c <= cols; c++) {
    const x = toX(c);
    s += `<line x1="${x}" y1="${ay - 4}" x2="${x}" y2="${ay + 4}" stroke="currentColor" stroke-width="1.5"/>`;
    s += `<text x="${x}" y="${ay + 16}" text-anchor="middle" font-size="11" fill="currentColor">${c}</text>`;
  }

  // y-axis ticks and labels (1 … rows)
  for (let r = 1; r <= rows; r++) {
    const y = toY(r);
    s += `<line x1="${ax - 4}" y1="${y}" x2="${ax + 4}" y2="${y}" stroke="currentColor" stroke-width="1.5"/>`;
    s += `<text x="${ax - 9}" y="${y + 4}" text-anchor="end" font-size="11" fill="currentColor">${r}</text>`;
  }

  // Intersection dots (for grids ≤ 10×10, aids readability)
  if (cols <= 10 && rows <= 10) {
    for (let c = 0; c <= cols; c++) {
      for (let r = 0; r <= rows; r++) {
        if (c === 0 && r === 0) continue; // skip origin, already labelled
        const x = toX(c), y = toY(r);
        s += `<circle cx="${x}" cy="${y}" r="1.5" fill="currentColor" opacity="0.3"/>`;
      }
    }
  }

  // Named points
  (cg.points || []).forEach((pt) => {
    const px = toX(pt.x);
    const py = toY(pt.y);
    s += `<circle cx="${px}" cy="${py}" r="5" class="fill-primary-500"/>`;
    if (pt.label) {
      s += `<text x="${px + 9}" y="${py - 6}" font-size="13" font-weight="700" class="fill-primary-600 dark:fill-primary-400">${pt.label}</text>`;
    }
  });

  return s;
}

/* Place-value grid — highlights the target column in amber.
   number: integer, pos: 0-based index from the right (0=units, 1=tens, …).
   Labels use French abbreviations: U D C M DM CM. */
function placeValueSvg(number, pos) {
  const digits = String(number).split('').map(Number);
  const n = digits.length;
  const LABELS = ['U', 'D', 'C', 'M', 'DM', 'CM'];

  const cw = 52, rh = 44, gap = 3;
  const W = n * (cw + gap) + gap;
  const H = 2 * (rh + gap) + gap;

  let s = '';
  for (let i = 0; i < n; i++) {
    const pfr = n - 1 - i;       // position from right
    const hl  = pfr === pos;
    const x   = gap + i * (cw + gap);
    const y1  = gap;
    const y2  = gap + rh + gap;

    // Label cell
    s += `<rect x="${x}" y="${y1}" width="${cw}" height="${rh}" rx="6"
               fill="${hl ? 'var(--a)' : 'var(--sc)'}"/>
          <text x="${x + cw / 2}" y="${y1 + rh - 11}" text-anchor="middle"
                font-family="system-ui,sans-serif" font-size="15" font-weight="800"
                fill="${hl ? '#fff' : 'var(--cs)'}">${LABELS[pfr] || '?'}</text>`;

    // Digit cell
    s += `<rect x="${x}" y="${y2}" width="${cw}" height="${rh}" rx="6"
               fill="var(--sf)" stroke="${hl ? 'var(--a)' : 'var(--cs)'}"
               stroke-width="${hl ? 2.5 : 1}"/>
          <text x="${x + cw / 2}" y="${y2 + rh - 9}" text-anchor="middle"
                font-family="system-ui,sans-serif" font-size="26" font-weight="800"
                fill="${hl ? 'var(--a)' : 'var(--ct)'}">${digits[i]}</text>`;
  }

  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"
               xmlns="http://www.w3.org/2000/svg">
    ${s}
  </svg>`;
}

/* Large emoji display for unit-of-measure exercises.
   Shows the emoji centred, large enough for young children. */
/* Minimal analog clock — circle + two hands, no numbers, no tick marks.
   Designed for compact use in matching exercises (size ≈ 72–80px).
   hour: 1-12, minute: 0-59, size: px (default 72).
   Hand colors follow palette: hour = var(--ct), minute = var(--p). */
function clockSvg(hour, minute, size = 72) {
  const cx = size / 2, cy = size / 2, r = size / 2 - 2;
  const toXY = (deg, len) => {
    const rad = (deg - 90) * Math.PI / 180;
    return [+(cx + Math.cos(rad) * len).toFixed(2), +(cy + Math.sin(rad) * len).toFixed(2)];
  };
  const hAngle = ((hour % 12) + minute / 60) * 30;
  const mAngle = minute * 6;
  const [hx, hy] = toXY(hAngle, r * 0.55);
  const [mx, my] = toXY(mAngle, r * 0.82);
  const hw = +(size / 14).toFixed(1);
  const mw = +(size / 22).toFixed(1);
  const pr = +(size / 18).toFixed(1);
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">` +
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="var(--sf)" stroke="var(--ct)" stroke-width="1.5"/>` +
    `<line x1="${cx}" y1="${cy}" x2="${hx}" y2="${hy}" stroke="var(--ct)" stroke-width="${hw}" stroke-linecap="round"/>` +
    `<line x1="${cx}" y1="${cy}" x2="${mx}" y2="${my}" stroke="var(--p)" stroke-width="${mw}" stroke-linecap="round"/>` +
    `<circle cx="${cx}" cy="${cy}" r="${pr}" fill="var(--ct)"/>` +
    `</svg>`;
}

function objectMeasureSvg(emoji) {
  return `<svg width="120" height="110" viewBox="0 0 120 110" xmlns="http://www.w3.org/2000/svg">
    <text x="60" y="90" text-anchor="middle"
          font-family="system-ui,sans-serif" font-size="80">${emoji}</text>
  </svg>`;
}

/* Sharing diagram — emoji grid (rows=parts, cols=quotient) + partition rectangle.
   Conveys "fair sharing": each row is one share, rectangle shows the structure.
   parts: divisor (number of shares), total: dividend, emoji: item to share. */
function partagerSvg(emoji, total, parts) {
  const q = total / parts;
  const ITEM = 22, CGAP = 6, RGAP = 8, GPAD = 10;
  const cols = q, rows = parts;
  const gridW = cols * (ITEM + CGAP) - CGAP + GPAD * 2;
  const gridH = rows * (ITEM + RGAP) - RGAP + GPAD * 2;

  // Partition rectangle: top cell = total, bottom row = parts blank cells
  const CW = Math.max(44, Math.round(gridW / parts)), CH = 36, SW = 1.5;
  const rectW = parts * CW, rectH = CH * 2;

  const MID = 24;
  const W = gridW + MID + rectW;
  const H = Math.max(gridH, rectH);
  const gridY = (H - gridH) / 2;
  const rectX = gridW + MID;
  const rectY = (H - rectH) / 2;

  let g = '';
  // Emoji grid
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = GPAD + c * (ITEM + CGAP) + ITEM / 2;
      const y = gridY + GPAD + r * (ITEM + RGAP) + ITEM / 2 + 7;
      g += `<text x="${x}" y="${y}" text-anchor="middle" font-size="${ITEM}" font-family="system-ui,sans-serif">${emoji}</text>`;
    }
  }
  // Top cell
  g += `<rect x="${rectX}" y="${rectY}" width="${rectW}" height="${CH}" fill="var(--sf)" stroke="var(--ct)" stroke-width="${SW}"/>`;
  g += `<text x="${rectX + rectW / 2}" y="${rectY + CH / 2 + 7}" text-anchor="middle" font-size="18" font-weight="bold" font-family="system-ui,sans-serif" fill="var(--ct)">${total}</text>`;
  // Bottom cells
  for (let i = 0; i < parts; i++) {
    g += `<rect x="${rectX + i * CW}" y="${rectY + CH}" width="${CW}" height="${CH}" fill="var(--sf)" stroke="var(--ct)" stroke-width="${SW}"/>`;
  }

  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">${g}</svg>`;
}

/* Two-step jump arrow diagram — shows the "pass through the ten" strategy.
   step1 is always ±10, step2 is the ±1 correction.
   Uses palette vars: var(--p) for the big jump, var(--a) for the small correction. */
function jumpArrowSvg(start, step1, step2) {
  const mid = start + step1;
  const end = mid + step2;
  const lbl = (n) => n > 0 ? `+${n}` : `\u2212${Math.abs(n)}`;

  const W = 300, H = 72;
  // Three node x-centres; leave room for 3-digit numbers
  const nx = [46, 150, 254];
  const ny = 54; // number baseline
  const ay = 32; // arrow y

  const arrow = (x1, x2, label, color) => {
    const ax = x1 + 22, bx = x2 - 22;
    const mx = (ax + bx) / 2;
    return `
      <line x1="${ax}" y1="${ay}" x2="${bx - 8}" y2="${ay}"
            stroke="${color}" stroke-width="2.5" stroke-linecap="round"/>
      <polygon points="${bx},${ay} ${bx - 9},${ay - 5} ${bx - 9},${ay + 5}" fill="${color}"/>
      <text x="${mx}" y="${ay - 6}" text-anchor="middle"
            font-family="system-ui,sans-serif" font-size="13" font-weight="700"
            fill="${color}">${label}</text>`;
  };

  const num = (x, val) =>
    `<text x="${x}" y="${ny}" text-anchor="middle"
           font-family="system-ui,sans-serif" font-size="22" font-weight="800"
           fill="var(--ct)">${val}</text>`;

  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
    ${num(nx[0], start)}
    ${arrow(nx[0], nx[1], lbl(step1), 'var(--p)')}
    ${num(nx[1], mid)}
    ${arrow(nx[1], nx[2], lbl(step2), 'var(--a)')}
    ${num(nx[2], end)}
  </svg>`;
}

/* Balance scale SVG — shows a balanced or tilted two-pan scale.
   leftItems / rightItems: arrays of values — numbers render as weight blocks,
   strings render as emoji. Items stack side-by-side on their pan.
   tilt: 'balanced' (default) | 'left' (left pan lower) | 'right' (right pan lower).
   Called via  scaleSvg(leftArray, rightArray, tilt).
   Structural elements use palette vars; weight blocks use fixed dark fill so
   they look like physical weights in both light and dark modes. */
function scaleSvg(leftItems, rightItems, tilt = 'balanced') {
  const W = 380, H = 175;

  const left  = Array.isArray(leftItems)  ? leftItems  : [leftItems];
  const right = Array.isArray(rightItems) ? rightItems : [rightItems];

  // Tilt offset: positive = that end goes DOWN
  const TILT = 18;
  const lOff = tilt === 'left' ? TILT : tilt === 'right' ? -TILT : 0;
  const rOff = tilt === 'right' ? TILT : tilt === 'left' ? -TILT : 0;

  // Geometry
  const cx   = W / 2;
  const beamY = 75;
  const lx = 78, rx = 302;
  const rodLen = 40;
  const panRx = 42, panRy = 10;
  // Each pan hangs at the bottom of its rod, level regardless of tilt
  const lPanY = beamY + lOff + rodLen;
  const rPanY = beamY + rOff + rodLen;

  // Weight block (always dark fill so it reads as a physical weight)
  const weightW = 30, weightH = 26;
  const wBlock = (val, x, y) =>
    `<rect x="${x - weightW / 2}" y="${y - weightH}" width="${weightW}" height="${weightH}" rx="5"
           fill="#475569" stroke="#1e293b" stroke-width="1"/>
     <text x="${x}" y="${y - 7}" text-anchor="middle"
           font-family="system-ui,sans-serif" font-size="12" font-weight="800" fill="white">${val}</text>`;

  // Emoji sitting on pan surface
  const eBlock = (em, x, y) =>
    `<text x="${x}" y="${y}" text-anchor="middle"
           font-family="system-ui,sans-serif" font-size="34">${em}</text>`;

  // Layout items above a pan; items sit directly on the pan surface
  const renderItems = (items, panX, panY) => {
    const isNum = (v) => !isNaN(Number(v)) && String(v).trim() !== '';
    const weights = items.filter(isNum);
    const emojis  = items.filter((v) => !isNum(v));
    let s = '';
    const panTop = panY - panRy;

    if (weights.length > 0) {
      const gap = 3;
      const totalW = weights.length * weightW + (weights.length - 1) * gap;
      weights.forEach((w, i) => {
        const x = panX - totalW / 2 + weightW / 2 + i * (weightW + gap);
        s += wBlock(Number(w), x, panTop);
      });
    }
    if (emojis.length > 0) {
      const emojiBase = weights.length > 0 ? panTop - weightH - 2 : panTop + 2;
      emojis.forEach((em, i) => {
        const x = panX + (i - (emojis.length - 1) / 2) * 40;
        s += eBlock(em, x, emojiBase);
      });
    }
    return s;
  };

  // Tilted beam: line from (lx, beamY+lOff) to (rx, beamY+rOff)
  const lBy = beamY + lOff, rBy = beamY + rOff;

  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"
               xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Balance">
    <!-- Central post -->
    <rect x="${cx - 5}" y="${beamY + 8}" width="10" height="50" rx="3" fill="var(--cs)"/>
    <!-- Base -->
    <rect x="${cx - 36}" y="${beamY + 54}" width="72" height="12" rx="5" fill="var(--cs)"/>
    <!-- Pivot cap -->
    <circle cx="${cx}" cy="${beamY + 8}" r="8" fill="var(--ct)" opacity="0.7"/>
    <!-- Beam (tilted) -->
    <line x1="${lx}" y1="${lBy}" x2="${rx}" y2="${rBy}"
          stroke="var(--ct)" stroke-width="10" stroke-linecap="round" opacity="0.85"/>
    <!-- Left rod -->
    <line x1="${lx}" y1="${lBy}" x2="${lx}" y2="${lPanY - panRy - 1}"
          stroke="var(--cs)" stroke-width="2.5" stroke-linecap="round"/>
    <!-- Right rod -->
    <line x1="${rx}" y1="${rBy}" x2="${rx}" y2="${rPanY - panRy - 1}"
          stroke="var(--cs)" stroke-width="2.5" stroke-linecap="round"/>
    <!-- Left pan -->
    <ellipse cx="${lx}" cy="${lPanY}" rx="${panRx}" ry="${panRy}" fill="var(--cs)"/>
    <ellipse cx="${lx}" cy="${lPanY - panRy * 0.4}" rx="${panRx}" ry="${panRy * 0.6}"
             fill="var(--ct)" opacity="0.15"/>
    <!-- Right pan -->
    <ellipse cx="${rx}" cy="${rPanY}" rx="${panRx}" ry="${panRy}" fill="var(--cs)"/>
    <ellipse cx="${rx}" cy="${rPanY - panRy * 0.4}" rx="${panRx}" ry="${panRy * 0.6}"
             fill="var(--ct)" opacity="0.15"/>
    <!-- Items -->
    ${renderItems(left, lx, lPanY)}
    ${renderItems(right, rx, rPanY)}
  </svg>`;
}
