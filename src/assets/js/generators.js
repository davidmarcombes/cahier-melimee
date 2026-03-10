/**
 * Shared generators — single source for both Node.js (build) and browser (runtime).
 * Each generator returns a seriesPlayer-compatible exercise item.
 */
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const toRoman = (num) => {
    const map = {
        M: 1000, CM: 900, D: 500, CD: 400,
        C: 100, XC: 90, L: 50, XL: 40,
        X: 10, IX: 9, V: 5, IV: 4, I: 1
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

const fromRoman = (str) => {
    const map = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
    let total = 0;

    for (let i = 0; i < str.length; i++) {
        const current = map[str[i]];
        const next = map[str[i + 1]];

        if (next > current) {
            total += (next - current);
            i++;
        } else {
            total += current;
        }
    }
    return total;
};

const generators = {
    multiplicationSimple: {
        generate: (params = {}) => {
            const a = rand(params.minA ?? 2, params.maxA ?? 10);
            const b = rand(params.minB ?? 2, params.maxB ?? 12);
            return { type: 'number-check', operation: `${a} \u00d7 ${b}`, answers: [String(a * b)] };
        }
    },

    additionSimple: {
        generate: (params = {}) => {
            const a = rand(params.minA ?? 10, params.maxA ?? 99);
            const b = rand(params.minB ?? 10, params.maxB ?? 99);
            return { type: 'number-check', operation: `${a} + ${b}`, answers: [String(a + b)] };
        }
    },

    additionTrou: {
        generate: (params = {}) => {
            const total = rand(params.minTotal ?? 20, params.maxTotal ?? 100);
            const a = rand(2, total - 5);
            const b = total - a;
            const missing = Math.random() > 0.5 ? 'a' : 'b';
            const op = missing === 'a' ? `? + ${b} = ${total}` : `${a} + ? = ${total}`;
            return { type: 'number-check', operation: op, answers: [String(missing === 'a' ? a : b)] };
        }
    },

    multiplicationTrou: {
        generate: (params = {}) => {
            const a = rand(params.minA ?? 2, params.maxA ?? 10);
            const b = rand(params.minB ?? 2, params.maxB ?? 10);
            const total = a * b;
            const missing = Math.random() > 0.5 ? 'a' : 'b';
            const op = missing === 'a' ? `? \u00d7 ${b} = ${total}` : `${a} \u00d7 ? = ${total}`;
            return { type: 'number-check', operation: op, answers: [String(missing === 'a' ? a : b)] };
        }
    },

    divisionSimple: {
        generate: (params = {}) => {
            const b = rand(params.minDivisor ?? 2, params.maxDivisor ?? 5);
            const q = rand(params.minQuotient ?? 2, params.maxQuotient ?? 10);
            const a = q * b;
            return { type: 'number-check', operation: `${a} \u00f7 ${b}`, answers: [String(q)] };
        }
    },

    additionFacile: {
        generate: (params = {}) => {
            const a = rand(params.minA ?? 1, params.maxA ?? 5);
            const b = rand(params.minB ?? 1, params.maxB ?? 5);
            return { type: 'number-check', operation: `${a} + ${b}`, answers: [String(a + b)] };
        }
    },

    soustractionFacile: {
        generate: (params = {}) => {
            const a = rand(params.minA ?? 5, params.maxA ?? 10);
            const b = rand(params.minB ?? 1, params.maxB ?? 5);
            return { type: 'number-check', operation: `${a} - ${b}`, answers: [String(a - b)] };
        }
    },

    tablesSoustractionCP: {
        generate: (params = {}) => {
            const sub = rand(params.minSub ?? 0, params.maxSub ?? 9);
            const result = rand(params.minResult ?? 0, params.maxResult ?? 9);
            const a = sub + result;
            return { type: 'number-check', operation: `${a} - ${sub}`, answers: [String(result)] };
        }
    },

    soustractionTrou: {
        generate: (params = {}) => {
            const result = rand(params.minResult ?? 0, params.maxResult ?? 9);
            const sub = rand(params.minSub ?? 1, params.maxSub ?? 9);
            const total = result + sub;
            const missing = Math.random() > 0.5 ? 'result' : 'sub';
            const op = missing === 'result' ? `${total} - ${sub} = ?` : `${total} - ? = ${result}`;
            return { type: 'number-check', operation: op, answers: [String(missing === 'result' ? result : sub)] };
        }
    },

    ajouterSoustraire10: {
        generate: (params = {}) => {
            const n = rand(params.min ?? 1, params.max ?? 89);
            const add = Math.random() > 0.5;
            const op = add ? `${n} + 10 = ?` : `${n + 10} - 10 = ?`;
            return { type: 'number-check', operation: op, answers: [String(add ? n + 10 : n)] };
        }
    },

    decompositionBase10: {
        generate: (params = {}) => {
            const t = rand(params.minTens ?? 1, params.maxTens ?? 9);
            const u = rand(params.minOnes ?? 0, params.maxOnes ?? 9);
            const op = u === 0
                ? `${t} dizaine${t > 1 ? 's' : ''} et 0 unité = ?`
                : `${t} dizaine${t > 1 ? 's' : ''} et ${u} unité${u > 1 ? 's' : ''} = ?`;
            return { type: 'number-check', operation: op, answers: [String(t * 10 + u)] };
        }
    },

    pairOuImpair: {
        generate: (params = {}) => {
            const num = rand(params.min ?? 1, params.max ?? 100);
            return { type: 'number-check', operation: num, answers: [num % 2 === 0 ? 'pair' : 'impair'] };
        }
    },

    ruler: {
        generate: (params = {}) => {
            const min = params.min ?? 0;
            const max = params.max ?? 10;
            const divisions = params.divisions ?? 1;
            const subdivisions = params.subdivisions ?? 0;
            const label = params.label ?? 'A';
            const step = subdivisions > 0 ? 1 / (divisions * subdivisions) : 1 / divisions;
            const totalSteps = Math.round((max - min) / step);
            const idx = rand(1, totalSteps - 1);
            const value = Math.round((min + idx * step) * 10000) / 10000;
            const answer = Number.isInteger(value) ? String(value) : String(value).replace('.', ',');
            return {
                type: 'ruler', title: `Lis la valeur indiqu\u00e9e par ${label}`,
                ruler: { min, max, divisions, subdivisions, markers: [{ label, value }] },
                answers: [answer]
            };
        }
    },

    romanNumerals: {
        generate: (params = {}) => {
            const min = params.min ?? 1;
            const max = params.max ?? 39;
            const num = rand(min, max);
            const roman = toRoman(num);
            return { type: 'number-check', operation: roman, answers: [String(num)] };
        }
    },

    romanNumeralsReverse: {
        generate: (params = {}) => {
            const min = params.min ?? 1;
            const max = params.max ?? 39;
            const num = rand(min, max);
            const roman = toRoman(num);
            return { type: 'number-check', operation: num, answers: [roman] };
        }
    },

    recomposerNombre: {
        generate: (params = {}) => {
            const magnitude = rand(params.min ?? 2, params.max ?? 6);
            const digits = [];
            for (let i = 0; i < magnitude; i++) {
                digits.push(rand(0, 9));
            }
            const num = digits.reduce((acc, digit) => acc * 10 + digit, 0)
            const strDecompose = digits.map((digit, index) => {
                const power = magnitude - index - 1;
                return `${digit} x 10^{${power}}`;
            }).join(' + ');
            return { type: 'number-check', operation: strDecompose, answers: [String(num)] };
        }
    },

    arrondirNombre: {
        generate: (params = {}) => {
            const order = params.order ?? rand(2, 5);
            const magnitude = params.magnitude ?? rand(order, order + 2);

            const digits = [];
            for (let i = 0; i < magnitude; i++) {
                digits.push(rand(0, 9));
            }
            const num = digits.reduce((acc, digit) => acc * 10 + digit, 0)
            const rounded = Math.round(num / Math.pow(10, order)) * Math.pow(10, order);
            return { type: 'number-check', operation: num, answers: [String(rounded)] };
        }
    },

    complementNombre: {
        generate: (params = {}) => {
            const target = params.target ?? 10 ** rand(1, 4);
            const num = rand(1, target - 1);
            const complement = target - num;
            return { type: 'number-check', operation: num, answers: [String(complement)] };
        }
    },

    estimationSomme: {
        generate: (params = {}) => {
            const count = params.count ?? 2;
            const min = params.min ?? 10;
            const max = params.max ?? 99;
            const precision = params.precision ?? 10;

            const nums = [];
            for (let i = 0; i < count; i++) nums.push(rand(min, max));
            const sum = nums.reduce((a, b) => a + b, 0);
            const correct = Math.round(sum / precision) * precision;

            const candidates = [-3, -2, -1, 1, 2, 3]
                .sort(() => Math.random() - 0.5)
                .map(n => correct + n * precision)
                .filter(w => w > 0);
            const wrongs = [...new Set(candidates)].slice(0, 2);

            const choices = [String(correct), ...wrongs.map(String)];
            for (let i = choices.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [choices[i], choices[j]] = [choices[j], choices[i]];
            }
            return {
                type: 'mcq',
                operation: nums.join(' + '),
                mcqChoices: choices,
                mcqAnswer: choices.indexOf(String(correct)),
                answers: [String(correct)]
            };
        }
    },

    egalitesFractions: {
        generate: (params = {}) => {
            const frac = (n, d) => `<span class="frac"><span class="fn">${n}</span><span class="fd">${d}</span></span>`;
            // a=1..8, b=1..8 so a+1 and b+1 stay ≤ 9
            const a = rand(params.minInt ?? 1, params.maxInt ?? 8);
            const b = rand(params.minTenth ?? 1, params.maxTenth ?? 8);
            const num = a * 10 + b; // e.g. 72 for a=7, b=2

            // Always 2 correct tiles: fraction form + mixed form
            const correct = [
                frac(num, 10),             // 72/10
                `${a} + ${frac(b, 10)}`    // 7 + 2/10
            ];

            // Wrong tiles: wrong integer OR wrong tenths
            const wrongs = [
                `${a + 1} + ${frac(b, 10)}`,   // (a+1) + b/10
                `${a} + ${frac(b + 1, 10)}`    // a + (b+1)/10
            ];

            // 3 or 4 tiles total (1 or 2 wrong)
            const numWrong = Math.random() > 0.5 ? 2 : 1;
            const selectedWrong = wrongs.slice(0, numWrong);

            // Shuffle all tiles, track correct indices
            const pool = [
                ...correct.map(t => ({ t, ok: true })),
                ...selectedWrong.map(t => ({ t, ok: false }))
            ].sort(() => Math.random() - 0.5);

            return {
                type: 'tile-select',
                title: `Coche toutes les expressions qui valent ${frac(num, 10)}`,
                tiles: pool.map(p => p.t),
                tileAnswers: pool.map((p, i) => p.ok ? i : -1).filter(i => i !== -1)
            };
        }
    },

    recomposerFractions: {
        generate: (params = {}) => {
            const frac = (n, d) => `<span class="frac"><span class="fn">${n}</span><span class="fd">${d}</span></span>`;
            const level = params.level ?? 'mixed';
            // patterns: 1=a+b/10, 2=a+b/10+c/100, 3=b/10+c/100
            const pool = level === 'tenths' ? [1] : level === 'hundredths' ? [2, 3] : [1, 2, 3];
            const pattern = pool[rand(0, pool.length - 1)];

            if (pattern === 1) {
                const a = rand(1, 9);
                const b = rand(1, 9);
                return {
                    type: 'fraction-check',
                    title: 'Recompose la fraction',
                    operation: `${a} + ${frac(b, 10)}`,
                    answers: [`${a * 10 + b}/10`]
                };
            }
            if (pattern === 2) {
                const a = rand(1, 5);
                const b = rand(0, 9);
                const c = rand(1, 9);
                const parts = [String(a)];
                if (b > 0) parts.push(`+ ${frac(b, 10)}`);
                parts.push(`+ ${frac(c, 100)}`);
                return {
                    type: 'fraction-check',
                    title: 'Recompose la fraction',
                    operation: parts.join(' '),
                    answers: [`${a * 100 + b * 10 + c}/100`]
                };
            }
            // pattern === 3
            const b = rand(1, 9);
            const c = rand(1, 9);
            return {
                type: 'fraction-check',
                title: 'Recompose la fraction',
                operation: `${frac(b, 10)} + ${frac(c, 100)}`,
                answers: [`${b * 10 + c}/100`]
            };
        }
    },

    comparerNombres: {
        generate: (params = {}) => {
            const min = params.min ?? 1;
            const max = params.max ?? 100;
            const count = params.count ?? 4;
            const comparisons = [];
            for (let i = 0; i < count; i++) {
                let a = rand(min, max);
                let b = rand(min, max);
                while (a === b) b = rand(min, max);
                comparisons.push({ left: String(a), right: String(b), answer: a < b ? '<' : '>' });
            }
            return { type: 'compare', comparisons };
        }
    },

    tablesAdditionCP: {
        generate: (params = {}) => {
            const base = params.base ?? rand(params.minBase ?? 1, params.maxBase ?? 9);
            const addend = rand(params.minAdd ?? 0, params.maxAdd ?? 9);
            return { type: 'number-check', operation: `${base} + ${addend}`, answers: [String(base + addend)] };
        }
    },

    complements10: {
        generate: () => {
            const a = rand(1, 9);
            const b = 10 - a;
            const missing = Math.random() > 0.5 ? 'a' : 'b';
            const op = missing === 'a' ? `? + ${b} = 10` : `${a} + ? = 10`;
            return { type: 'number-check', operation: op, answers: [String(missing === 'a' ? a : b)] };
        }
    },

    doublesMoities: {
        generate: (params = {}) => {
            const n = rand(params.min ?? 1, params.max ?? 10);
            if (Math.random() > 0.5) {
                return { type: 'number-check', operation: `double de ${n} = ?`, answers: [String(n * 2)] };
            } else {
                const even = n * 2;
                return { type: 'number-check', operation: `moitié de ${even} = ?`, answers: [String(n)] };
            }
        }
    },

    compterDeN: {
        generate: (params = {}) => {
            const stepChoices = params.step ? [params.step] : [2, 5, 10];
            const step = stepChoices[rand(0, stepChoices.length - 1)];
            const asc = params.direction ? params.direction === 'asc' : Math.random() > 0.5;
            const startVal = asc ? rand(0, 7) * step : rand(5, 12) * step;
            const given = asc
                ? [startVal, startVal + step, startVal + 2 * step]
                : [startVal, startVal - step, startVal - 2 * step];
            const answers = asc
                ? [startVal + 3 * step, startVal + 4 * step, startVal + 5 * step]
                : [startVal - 3 * step, startVal - 4 * step, startVal - 5 * step];
            if (answers.some(v => v < 0)) {
                return { type: 'sequence', sequence: { given: [0, step, step * 2].map(String), answers: [step * 3, step * 4, step * 5].map(String) } };
            }
            return { type: 'sequence', sequence: { given: given.map(String), answers: answers.map(String) } };
        }
    },

    additionDecimaux: {
        generate: (params = {}) => {
            const decimals = params.decimals ?? 1;
            const max = params.max ?? 9;
            const scale = Math.pow(10, decimals);
            const a = rand(1, max * scale) / scale;
            const b = rand(1, max * scale) / scale;
            const result = Math.round((a + b) * scale) / scale;
            const fmt = n => String(n).replace('.', ',');
            return { type: 'number-check', operation: `${fmt(a)} + ${fmt(b)}`, answers: [fmt(result)] };
        }
    },

    soustractionDecimaux: {
        generate: (params = {}) => {
            const decimals = params.decimals ?? 1;
            const max = params.max ?? 9;
            const scale = Math.pow(10, decimals);
            let a = rand(2, max * scale) / scale;
            let b = rand(1, Math.round(a * scale) - 1) / scale;
            const result = Math.round((a - b) * scale) / scale;
            const fmt = n => String(n).replace('.', ',');
            return { type: 'number-check', operation: `${fmt(a)} - ${fmt(b)}`, answers: [fmt(result)] };
        }
    },

    comparerDecimaux: {
        generate: (params = {}) => {
            const decimals = params.decimals ?? 1;
            const max = params.max ?? 9;
            const count = params.count ?? 4;
            const scale = Math.pow(10, decimals);
            const fmt = n => String(n).replace('.', ',');
            const comparisons = [];
            for (let i = 0; i < count; i++) {
                let a = rand(1, max * scale) / scale;
                let b = rand(1, max * scale) / scale;
                while (a === b) b = rand(1, max * scale) / scale;
                comparisons.push({ left: fmt(a), right: fmt(b), answer: a < b ? '<' : '>' });
            }
            return { type: 'compare', comparisons };
        }
    },

    divisionTrou: {
        generate: (params = {}) => {
            const b = rand(params.minDivisor ?? 2, params.maxDivisor ?? 9);
            const q = rand(params.minQuotient ?? 2, params.maxQuotient ?? 10);
            const a = q * b;
            const missing = Math.random() > 0.5 ? 'quotient' : 'dividend';
            const op = missing === 'quotient' ? `${a} \u00f7 ${b} = ?` : `? \u00f7 ${b} = ${q}`;
            return { type: 'number-check', operation: op, answers: [String(missing === 'quotient' ? q : a)] };
        }
    },

    decompositionCentaines: {
        generate: (params = {}) => {
            const maxH = params.maxHundreds ?? 9;
            const h = rand(params.minHundreds ?? 1, maxH);
            const t = rand(params.minTens ?? 0, params.maxTens ?? 9);
            const u = rand(params.minOnes ?? 0, params.maxOnes ?? 9);
            const parts = [`${h} centaine${h > 1 ? 's' : ''}`];
            if (t > 0) parts.push(`${t} dizaine${t > 1 ? 's' : ''}`);
            if (u > 0) parts.push(`${u} unité${u > 1 ? 's' : ''}`);
            if (t === 0 && u === 0) parts.push('0 dizaine et 0 unité');
            return { type: 'number-check', operation: `${parts.join(' et ')} = ?`, answers: [String(h * 100 + t * 10 + u)] };
        }
    },

    compterDeNCE1: {
        generate: (params = {}) => {
            const stepChoices = params.steps ?? [2, 3, 4, 5, 10];
            const step = stepChoices[rand(0, stepChoices.length - 1)];
            const asc = params.direction ? params.direction === 'asc' : Math.random() > 0.5;
            const maxStart = params.max ?? 100;
            const startVal = asc ? rand(0, Math.floor((maxStart - 5 * step) / step)) * step : rand(5, Math.floor(maxStart / step)) * step;
            const given = asc
                ? [startVal, startVal + step, startVal + 2 * step]
                : [startVal, startVal - step, startVal - 2 * step];
            const answers = asc
                ? [startVal + 3 * step, startVal + 4 * step, startVal + 5 * step]
                : [startVal - 3 * step, startVal - 4 * step, startVal - 5 * step];
            if (answers.some(v => v < 0)) {
                return { type: 'sequence', sequence: { given: [0, step, step * 2].map(String), answers: [step * 3, step * 4, step * 5].map(String) } };
            }
            return { type: 'sequence', sequence: { given: given.map(String), answers: answers.map(String) } };
        }
    },

    soustractionSimple: {
        generate: (params = {}) => {
            const a = rand(params.minA ?? 10, params.maxA ?? 99);
            const b = rand(params.minB ?? 1, params.maxB ?? Math.min(a - 1, 99));
            return { type: 'number-check', operation: `${a} - ${b}`, answers: [String(a - b)] };
        }
    },

    ajouterSoustraire100: {
        generate: (params = {}) => {
            const n = rand(params.min ?? 1, params.max ?? 899);
            const add = Math.random() > 0.5;
            const op = add ? `${n} + 100 = ?` : `${n + 100} - 100 = ?`;
            return { type: 'number-check', operation: op, answers: [String(add ? n + 100 : n)] };
        }
    },

    perimetreFormes: {
        generate: (params = {}) => {
            const shapes = ['square', 'rectangle', 'triangle'];
            const shape = shapes[rand(0, 2)];

            if (shape === 'square') {
                const side = rand(params.minSide ?? 3, params.maxSide ?? 12);
                return {
                    type: 'number-check',
                    title: 'Calcule le périmètre du carré (en cm)',
                    svg: { gen: 'squareSvg', par: { size: 80, label: `${side} cm` } },
                    answers: [String(4 * side)]
                };
            }

            if (shape === 'rectangle') {
                const w = rand(params.minW ?? 3, params.maxW ?? 14);
                let h = rand(params.minH ?? 2, params.maxH ?? 10);
                if (h === w) h = h < 10 ? h + 1 : h - 1;
                const maxSide = Math.max(w, h);
                const sc = 100 / maxSide;
                return {
                    type: 'number-check',
                    title: 'Calcule le périmètre du rectangle (en cm)',
                    svg: { gen: 'rectangleSvg', par: { w: Math.round(w * sc), h: Math.round(h * sc), labelW: `${w} cm`, labelH: `${h} cm` } },
                    answers: [String(2 * (w + h))]
                };
            }

            // Triangle: right triangle using Pythagorean triples
            const triples = [[3, 4, 5], [6, 8, 10], [5, 12, 13], [9, 12, 15]];
            const [ta, tb, tc] = triples[rand(0, triples.length - 1)];
            const maxLeg = Math.max(ta, tb);
            const ps = 100 / maxLeg;
            return {
                type: 'number-check',
                title: 'Calcule le périmètre du triangle (en cm)',
                svg: { gen: 'triangleSvg', par: { pixA: Math.round(ta * ps), pixB: Math.round(tb * ps), labelA: `${ta} cm`, labelB: `${tb} cm`, labelC: `${tc} cm` } },
                answers: [String(ta + tb + tc)]
            };
        }
    },

};

// Dual export: Node.js (build time) + browser (runtime)
if (typeof module !== 'undefined') module.exports = generators;
if (typeof window !== 'undefined') window.AppGenerators = generators;


