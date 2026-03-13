/* Theme toggle */
function themeToggle() { return { dark: document.documentElement.classList.contains('dark'), toggle() { this.dark = !this.dark; document.documentElement.classList.toggle('dark', this.dark); localStorage.setItem('theme', this.dark ? 'dark' : 'light') } } }

function embedSvg(svg) { return svg; }

function mathGridSvg(cols, rows, filled, color = 'var(--p)') {
  const size = 20;
  const gap = 1;
  let svgContent = '';
  for (let i = 0; i < (cols * rows); i++) {
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
  const center = size / 2;
  const radius = size / 2 - 2;
  let paths = '';
  for (let i = 0; i < n; i++) {
    const startAngle = (i * 2 * Math.PI) / n - Math.PI / 2;
    const endAngle = ((i + 1) * 2 * Math.PI) / n - Math.PI / 2;
    const x1 = center + radius * Math.cos(startAngle);
    const y1 = center + radius * Math.sin(startAngle);
    const x2 = center + radius * Math.cos(endAngle);
    const y2 = center + radius * Math.sin(endAngle);
    paths += `<path d="M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2} Z"
      fill="${i < k ? color : 'var(--sf)'}" stroke="var(--cs)" stroke-width="1" />`;
  }
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      ${paths}
    </svg>`;
}

function circleSvg(r, label = "", fillColor = 'var(--sf)') {
  const pad = label ? 40 : 5;
  const size = (r * 2) + pad * 2;
  const center = r + pad;
  let labelHtml = "";
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

function rectangleSvg(w, h, labelW = "", labelH = "", fillColor = 'var(--sf)') {
  const pad = (labelW || labelH) ? 35 : 5;
  const totalW = w + pad * 2;
  const totalH = h + pad * 2;
  return `<svg width="${totalW}" height="${totalH}" viewBox="0 0 ${totalW} ${totalH}" xmlns="http://www.w3.org/2000/svg">
      <rect x="${pad}" y="${pad}" width="${w}" height="${h}" fill="${fillColor}" stroke="var(--ct)" stroke-width="2" />
      ${labelW ? `<text x="${pad + w / 2}" y="${pad + h + 25}" text-anchor="middle" font-family="Arial" fill="var(--ct)">${labelW}</text>` : ''}
      ${labelH ? `<text x="${pad - 10}" y="${pad + h / 2}" text-anchor="end" dominant-baseline="middle" font-family="Arial" fill="var(--ct)">${labelH}</text>` : ''}
    </svg>`;
}

function squareSvg(size, label = "", fillColor = 'var(--sf)') {
  const pad = 35;
  const total = size + pad * 2;
  return `<svg width="${total}" height="${total}" viewBox="0 0 ${total} ${total}" xmlns="http://www.w3.org/2000/svg">
      <rect x="${pad}" y="${pad}" width="${size}" height="${size}" fill="${fillColor}" stroke="var(--ct)" stroke-width="2" />
      ${label ? `<text x="${pad + size / 2}" y="${pad + size + 25}" text-anchor="middle" font-family="Arial" fill="var(--ct)">${label}</text>` : ''}
    </svg>`;
}

function triangleSvg(pixA, pixB, labelA = "", labelB = "", labelC = "", fillColor = 'var(--sf)') {
  const padX = 45, padTop = 15, padBot = 28;
  const totalW = pixA + padX * 2;
  const totalH = pixB + padTop + padBot;
  const x0 = padX,        y0 = padTop + pixB; // bottom-left (right angle)
  const x1 = padX + pixA, y1 = padTop + pixB; // bottom-right
  const x2 = padX,        y2 = padTop;         // top-left
  const m = 10;
  return `<svg width="${totalW}" height="${totalH}" viewBox="0 0 ${totalW} ${totalH}" xmlns="http://www.w3.org/2000/svg">
      <polygon points="${x0},${y0} ${x1},${y1} ${x2},${y2}" fill="${fillColor}" stroke="var(--ct)" stroke-width="2" />
      <polyline points="${x0 + m},${y0} ${x0 + m},${y0 - m} ${x0},${y0 - m}" fill="none" stroke="var(--ct)" stroke-width="1.5" />
      ${labelA ? `<text x="${(x0 + x1) / 2}" y="${y0 + 20}" text-anchor="middle" font-family="Arial" fill="var(--ct)">${labelA}</text>` : ''}
      ${labelB ? `<text x="${x0 - 8}" y="${(y0 + y2) / 2}" text-anchor="end" dominant-baseline="middle" font-family="Arial" fill="var(--ct)">${labelB}</text>` : ''}
      ${labelC ? `<text x="${(x1 + x2) / 2 + 15}" y="${(y1 + y2) / 2 - 6}" text-anchor="start" font-family="Arial" fill="var(--ct)">${labelC}</text>` : ''}
    </svg>`;
}

// fractionShapesSvg — pie chart for fraction n/d with the fraction label below
// Called via gen: fractionShapesSvg, par: { n, d, size (optional, default 80) }
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
      <!-- Top face -->
      <polygon points="${tilt},0 ${w+tilt},0 ${w},${tilt} 0,${tilt}" fill="${color}" />
      <polygon points="${tilt},0 ${w+tilt},0 ${w},${tilt} 0,${tilt}" fill="rgba(255,255,255,0.3)" />
      <!-- Right face -->
      <polygon points="${w},${tilt} ${w+tilt},0 ${w+tilt},${h} ${w},${h+tilt}" fill="${color}" />
      <polygon points="${w},${tilt} ${w+tilt},0 ${w+tilt},${h} ${w},${h+tilt}" fill="rgba(0,0,0,0.2)" />
      <!-- Front face -->
      <polygon points="0,${tilt} ${w},${tilt} ${w},${h+tilt} 0,${h+tilt}" fill="${color}" />
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
      <path d="M ${x0},${y0} V ${y0+h} A ${rx} ${ry} 0 0 0 ${x0+w},${y0+h} V ${y0} Z" fill="url(#${gid})" />
      <ellipse cx="${x0+rx}" cy="${y0}" rx="${rx}" ry="${ry}" fill="${color}" />
      <ellipse cx="${x0+rx}" cy="${y0}" rx="${rx}" ry="${ry}" fill="rgba(255,255,255,0.3)" />
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
  const COLORS = ['#e0743c', 'var(--p)', '#4daa60'];
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
    return `<div style="display:inline-flex;flex-direction:column;border-radius:8px;overflow:hidden;min-width:50px">`
      + `<div style="background:${c};color:#fff;padding:3px 6px;font-size:10px;font-weight:700;font-family:system-ui,sans-serif;text-align:center;white-space:nowrap">${label}</div>`
      + `<div style="background:var(--sf);border:1.5px solid ${c};border-top:none;border-radius:0 0 8px 8px;padding:5px 4px;display:flex;flex-direction:column;align-items:center;gap:2px;min-height:28px;justify-content:center">${dots}</div>`
      + `</div>`;
  });
  return `<div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center">${parts.join('')}</div>`;
}

// abacusSvg — boulier/abacus SVG
// rows: [{ label, value }, ...] — value 0..beadsPerRow (active beads on left, inactive on right)
// beadsPerRow: default 10
function abacusSvg(rows, beadsPerRow = 10) {
  const COLORS = ['#e0743c', 'var(--p)', '#4daa60'];
  const R = 7, SLOT = 18, ROW_H = 26, V_PAD = 10, H_PAD = 10;
  const ROD_W = beadsPerRow * SLOT + 10;   // +10 = constant gap between active/inactive groups
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

    if (ri > 0) g += `<line x1="${FX+1}" y1="${V_PAD + ri*ROW_H}" x2="${FX+FRAME_W-1}" y2="${V_PAD + ri*ROW_H}" stroke="var(--cs)" stroke-width="0.5" opacity="0.4"/>`;
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

  const lineY = 35; // Vertical position of the horizontal ruler line
  let ticks = "";
  let labels = "";

  for (let i = min; i <= max; i += minorStep) {
    const currentVal = Math.round(i * 1000) / 1000;
    const x = getX(currentVal);
    const isMajor = Math.abs((currentVal - min) % step) < 0.001;

    // Ruler Ticks (pointing UP)
    const tickHeight = isMajor ? 20 : 10;
    ticks += `<line x1="${x}" y1="${lineY}" x2="${x}" y2="${lineY - tickHeight}" stroke="var(--ct)" stroke-width="1.5" />`;

    // Regular scale numbers (Above the line)
    if (isMajor) {
      labels += `<text x="${x}" y="${lineY - 25}" text-anchor="middle" font-family="Arial" font-size="12" fill="var(--cs)">${currentVal}</text>`;
    }

    // Custom Markers (Solid Arrow Head + Stem)
    if (customLabels[currentVal] !== undefined) {
      const stemLength = 25;
      const headSize = 8; // Half-width of the triangle base
      const headHeight = 10;

      // Points for a solid triangle pointing UP: (Tip, Bottom-Right, Bottom-Left)
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
  const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
  return {
    x: centerX + (radius * Math.cos(angleInRadians)),
    y: centerY + (radius * Math.sin(angleInRadians))
  };
}

function describeArc(x, y, radius, startAngle, endAngle) {
  const start = polarToCartesian(x, y, radius, endAngle);
  const end = polarToCartesian(x, y, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return [
    "M", x, y,
    "L", start.x, start.y,
    "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y,
    "Z"
  ].join(" ");
}

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
    const fullSvg = `<svg viewBox="0 0 100 100" class="w-full h-full drop-shadow-sm">${svgContent}</svg>`;
    shapes.push({ idx: sIdx, svg: fullSvg });
  }
  return shapes;
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
        s += `<line x1="${x + d * uw / divs}" y1="${Y - 12}" x2="${x + d * uw / divs}" y2="${Y}" stroke="currentColor" stroke-width="1.5"/>`;
      }
      if (subs > 0) {
        for (let d = 0; d < divs; d++) {
          for (let sub = 1; sub < subs; sub++) {
            const xs = x + (d + sub / subs) * uw / divs;
            s += `<line x1="${xs}" y1="${Y - 7}" x2="${xs}" y2="${Y}" stroke="currentColor" stroke-width="1"/>`;
          }
        }
      }
    }
  }
  if (r.markers) {
    r.markers.forEach(m => {
      const x = PAD + (m.value - r.min) * uw;
      s += `<polygon points="${x},${Y - 22} ${x - 6},${Y - 34} ${x + 6},${Y - 34}" class="fill-red-500 dark:fill-red-400"/>`;
      s += `<text x="${x}" y="${Y - 38}" text-anchor="middle" fill="currentColor" font-size="14" font-weight="700" class="fill-red-600 dark:fill-red-400">${m.label}</text>`;
    });
  }
  return s;
}

/* Series player — single-template engine */
function seriesPlayer(exercises) {
  return {
    exercises,
    currentIndex: 0,
    userInput: '',
    trouInputs: [],
    showError: false,
    solvedFlags: exercises.map(() => false),
    matchSelected: null,
    matchConnections: [],
    matchErrors: [],
    _matchLinesSvg: '',
    seqInputs: [],
    seqErrors: [],
    gridCells: [],
    gridErrors: [],
    pyramidInputs: [],
    pyramidErrors: [],
    tfInputs: [],
    tfErrors: [],
    cmpInputs: [],
    cmpErrors: [],
    mqInputs: [],
    mqSolved: [],
    mqErrors: [],
    mcqSelected: null,
    mcqWrong: null,
    rfInputs: ['', ''],
    tileSelected: [],
    tileErrors: [],
    svgSelected: [],
    svgErrors: [],
    sortPicked: [],
    sortShuffled: [],
    sortErrors: [],
    tableInputs: [],
    tableErrors: [],
    checkSelected: [],
    checkErrors: [],
    selectAnswers: [],
    selectErrors: [],
    dragTilesOrder: [],
    dragSelected: null,
    dragErrors: [],
    _dragErrTimer: null,
    clickBlockLevels: [],
    clickBlockErrors: [],
    showValidationPanel: false,
    testNotes: '',
    testSending: false,
    testSent: false,
    testError: '',

    /* Fraction Helpers */
    get fractionShapes() {
      if (this.cur.type !== 'fraction' || !this.cur.fraction) return [];
      return fractionShapesSvg(this.cur.fraction);
    },


    /* Ruler SVG */
    get rulerSvg() {
      if (this.cur.type !== 'ruler' || !this.cur.ruler) return '';
      return rulerExerciseSvg(this.cur.ruler);
    },

    regenerateAll() {
      if (!window.AppGenerators) return;
      const expanded = [];
      for (const ex of this.exercises) {
        if (!ex._gen) { expanded.push(ex); continue; }
        const gen = window.AppGenerators[ex._gen.name];
        if (!gen) { expanded.push(ex); continue; }
        const count = ex._gen.count || 1;
        for (let i = 0; i < count; i++) {
          expanded.push({ ...ex, ...gen.generate(ex._gen.params) });
        }
      }
      this.exercises = expanded;
      this.solvedFlags = this.exercises.map(() => false);
    },

    get hasGenerators() { return this.exercises.some(e => e._gen) },

    init() {
      this.regenerateAll();
      this.syncFromHash();
      const _blanks0 = (this.cur.operation || '').split('?').length - 1; this.trouInputs = _blanks0 > 0 ? Array(_blanks0).fill('') : [];
      const _ia = this.cur.sequence || this.cur.bounding || this.cur.convert;
      this.seqInputs = (_ia ? _ia.answers.map(() => '') : []);
      if (this.cur.grid) { this.gridCells = new Array(this.cur.grid.rows.length * this.cur.grid.columns.length).fill(0) }
      if (this.cur.pyramid) { this._initPyramid(this.cur.pyramid) }
      if (this.cur.statements) { this.tfInputs = this.cur.statements.map(() => null) }
      if (this.cur.comparisons) { this.cmpInputs = this.cur.comparisons.map(() => null) }
      if (this.cur.mqQuestions) { this.mqInputs = this.cur.mqQuestions.map(() => ''); this.mqSolved = this.cur.mqQuestions.map(() => false) }
      if (this.cur.items) { this.sortShuffled = [...this.cur.items].sort(() => Math.random() - 0.5) }
      if (this.cur.selectStatements) { this.selectAnswers = new Array(this.cur.selectStatements.length).fill('') }
      if (this.cur.tiles) { const _tn = this.cur.tiles.length; const _ta = Array.from({length: _tn}, (_, i) => i); for (let i = _tn - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [_ta[i], _ta[j]] = [_ta[j], _ta[i]]; } if (_ta.every((v, i) => v === i) && _tn > 1) [_ta[0], _ta[1]] = [_ta[1], _ta[0]]; this.dragTilesOrder = _ta; }
      if (this.cur.table) { this.tableInputs = new Array(this.cur.table.blankCount).fill('') } this.tableErrors = [];
      if (this.cur.columns) { this.clickBlockLevels = this.cur.columns.map(() => 0); this.clickBlockErrors = []; }
      const _focusFirst = () => { let ref; if (this.cur.type === 'fraction-check') ref = this.$refs.rfNum; else if (this.trouInputs.length > 0) ref = Array.from(this.$el.querySelectorAll('.js-trou input')).find(el => el.offsetHeight > 0); else if (this.seqInputs.length > 0) ref = Array.from(this.$el.querySelectorAll('.js-seq input')).find(el => el.offsetHeight > 0); else if (this.cur.type === 'fill-table') ref = Array.from(this.$el.querySelectorAll('.js-table input')).find(el => el.offsetHeight > 0); else ref = this.$refs.input; if (ref && !ref.disabled) ref.focus() }
      requestAnimationFrame(_focusFirst)
      this.$watch('currentIndex', () => requestAnimationFrame(_focusFirst))
    },
    get cur() { return this.exercises[this.currentIndex] || {} },
    /* Parse operation à trou into structured parts for fraction rendering */
    get trouParts() {
      const op = this.cur.operation;
      if (!op || !op.includes('?')) return null;
      const parts = []; let ii = 0;
      const re = /(\d+\/\d+|\?\/\d+|\?|[^?\d]+(?:\d+(?!\/\d))?[^?\d]*|\d+(?!\/\d))/g;
      let m;
      while ((m = re.exec(op)) !== null) {
        const t = m[1];
        if (/^\d+\/\d+$/.test(t)) { const [n, d] = t.split('/'); parts.push({ t: 'f', n, d }); }
        else if (/^\?\/\d+$/.test(t)) { parts.push({ t: 'fi', idx: ii++, d: t.split('/')[1] }); }
        else if (t === '?') { parts.push({ t: 'i', idx: ii++ }); }
        else { parts.push({ t: 'x', v: t }); }
      }
      return parts;
    },
    get solved() { return this.solvedFlags[this.currentIndex] },
    get solvedCount() { return this.solvedFlags.filter(Boolean).length },
    get allSolved() { return this.solvedFlags.every(Boolean) },

    tileTap(i) {
      if (this.solved) return;
      const idx = this.tileSelected.indexOf(i);
      this.tileSelected = idx === -1 ? [...this.tileSelected, i] : this.tileSelected.filter(s => s !== i);
      this.tileErrors = [];
    },

    dragRender(tile) {
      if (!tile) return '';
      if (typeof tile === 'string') return tile;
      return window[tile.gen](...Object.values(tile.par));
    },

    dragTap(pos) {
      if (this.solved) return;
      const p = Number(pos);
      if (this.dragSelected === null) {
        this.dragSelected = p;
      } else if (this.dragSelected === p) {
        this.dragSelected = null;
      } else {
        const sel = this.dragSelected;
        const order = this.dragTilesOrder.map(Number);
        [order[sel], order[p]] = [order[p], order[sel]];
        this.dragTilesOrder = order;
        this.dragSelected = null;
        if (this._dragErrTimer) { clearTimeout(this._dragErrTimer); this._dragErrTimer = null; }
        this.dragErrors = [];
      }
    },

    blockTap(ci, r) {
      if (this.solved) return;
      const col = (this.cur.columns || [])[ci];
      if (!col) return;
      const newLevel = col.max - r + 1;
      const updated = (this.clickBlockLevels || []).map((v, i) => i === ci ? (v === newLevel ? 0 : newLevel) : v);
      this.clickBlockLevels = updated;
      this.clickBlockErrors = [];
    },

    checkTap(i) {
      if (this.solved) return;
      const idx = this.checkSelected.indexOf(i);
      this.checkSelected = idx === -1 ? [...this.checkSelected, i] : this.checkSelected.filter(s => s !== i);
      this.checkErrors = [];
    },
    
    svgTap(i) {
      if (this.solved) return;
      const idx = this.svgSelected.indexOf(i);
      this.svgSelected = idx === -1 ? [...this.svgSelected, i] : this.svgSelected.filter(s => s !== i);
      this.svgErrors = [];
    },

    check() {
      if (this.cur.type === 'drag-sort') {
        if (this.solved) return;
        if (this._dragErrTimer) { clearTimeout(this._dragErrTimer); this._dragErrTimer = null; }
        this.dragErrors = [];
        const errors = this.dragTilesOrder.map((origIdx, pos) => Number(origIdx) !== pos ? pos : -1).filter(p => p >= 0);
        if (errors.length === 0) { this.solvedFlags[this.currentIndex] = true; this.showError = false; this.dragSelected = null; if (this.currentIndex < this.exercises.length - 1) { setTimeout(() => this.goTo(this.currentIndex + 1), 1500) } }
        else { this.dragErrors = errors; this.showError = true; this._dragErrTimer = setTimeout(() => { this.showError = false; this.dragErrors = []; this._dragErrTimer = null; }, 2000) }
        return
      }
      if (this.cur.type === 'click-blocks') {
        if (this.solved) return;
        const cols = this.cur.columns || [];
        const errors = cols.map((col, i) => (this.clickBlockLevels[i] || 0) !== col.answer ? i : -1).filter(i => i >= 0);
        if (errors.length === 0) { this.solvedFlags[this.currentIndex] = true; this.showError = false; this.clickBlockErrors = []; if (this.currentIndex < this.exercises.length - 1) { setTimeout(() => this.goTo(this.currentIndex + 1), 1500) } }
        else { this.clickBlockErrors = errors; this.showError = true; setTimeout(() => { this.showError = false; this.clickBlockErrors = [] }, 2000) }
        return
      }
      if (this.cur.type === 'fill-table') {
        if (this.solved) return;
        if (this.tableInputs.some(v => !v.trim())) { this.showError = true; setTimeout(() => { this.showError = false }, 2000); return }
        const errors = [];
        (this.cur.table?.rows || []).forEach(row => row.forEach(cell => {
          if (cell.blank) {
            const u = this.tableInputs[cell.idx].replace(',', '.').trim();
            const a = cell.answer.replace(',', '.').trim();
            if (u !== a) errors.push(cell.idx);
          }
        }));
        if (errors.length === 0) { this.solvedFlags[this.currentIndex] = true; this.showError = false; this.tableErrors = []; if (this.currentIndex < this.exercises.length - 1) { setTimeout(() => this.goTo(this.currentIndex + 1), 1500) } }
        else { this.tableErrors = errors; this.showError = true; setTimeout(() => { this.showError = false; this.tableErrors = [] }, 2000) }
        return
      }
      if (this.cur.type === 'tile-select') {
        if (this.solved) return;
        const expected = [...(this.cur.tileAnswers || [])].sort((a, b) => a - b);
        const actual = [...this.tileSelected].sort((a, b) => a - b);
        if (actual.length === expected.length && actual.every((v, i) => v === expected[i])) {
          this.solvedFlags[this.currentIndex] = true; this.showError = false; this.tileErrors = [];
          if (this.currentIndex < this.exercises.length - 1) { setTimeout(() => this.goTo(this.currentIndex + 1), 1500) }
        } else {
          this.tileErrors = this.tileSelected.filter(i => !expected.includes(i));
          this.showError = true; setTimeout(() => { this.showError = false; this.tileErrors = [] }, 2000);
        }
        return
      }
      if (this.cur.type === 'svg-tiles') {
        if (this.solved) return;
        const expected = [...(this.cur.answers || [])].sort((a, b) => a - b);
        const actual = [...this.svgSelected].sort((a, b) => a - b);
        if (actual.length === expected.length && actual.every((v, i) => v === expected[i])) {
          this.solvedFlags[this.currentIndex] = true; this.showError = false; this.svgErrors = [];
          if (this.currentIndex < this.exercises.length - 1) { setTimeout(() => this.goTo(this.currentIndex + 1), 1500) }
        } else {
          this.svgErrors = this.svgSelected.filter(i => !expected.includes(i));
          this.showError = true; setTimeout(() => { this.showError = false; this.svgErrors = [] }, 2000);
        }
        return
      }
      if (this.cur.type === 'checkbox') {
        if (this.solved) return;
        const exp = [...(this.cur.checkedAnswers || [])].sort((a,b) => a-b);
        const act = [...this.checkSelected].sort((a,b) => a-b);
        if (act.length === exp.length && act.every((v,i) => v === exp[i])) {
          this.solvedFlags[this.currentIndex] = true; this.showError = false; this.checkErrors = [];
          if (this.currentIndex < this.exercises.length - 1) { setTimeout(() => this.goTo(this.currentIndex + 1), 1500) }
        } else {
          this.checkErrors = this.checkSelected.filter(i => !exp.includes(i));
          this.showError = true; setTimeout(() => { this.showError = false; this.checkErrors = [] }, 2000);
        }
        return
      }
      if (this.cur.type === 'select') {
        if (this.solved) return;
        const stmts = this.cur.selectStatements || [];
        if (this.selectAnswers.some(v => !v)) { this.showError = true; setTimeout(() => { this.showError = false }, 2000); return }
        const errors = stmts.map((s, i) => (this.selectAnswers[i] || '').trim().toLowerCase() !== s.answer.trim().toLowerCase() ? i : -1).filter(i => i !== -1);
        if (errors.length === 0) { this.solvedFlags[this.currentIndex] = true; this.showError = false; this.selectErrors = []; if (this.currentIndex < this.exercises.length - 1) { setTimeout(() => this.goTo(this.currentIndex + 1), 1500) } }
        else { this.selectErrors = errors; this.showError = true; setTimeout(() => { this.showError = false; this.selectErrors = [] }, 2000) }
        return
      }
      if (this.cur.type === 'sort') {
        if (this.solved) return;
        const userOrder = this.sortPicked.map(i => this.sortShuffled[i]);
        const wrong = userOrder.map((v, i) => v !== (this.cur.items || [])[i] ? i : -1).filter(i => i !== -1);
        if (wrong.length === 0) {
          this.solvedFlags[this.currentIndex] = true; this.showError = false; this.sortErrors = [];
          if (this.currentIndex < this.exercises.length - 1) { setTimeout(() => this.goTo(this.currentIndex + 1), 1500) }
        } else { this.sortErrors = wrong; this.showError = true; setTimeout(() => { this.showError = false; this.sortErrors = []; this.sortPicked = [] }, 2000) }
        return
      }
      if (this.cur.type === 'fraction-check') {
        if (this.solved) return;
        if (!this.rfInputs[0].trim() || !this.rfInputs[1].trim()) { this.showError = true; setTimeout(() => { this.showError = false }, 2000); return }
        const isCorrect = (this.cur.answers || []).some(a => {
          const p = a.split('/'); return this.rfInputs[0].trim() === p[0] && this.rfInputs[1].trim() === p[1];
        });
        if (isCorrect) {
          this.solvedFlags[this.currentIndex] = true; this.showError = false;
          if (this.currentIndex < this.exercises.length - 1) { setTimeout(() => this.goTo(this.currentIndex + 1), 1500) }
        } else { this.showError = true; setTimeout(() => { this.showError = false }, 2000) }
        return
      }
      if (this.cur.type === 'matching') {
        if (this.solved) return;
        const p = this.cur.pairs;
        if (!p) return;
        if (this.matchConnections.length < p.left.length) { this.showError = true; setTimeout(() => { this.showError = false }, 2000); return }
        const errs = [];
        for (const c of this.matchConnections) { if (p.answers[c.left] !== c.right) errs.push(c) }
        if (errs.length === 0) { this.solvedFlags[this.currentIndex] = true; this.showError = false; this.matchErrors = []; this.$nextTick(() => this.updateMatchLines()); if (this.currentIndex < this.exercises.length - 1) { setTimeout(() => this.goTo(this.currentIndex + 1), 1500) } }
        else { this.matchErrors = errs; this.$nextTick(() => this.updateMatchLines()); this.showError = true; setTimeout(() => { this.showError = false }, 2000) }
        return
      }
      if (this.cur.type === 'logic-grid') {
        if (this.solved) return;
        const g = this.cur.grid;
        if (!g) return;
        const nr = g.rows.length, nc = g.columns.length;
        const checks = [];
        for (let r = 0; r < nr; r++)for (let c = 0; c < nc; c++) { if (this.gridCells[r * nc + c] === 2) checks.push({ r, c, idx: r * nc + c }) }
        if (checks.length < nr) { this.showError = true; setTimeout(() => { this.showError = false }, 2000); return }
        const errs = checks.filter(({ r, c }) => !g.solution[r][c]);
        if (errs.length === 0) { this.solvedFlags[this.currentIndex] = true; this.showError = false; this.gridErrors = []; if (this.currentIndex < this.exercises.length - 1) { setTimeout(() => this.goTo(this.currentIndex + 1), 1500) } }
        else { this.gridErrors = errs.map(e => e.idx); this.showError = true; setTimeout(() => { this.showError = false }, 2000) }
        return
      }
      if (this.cur.type === 'pyramid') {
        if (this.solved) return;
        const p = this.cur.pyramid;
        if (!p) return;
        const wrong = [];
        let allFilled = true;
        for (let r = 0; r < p.rows.length; r++) { for (let c = 0; c < p.rows[r].length; c++) { if (!p.given[r][c]) { const fi = this.pyramidFlatIdx(r, c); if (!this.pyramidInputs[fi].trim()) { allFilled = false } else if (this.pyramidInputs[fi].trim() !== String(p.rows[r][c])) { wrong.push(fi) } } } }
        if (!allFilled) { this.showError = true; setTimeout(() => { this.showError = false }, 2000); return }
        if (wrong.length === 0) { this.solvedFlags[this.currentIndex] = true; this.showError = false; this.pyramidErrors = []; if (this.currentIndex < this.exercises.length - 1) { setTimeout(() => this.goTo(this.currentIndex + 1), 1500) } }
        else { this.pyramidErrors = wrong; this.showError = true; setTimeout(() => { this.showError = false }, 2000) }
        return
      }
      if (this.cur.type === 'true-false') {
        if (this.solved) return;
        const st = this.cur.statements;
        if (!st) return;
        if (this.tfInputs.some(v => v === null)) { this.showError = true; setTimeout(() => { this.showError = false }, 2000); return }
        const wrong = [];
        st.forEach((s, i) => { if (this.tfInputs[i] !== s.answer) wrong.push(i) });
        if (wrong.length === 0) { this.solvedFlags[this.currentIndex] = true; this.showError = false; this.tfErrors = []; if (this.currentIndex < this.exercises.length - 1) { setTimeout(() => this.goTo(this.currentIndex + 1), 1500) } }
        else { this.tfErrors = wrong; this.showError = true; setTimeout(() => { this.showError = false }, 2000) }
        return
      }
      if (this.cur.type === 'compare') {
        if (this.solved) return;
        const cm = this.cur.comparisons;
        if (!cm) return;
        if (this.cmpInputs.some(v => v === null)) { this.showError = true; setTimeout(() => { this.showError = false }, 2000); return }
        const wrong = []; cm.forEach((c, i) => { if (this.cmpInputs[i] !== c.answer) wrong.push(i) });
        if (wrong.length === 0) { this.solvedFlags[this.currentIndex] = true; this.showError = false; this.cmpErrors = []; if (this.currentIndex < this.exercises.length - 1) { setTimeout(() => this.goTo(this.currentIndex + 1), 1500) } }
        else { this.cmpErrors = wrong; this.showError = true; setTimeout(() => { this.showError = false }, 2000) }
        return
      }
      if (this.cur.type === 'sequence' || this.cur.type === 'bounding' || this.cur.type === 'convert') {
        if (this.solved) return;
        const s = this.cur.sequence || this.cur.bounding || this.cur.convert;
        if (!s) return;
        if (this.seqInputs.some(v => !v.trim())) { this.showError = true; setTimeout(() => { this.showError = false }, 2000); return }
        const wrong = [];
        s.answers.forEach((a, idx) => { if (this.seqInputs[idx].trim().replace(/,/g, '.') !== a.replace(/,/g, '.')) wrong.push(idx) });
        if (wrong.length === 0) { this.solvedFlags[this.currentIndex] = true; this.showError = false; this.seqErrors = []; if (this.currentIndex < this.exercises.length - 1) { setTimeout(() => this.goTo(this.currentIndex + 1), 1500) } }
        else { this.seqErrors = wrong; this.showError = true; setTimeout(() => { this.showError = false }, 2000) }
        return
      }
      // Operation à trou (single or multi-blank)
      if (this.trouInputs.length > 0) {
        if (this.solved) return;
        if (this.trouInputs.some(v => !v.trim())) { this.showError = true; setTimeout(() => { this.showError = false }, 2000); return }
        let isCorrect;
        if (this.trouInputs.length === 1) {
          // Single blank: answers are alternatives
          const input = this.trouInputs[0].trim().toLowerCase().replace(/,/g, '.');
          isCorrect = (this.cur.answers || []).some(a => a.replace(/,/g, '.') === input);
        } else {
          // Multi-blank: answers are positional
          isCorrect = this.trouInputs.every((v, i) => v.trim().toLowerCase().replace(/,/g, '.') === (this.cur.answers[i] || '').replace(/,/g, '.'));
        }
        if (isCorrect) { this.solvedFlags[this.currentIndex] = true; this.showError = false; if (this.currentIndex < this.exercises.length - 1) { setTimeout(() => this.goTo(this.currentIndex + 1), 1500) } }
        else { this.showError = true; setTimeout(() => { this.showError = false }, 2000) }
        return
      }
      if (this.solved || !this.userInput.trim()) return;
      const input = this.userInput.trim().toLowerCase().replace(/,/g, '.');
      const isCorrect = (this.cur.answers || []).some(a => a.replace(/,/g, '.') === input);

      if (isCorrect) {
        this.solvedFlags[this.currentIndex] = true; this.showError = false;
        if (this.currentIndex < this.exercises.length - 1) { setTimeout(() => this.goTo(this.currentIndex + 1), 1500) }
      } else { this.showError = true; setTimeout(() => { this.showError = false }, 2000) }
    },

    matchTap(side, i) {
      if (this.solved) return;
      if (side === 'left') { this.matchSelected = this.matchSelected === i ? null : i }
      else {
        if (this.matchSelected === null) return;
        const l = this.matchSelected;
        this.matchConnections = this.matchConnections.filter(c => c.left !== l && c.right !== i);
        this.matchConnections.push({ left: l, right: i });
        this.matchErrors = this.matchErrors.filter(c => c.left !== l && c.right !== i);
        this.matchSelected = null;
        this.$nextTick(() => { this.updateMatchLines(); if (this.matchConnections.length === (this.cur.pairs ? this.cur.pairs.left.length : 0)) this.check() })
      }
    },
    matchLeftSelected(i) { return this.matchSelected === i },
    matchLeftConnected(i) { return this.matchConnections.some(c => c.left === i) },
    matchRightConnected(i) { return this.matchConnections.some(c => c.right === i) },
    matchIsError(side, i) { return this.matchErrors.some(c => side === 'left' ? c.left === i : c.right === i) },
    matchGetCoords(side, i) { const container = this.$refs.matchContainer; if (!container) return null; const el = container.querySelector('[data-dot="' + side + i + '"]'); if (!el) return null; const er = el.getBoundingClientRect(); const cr = container.getBoundingClientRect(); return { x: side === 'left' ? er.right - cr.left : er.left - cr.left, y: er.top + er.height / 2 - cr.top } },

    gridTap(r, c) {
      if (this.solved) return;
      const g = this.cur.grid; if (!g) return;
      const nc = g.columns.length; const idx = r * nc + c; const cells = [...this.gridCells]; const curVal = cells[idx]; const nv = (curVal + 1) % 3; cells[idx] = nv;
      if (nv === 2) { for (let cc = 0; cc < nc; cc++) { if (cc !== c && cells[r * nc + cc] === 2) cells[r * nc + cc] = 0 } for (let rr = 0; rr < g.rows.length; rr++) { if (rr !== r && cells[rr * nc + c] === 2) cells[rr * nc + c] = 0 } }
      this.gridCells = cells; this.gridErrors = []; const checkCount = cells.filter(v => v === 2).length; if (checkCount === g.rows.length) { this.$nextTick(() => this.check()) }
    },
    gridCellVal(r, c) { const g = this.cur.grid; if (!g) return 0; return this.gridCells[r * g.columns.length + c] || 0 },
    gridIsError(r, c) { const g = this.cur.grid; if (!g) return false; return this.gridErrors.includes(r * g.columns.length + c) },
    _initPyramid(p) { const inputs = []; for (let r = 0; r < p.rows.length; r++) { for (let c = 0; c < p.rows[r].length; c++) { inputs.push(p.given[r][c] ? String(p.rows[r][c]) : '') } } this.pyramidInputs = inputs; this.pyramidErrors = [] },
    pyramidFlatIdx(r, c) { const p = this.cur.pyramid; if (!p) return 0; let idx = 0; for (let ri = 0; ri < r; ri++)idx += p.rows[ri].length; return idx + c },
    pyramidIsError(r, c) { return this.pyramidErrors.includes(this.pyramidFlatIdx(r, c)) },

    mcqTap(i) {
      if (this.solved) return;
      if (i === this.cur.mcqAnswer) { this.mcqSelected = i; this.mcqWrong = null; this.solvedFlags[this.currentIndex] = true; this.showError = false; if (this.currentIndex < this.exercises.length - 1) { setTimeout(() => this.goTo(this.currentIndex + 1), 1500) } }
      else { this.mcqWrong = i; this.mcqSelected = null; setTimeout(() => { this.mcqWrong = null }, 1500) }
    },


    async submitValidation() {
      this.testSending = true;
      this.testError = '';
      const live = await window.__pbAvailable();
      if (!live) {
        this.testError = 'Mode démo — la validation n\'a pas été envoyée.';
        this.testSending = false;
        return;
      }
      try {
        const pb = new PocketBase(window.__pbUrl);
        const seriesId = window.location.pathname.replace(/\/$/, '').split('/').pop();
        await pb.collection('validations').create({
          series_id: seriesId,
          notes: this.testNotes.trim()
        });
        this.testSent = true;
      } catch (err) {
        this.testError = 'Erreur d\'envoi. Réessayez.';
        console.error(err);
      } finally {
        this.testSending = false;
      }
    },

    mqCheck(i) {
      if (this.mqSolved[i] || !this.mqInputs[i].trim()) return;
      const q = this.cur.mqQuestions; if (!q) return;
      if (this.mqInputs[i].trim().toLowerCase() === q[i].answer) {
        this.mqSolved[i] = true; this.mqErrors = this.mqErrors.filter(e => e !== i);
        if (this.mqSolved.every(Boolean)) { this.solvedFlags[this.currentIndex] = true; if (this.currentIndex < this.exercises.length - 1) { setTimeout(() => this.goTo(this.currentIndex + 1), 1500) } }
        else { this.$nextTick(() => { for (let j = i + 1; j < q.length; j++) { if (!this.mqSolved[j]) { const ref = this.$refs['mqInput' + j]; if (ref) ref.focus(); return } } }) }
      } else { this.mqErrors = [...this.mqErrors.filter(e => e !== i), i]; setTimeout(() => { this.mqErrors = this.mqErrors.filter(e => e !== i) }, 2000) }
    },

    updateMatchLines() {
      this._matchLinesSvg = this.matchConnections.map(c => {
        const from = this.matchGetCoords('left', c.left);
        const to = this.matchGetCoords('right', c.right);
        if (!from || !to) return '';
        const color = this.matchErrors.some(e => e.left === c.left) ? '#ef4444' : (this.solvedFlags[this.currentIndex] ? '#22c55e' : 'var(--p)');
        return '<line x1="' + from.x + '" y1="' + from.y + '" x2="' + to.x + '" y2="' + to.y + '" stroke="' + color + '" stroke-width="3" stroke-linecap="round"/>'
      }).join('')
    },

    sortTap(idx) {
      if (this.solved || this.sortPicked.includes(idx)) return;
      this.sortPicked.push(idx);
    },
    sortUnpick(rank) {
      if (this.solved) return;
      this.sortPicked = this.sortPicked.slice(0, rank);
    },

    goTo(idx) {
      this.currentIndex = idx; this.userInput = ''; this.showError = false; this.matchSelected = null; this.matchConnections = []; this.matchErrors = []; this._matchLinesSvg = ''; this.rfInputs = ['', ''];
      const _e = this.exercises[idx] || {}; const _blanks = (_e.operation || '').split('?').length - 1; this.trouInputs = _blanks > 0 ? Array(_blanks).fill('') : [];
      const _s = _e.sequence || _e.bounding || _e.convert; this.seqInputs = _s ? _s.answers.map(() => '') : []; this.seqErrors = [];
      const _g = _e.grid; this.gridCells = _g ? new Array(_g.rows.length * _g.columns.length).fill(0) : []; this.gridErrors = [];
      if (_e.pyramid) { this._initPyramid(_e.pyramid) } else { this.pyramidInputs = []; this.pyramidErrors = [] }
      if (_e.statements) { this.tfInputs = _e.statements.map(() => null) } else { this.tfInputs = [] } this.tfErrors = [];
      if (_e.comparisons) { this.cmpInputs = _e.comparisons.map(() => null) } else { this.cmpInputs = [] } this.cmpErrors = [];
      if (_e.mqQuestions) { this.mqInputs = _e.mqQuestions.map(() => ''); this.mqSolved = _e.mqQuestions.map(() => false) } else { this.mqInputs = []; this.mqSolved = [] } this.mqErrors = [];
      this.mcqSelected = null; this.mcqWrong = null; this.tileSelected = []; this.tileErrors = []; this.svgSelected = []; this.svgErrors = [];
      if (_e.items) { this.sortPicked = []; this.sortShuffled = [..._e.items].sort(() => Math.random() - 0.5) } else { this.sortPicked = []; this.sortShuffled = [] } this.sortErrors = [];
      if (_e.table) { this.tableInputs = new Array(_e.table.blankCount).fill('') } else { this.tableInputs = [] } this.tableErrors = [];
      this.checkSelected = []; this.checkErrors = [];
      if (_e.columns) { this.clickBlockLevels = _e.columns.map(() => 0); } else { this.clickBlockLevels = []; } this.clickBlockErrors = [];
      this.selectAnswers = new Array((_e.selectStatements || []).length).fill(''); this.selectErrors = [];
      if (_e.tiles) { const n = _e.tiles.length; const arr = Array.from({length: n}, (_, i) => i); for (let i = n - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } if (arr.every((v, i) => v === i) && n > 1) [arr[0], arr[1]] = [arr[1], arr[0]]; this.dragTilesOrder = arr; } else { this.dragTilesOrder = []; } this.dragSelected = null; if (this._dragErrTimer) { clearTimeout(this._dragErrTimer); this._dragErrTimer = null; } this.dragErrors = [];
      window.location.hash = '#' + (idx + 1);
    },

    syncFromHash() { const h = parseInt(window.location.hash.replace('#', ''), 10); if (h >= 1 && h <= this.exercises.length) { this.currentIndex = h - 1 } }
  }
}

/* Exercise store — loads CSV on demand, caches in sessionStorage */
document.addEventListener('alpine:init', () => {
  const LEVELS = { '1': 'CP', '2': 'CE1', '3': 'CE2', '4': 'CM1', '5': 'CM2' };
  const DIFFS = { '1': 'facile', '2': 'moyen', '3': 'difficile' };
  const FOLDERS = { e: 'exercices', a: 'applications' };

  Alpine.store('exercises', {
    data: null,
    loading: false,

    async load() {
      if (this.data) return;
      const cached = sessionStorage.getItem('ex');
      if (cached) {
        try {
          const d = JSON.parse(cached);
          const prefix = window.__pathPrefix || '/';
          if (Array.isArray(d) && d.length && d[0].title && d[0].seriesUrl && d[0].seriesUrl.startsWith(prefix)) { this.data = d; return; }
          sessionStorage.removeItem('ex');
        } catch (e) { sessionStorage.removeItem('ex'); }
      }

      this.loading = true;
      try {
        const res = await fetch((window.__pathPrefix || '/') + 'fr/exercices/data.csv');
        if (!res.ok) { console.error('CSV fetch failed:', res.status); this.loading = false; return; }
        const text = await res.text();
        const rows = text.replace(/\r/g, '').trim().split('\n');
        if (!rows[0] || !rows[0].startsWith('id,')) { console.error('CSV header invalid:', rows[0]); this.loading = false; return; }
        this.data = rows.slice(1).filter(r => r).map(row => {
          const [id, l, s, t, title, d, f] = row.split(',');
          return {
            id, level: LEVELS[l] || l, subject: s, topic: t, title,
            difficulty: DIFFS[d] || d,
            seriesUrl: (window.__pathPrefix || '/') + 'fr/' + (FOLDERS[f] || 'exercices') + '/' + id + '/'
          };
        });
        sessionStorage.setItem('ex', JSON.stringify(this.data));
      } catch (e) { console.error('CSV load error:', e); }
      this.loading = false;
    }
  });
});
