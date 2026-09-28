/**
 * Generators — shared helpers. Loaded before any generators/*.js module.
 * Browser: window.GenCore · Node: module.exports
 */
(function (root) {
  const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const randItem = (arr) => arr[rand(0, arr.length - 1)];
  const shuffle = (arr) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = rand(0, i);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const randUnique = (min, max, count) => {
    const set = new Set();
    while (set.size < count) set.add(rand(min, max));
    return [...set];
  };

  const toRoman = (num) => {
    const map = {
      M: 1000,
      CM: 900,
      D: 500,
      CD: 400,
      C: 100,
      XC: 90,
      L: 50,
      XL: 40,
      X: 10,
      IX: 9,
      V: 5,
      IV: 4,
      I: 1,
    };
    let result = '';

    for (const key in map) {
      while (num >= map[key]) {
        result += key;
        num -= map[key];
      }
    }
    return result;
  };

  // Shared themes for table-reading exercises
  const TABLE_THEMES = {
    scores: {
      rowLabel: 'Jour',
      valueLabel: 'Points',
      labels: ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'],
      minV: 2,
      maxV: 20,
      qMax: 'Quel jour a-t-on marqu\u00e9 le <strong>plus</strong> de points\u00a0?',
      qMin: 'Quel jour a-t-on marqu\u00e9 le <strong>moins</strong> de points\u00a0?',
      qTotal: 'Quel est le <strong>total</strong> des points sur la semaine\u00a0?',
      qLookup: (lbl) => `Combien de points a-t-on marqu\u00e9 le <strong>${lbl}</strong>\u00a0?`,
    },
    animaux: {
      rowLabel: 'Animal',
      valueLabel: 'Nombre',
      labels: ['Poules', 'Lapins', 'Vaches', 'Moutons', 'Canards'],
      minV: 3,
      maxV: 30,
      qMax: 'Quel animal y a-t-il le <strong>plus</strong>\u00a0?',
      qMin: 'Quel animal y a-t-il le <strong>moins</strong>\u00a0?',
      qTotal: "Combien y a-t-il d'animaux en <strong>tout</strong>\u00a0?",
      qLookup: (lbl) => `Combien y a-t-il de <strong>${lbl}</strong>\u00a0?`,
    },
    temperatures: {
      rowLabel: 'Mois',
      valueLabel: 'Temp.\u00a0(\u00b0C)',
      labels: ['Janv.', 'F\u00e9vr.', 'Mars', 'Avr.', 'Mai'],
      minV: 2,
      maxV: 28,
      qMax: 'Quel mois a eu la <strong>temp\u00e9rature la plus haute</strong>\u00a0?',
      qMin: 'Quel mois a eu la <strong>temp\u00e9rature la plus basse</strong>\u00a0?',
      qTotal: 'Quelle est la <strong>somme</strong> des temp\u00e9ratures\u00a0?',
      qLookup: (lbl) => `Quelle est la temp\u00e9rature en <strong>${lbl}</strong>\u00a0?`,
    },
    livres: {
      rowLabel: 'Jour',
      valueLabel: 'Livres lus',
      labels: ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'],
      minV: 1,
      maxV: 12,
      qMax: 'Quel jour a-t-on lu le <strong>plus</strong> de livres\u00a0?',
      qMin: 'Quel jour a-t-on lu le <strong>moins</strong> de livres\u00a0?',
      qTotal: 'Combien de livres a-t-on lus en <strong>tout</strong>\u00a0?',
      qLookup: (lbl) => `Combien de livres a-t-on lus le <strong>${lbl}</strong>\u00a0?`,
    },
  };

  // Build a styled HTML table for table-reading exercises
  function tableHtml(theme, data) {
    const rows = data
      .map(
        (d) =>
          `<tr><td style="padding:6px 16px;border-top:1px solid #e2e8f0;text-align:center">${d.label}</td>` +
          `<td style="padding:6px 16px;border-top:1px solid #e2e8f0;text-align:center;font-weight:bold">${d.value}</td></tr>`
      )
      .join('');
    return (
      `<div style="display:flex;justify-content:center;margin:4px 0 8px">` +
      `<div style="overflow:hidden;border-radius:10px;border:2px solid var(--p,#6366f1)">` +
      `<table style="border-collapse:collapse;min-width:180px">` +
      `<thead><tr style="background:var(--p,#6366f1)">` +
      `<th style="padding:8px 16px;color:#fff;font-weight:bold;text-align:center">${theme.rowLabel}</th>` +
      `<th style="padding:8px 16px;color:#fff;font-weight:bold;text-align:center">${theme.valueLabel}</th>` +
      `</tr></thead><tbody>${rows}</tbody></table></div></div>`
    );
  }

  // Generate unique values within range for table data
  function tableValues(minV, maxV, count) {
    const range = maxV - minV + 1;
    if (range >= count) return shuffle(Array.from({ length: range }, (_, i) => minV + i)).slice(0, count);
    return Array.from({ length: count }, () => rand(minV, maxV));
  }

  // Returns the palette color index that the number n belongs to for a given rule.
  function magicColorIdx(rule, n, params) {
    switch (rule) {
      case 'direct':
        return n - 1; // cell shows 1, 2, 3… → palette index 0, 1, 2…
      case 'pairs':
        return n % 2 === 0 ? 1 : 0;
      case 'impairs':
        return n % 2 !== 0 ? 1 : 0;
      case 'multiples-of':
        return n % (params.value || 2) === 0 ? 1 : 0;
      case 'lt':
        return n < (params.value ?? 10) ? 1 : 0;
      case 'gt':
        return n > (params.value ?? 10) ? 1 : 0;
      case 'ranges': {
        const ranges = params.ranges || [];
        for (let i = 0; i < ranges.length; i++) {
          const [lo, hi] = ranges[i];
          if (n >= lo && n <= hi) return i;
        }
        return 0;
      }
      default:
        return 0;
    }
  }

  const core = { rand, randItem, shuffle, randUnique, toRoman, TABLE_THEMES, tableHtml, tableValues, magicColorIdx };
  if (typeof module !== 'undefined' && module.exports) module.exports = core;
  else root.GenCore = core;
})(typeof window !== 'undefined' ? window : globalThis);
