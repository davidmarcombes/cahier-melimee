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

    // Sort: order decimal numbers
    // params: count (4), decimals (1), min (1), max (9), direction ('asc'), confusable (false)
    // confusable=true forces all values to share the same integer part (harder to sort)
    trierDecimaux: {
        generate(params = {}) {
            const count = params.count ?? 4;
            const dec = params.decimals ?? 1;
            const direction = params.direction ?? 'asc';
            const scale = Math.pow(10, dec);
            const confusable = params.confusable ?? false;

            const values = new Set();
            if (confusable) {
                // Same integer part, differ only in decimals
                const intPart = rand(params.min ?? 1, params.max ?? 9);
                while (values.size < count) values.add(intPart * scale + rand(0, scale - 1));
            } else {
                const lo = (params.min ?? 1) * scale;
                const hi = (params.max ?? 9) * scale;
                while (values.size < count) values.add(rand(lo, hi));
            }

            const fmt = n => (n / scale).toFixed(dec).replace('.', ',');
            const sorted = [...values].sort((a, b) => direction === 'asc' ? a - b : b - a).map(fmt);
            const title = direction === 'asc' ? 'Ordre croissant' : 'Ordre décroissant';
            return { type: 'sort', title, items: sorted, direction };
        }
    },

    // number-check + abacusSvg: read a boulier (abacus) and write the number
    // params: minDigits (3), maxDigits (6), allowZeroDigit (true)
    //   allowZeroDigit=false → all digits 1-9 (CE2 intro level)
    lireAbacus: {
        generate(params = {}) {
            const ALL_PV = [
                { label: '1\u202f000\u202f000', pv: 1000000 },
                { label: '100\u202f000',        pv: 100000  },
                { label: '10\u202f000',         pv: 10000   },
                { label: '1\u202f000',          pv: 1000    },
                { label: '100',                 pv: 100     },
                { label: '10',                  pv: 10      },
                { label: '1',                   pv: 1       },
            ];
            const minD = params.minDigits ?? 3;
            const maxD = params.maxDigits ?? 6;
            const numD = params.digits    ?? rand(minD, maxD);
            const allowZero = params.allowZeroDigit ?? true;

            const pvSlice = ALL_PV.slice(ALL_PV.length - numD);
            const digits  = pvSlice.map((_, i) =>
                i === 0 ? rand(1, 9) : (allowZero ? rand(0, 9) : rand(1, 9))
            );

            const number = pvSlice.reduce((sum, { pv }, i) => sum + digits[i] * pv, 0);
            const rows   = pvSlice.map(({ label }, i) => ({ label, value: digits[i] }));

            return {
                type: 'number-check',
                title: 'Quel nombre est représenté sur le boulier ?',
                svg: { gen: 'abacusSvg', par: { rows, beadsPerRow: 10 } },
                answers: [String(number)]
            };
        }
    },

    // fill-table + decompoChipsHtml: read place-value chips, fill the numeration table
    // params: minDigits (3), maxDigits (6), allowZeroDigit (true)
    decompoTableau: {
        generate(params = {}) {
            const ALL_PV = [
                { label: '1\u202f000\u202f000', pv: 1000000 },
                { label: '100\u202f000',        pv: 100000  },
                { label: '10\u202f000',         pv: 10000   },
                { label: '1\u202f000',          pv: 1000    },
                { label: '100',                 pv: 100     },
                { label: '10',                  pv: 10      },
                { label: '1',                   pv: 1       },
            ];
            const minD = params.minDigits ?? 3;
            const maxD = params.maxDigits ?? 6;
            const numD = params.digits    ?? rand(minD, maxD);
            const allowZero = params.allowZeroDigit ?? true;

            const pvSlice = ALL_PV.slice(ALL_PV.length - numD);
            const digits  = pvSlice.map((_, i) =>
                i === 0 ? rand(1, 9) : (allowZero ? rand(0, 9) : rand(1, 9))
            );

            const chips   = pvSlice.map(({ label }, i) => ({ label, value: digits[i] }));
            const rows    = [pvSlice.map(({ label }, i) => ({ blank: true, idx: i, answer: String(digits[i]) }))];

            return {
                type: 'fill-table',
                title: 'Remplis le tableau de numération.',
                svg: { gen: 'decompoChipsHtml', par: { chips } },
                table: { blankCount: numD, headers: pvSlice.map(({ label }) => label), rows }
            };
        }
    },

    // checkbox: find all valid decompositions of a hundredths fraction (N/100)
    // params: withZeros (false) — allow 0 in tenths/hundredths digit
    decompoFraction: {
        generate(params = {}) {
            const a = rand(1, 9);
            const b = params.withZeros ? rand(0, 9) : rand(1, 9);  // tenths digit
            const c = rand(1, 9);                                    // hundredths digit (always ≥1)
            const N = a * 100 + b * 10 + c;

            // Inline fraction: stacked numerator/denominator
            const F = (n, d) =>
                `<span style="display:inline-flex;flex-direction:column;align-items:center;`
                + `vertical-align:-0.35em;margin:0 2px;line-height:1.2;font-size:0.9em">`
                + `<span style="border-bottom:1px solid currentColor;padding:0 3px;text-align:center">${n}</span>`
                + `<span style="padding:0 3px;text-align:center">${d}</span></span>`;

            const P = ' + ';
            const shuffle = arr => {
                const r = [...arr];
                for (let i = r.length - 1; i > 0; i--) { const j = rand(0, i); [r[i], r[j]] = [r[j], r[i]]; }
                return r;
            };

            // --- Valid decompositions ---
            const valid = [
                ...(b > 0 ? [`${a}${P}${F(b,10)}${P}${F(c,100)}`]          : []),  // a + b/10 + c/100
                `${a}${P}${F(b*10+c, 100)}`,                                         // a + (10b+c)/100
                `${F(a*100+b*10, 100)}${P}${F(c, 100)}`,                             // (100a+10b)/100 + c/100
                `${F(a*10+b, 10)}${P}${F(c, 100)}`,                                  // (10a+b)/10 + c/100
                ...(b > 0 ? [`${F(a*100,100)}${P}${F(b*10,100)}${P}${F(c,100)}`] : []),  // 100a/100 + 10b/100 + c/100
            ];

            // --- Invalid distractors (look similar, compute to wrong value) ---
            const invalid = [
                ...(b > 0 && b !== c ? [`${a}${P}${F(c,10)}${P}${F(b,100)}`]    : []),  // swap b↔c
                ...(b > 0            ? [`${a}${P}${F(b,10)}${P}${F(c,10)}`]     : [`${a}${P}${F(c,10)}`]),  // c/10 not c/100
                ...(b > 0            ? [`${F(a*100,100)}${P}${F(b*10,10)}${P}${F(c,100)}`] : []),  // 10b/10 = integer b
                `${a}${P}${F(b*10+c, 1000)}`,                                            // wrong power (/1000)
            ];

            // Pick 3 valid + 3 invalid, shuffle together
            const picked = shuffle([
                ...shuffle(valid).slice(0, 3).map(s => ({ s, ok: true })),
                ...shuffle(invalid).slice(0, 3).map(s => ({ s, ok: false })),
            ]);

            return {
                type: 'checkbox',
                title: `Coche toutes les décompositions correctes de ${F(N, 100)}.`,
                statements: picked.map(x => x.s),
                checkedAnswers: picked.reduce((acc, x, i) => { if (x.ok) acc.push(i); return acc; }, [])
            };
        }
    },

    // number-check: mental arithmetic on large numbers (add/subtract multiples of place values)
    // params: minVal (100000), maxVal (999999), ops (1), pvChoices, minCoef (1), maxCoef (9)
    // facile: ops=1, pvChoices=['milliers','centaines'], maxCoef=9
    // moyen:  ops=2, pvChoices=['dizaines de milliers','milliers','centaines'], maxCoef=9
    // difficile: ops=2, pvChoices=['milliers','centaines','dizaines'], minCoef=10, maxCoef=25
    calcMentalGrands: {
        generate(params = {}) {
            const PV = {
                'unités': 1, 'dizaines': 10, 'centaines': 100,
                'milliers': 1000, 'dizaines de milliers': 10000, 'centaines de milliers': 100000
            };
            // French thousands separator (non-breaking space)
            const fmtNum = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0');

            const minVal    = params.minVal ?? 100000;
            const maxVal    = params.maxVal ?? 999999;
            const opCount   = params.ops ?? 1;
            const pvChoices = params.pvChoices ?? ['milliers', 'centaines'];
            const minCoef   = params.minCoef ?? 1;
            const maxCoef   = params.maxCoef ?? 9;

            let n = rand(minVal, maxVal);
            let result = n;
            const parts = [];
            const usedPV = new Set();

            for (let i = 0; i < opCount; i++) {
                // Pick a place value not already used this exercise
                let pv;
                let attempts = 0;
                do { pv = pvChoices[rand(0, pvChoices.length - 1)]; attempts++; }
                while (usedPV.has(pv) && attempts < 20);
                usedPV.add(pv);

                const pvVal = PV[pv];
                const coef  = rand(minCoef, maxCoef);
                const canSub = result - coef * pvVal >= 0;
                const canAdd = result + coef * pvVal <= 9999999;
                const doAdd  = canSub && canAdd ? Math.random() > 0.5 : !canSub;

                result += doAdd ? coef * pvVal : -(coef * pvVal);
                parts.push(`${doAdd ? 'Ajoute' : 'Enlève'} ${coef} ${pv}`);
            }

            return {
                type: 'number-check',
                title: fmtNum(n),
                operation: parts.join(' et '),
                answers: [String(result)]
            };
        }
    },

    // Tile-select: decompose a decimal number into place-value tiles
    // params: firstPV (3=ones), lastPV (4=tenths), minComponents (1), distractors (auto)
    // PV index: 0=1000, 1=100, 2=10, 3=1, 4=0.1, 5=0.01, 6=0.001
    // facile: firstPV=3, lastPV=4  →  X,X   (e.g. 3,7)
    // moyen:  firstPV=3, lastPV=5  →  X,XX  (e.g. 4,35)
    // difficile: firstPV=2, lastPV=6 → XX,XXX (e.g. 13,035)
    decomposerDecimal: {
        generate(params = {}) {
            const PV = [1000, 100, 10, 1, 0.1, 0.01, 0.001];
            const firstPV = params.firstPV ?? 3;
            const lastPV  = params.lastPV  ?? 4;
            const pvCount = lastPV - firstPV + 1;
            const decPlaces = Math.max(0, lastPV - 3);
            const scale = Math.pow(10, decPlaces);
            const minComponents = params.minComponents ?? 1;

            // Format a place-value tile: coef × PV[pvIdx]
            const fmtTile = (coef, pvIdx) => {
                const val = coef * PV[pvIdx];
                if (Number.isInteger(val)) return String(val);
                return val.toFixed(pvIdx - 3).replace('.', ',');
            };

            // Generate digits, retrying until enough non-zero components
            let digits;
            do {
                digits = [];
                for (let k = 0; k < pvCount; k++) {
                    digits.push(k === 0 || k === pvCount - 1 ? rand(1, 9) : rand(0, 9));
                }
            } while (digits.filter(Boolean).length < minComponents);

            // Collect non-zero place-value components
            const correctTiles = [];
            for (let k = 0; k < pvCount; k++) {
                if (digits[k] > 0) correctTiles.push({ coef: digits[k], pvIdx: firstPV + k });
            }

            // Compute number string using integer arithmetic (avoids float drift)
            let numInt = 0;
            for (const { coef, pvIdx } of correctTiles) {
                numInt += coef * Math.round(PV[pvIdx] * scale);
            }
            const numStr = (numInt / scale).toFixed(decPlaces).replace('.', ',');

            // Build distractor pool: same coef shifted ±1 place, or adjacent coef same place
            const used = new Set(correctTiles.map(c => fmtTile(c.coef, c.pvIdx)));
            const distractorPool = [];
            for (const { coef, pvIdx } of correctTiles) {
                if (pvIdx > 0) {
                    const t = fmtTile(coef, pvIdx - 1);
                    if (!used.has(t)) { distractorPool.push(t); used.add(t); }
                }
                if (pvIdx < 6) {
                    const t = fmtTile(coef, pvIdx + 1);
                    if (!used.has(t)) { distractorPool.push(t); used.add(t); }
                }
                const alt = coef < 9 ? coef + 1 : coef - 1;
                const t = fmtTile(alt, pvIdx);
                if (!used.has(t)) { distractorPool.push(t); used.add(t); }
            }

            const numDist = params.distractors ?? Math.max(3, correctTiles.length);
            const selected = distractorPool.sort(() => Math.random() - 0.5).slice(0, numDist);

            const pool = [
                ...correctTiles.map(c => ({ t: fmtTile(c.coef, c.pvIdx), ok: true })),
                ...selected.map(t => ({ t, ok: false }))
            ].sort(() => Math.random() - 0.5);

            return {
                type: 'tile-select',
                title: `Coche les tuiles qui composent ${numStr}`,
                tiles: pool.map(p => p.t),
                tileAnswers: pool.map((p, i) => p.ok ? i : -1).filter(i => i !== -1)
            };
        }
    },

    // Symbolic value MCQ: which emoji combination equals the target?
    enigmeSymboles: {
        generate(params = {}) {
            const PAIRS = [
                { a: '🍎', va: 4, b: '🍊', vb: 1 },
                { a: '⭐', va: 10, b: '🌙', vb: 3 },
                { a: '🐝', va: 6, b: '🌸', vb: 2 },
                { a: '🏠', va: 7, b: '🌲', vb: 3 },
                { a: '🎯', va: 8, b: '💧', vb: 3 },
                { a: '🦋', va: 5, b: '🌈', vb: 2 },
                { a: '🐋', va: 9, b: '🐠', vb: 4 },
                { a: '🏆', va: 5, b: '🎖️', vb: 2 },
            ];
            const pair = PAIRS[rand(0, PAIRS.length - 1)];
            const { a, va, b, vb } = pair;
            const na = rand(1, 3);
            const nb = rand(0, 3);
            const target = na * va + nb * vb;
            const fmt = (n1, n2) =>
                (n1 > 0 ? a.repeat(n1) : '') +
                (n1 > 0 && n2 > 0 ? ' ' : '') +
                (n2 > 0 ? b.repeat(n2) : '');
            const correct = fmt(na, nb);
            const seen = new Set([target]);
            const candidates = [];
            for (let da = -2; da <= 2; da++) {
                for (let db = -2; db <= 2; db++) {
                    if (da === 0 && db === 0) continue;
                    const na2 = na + da, nb2 = nb + db;
                    if (na2 < 0 || nb2 < 0 || na2 > 4 || nb2 > 4) continue;
                    if (na2 === 0 && nb2 === 0) continue;
                    const val = na2 * va + nb2 * vb;
                    if (!seen.has(val)) { seen.add(val); candidates.push(fmt(na2, nb2)); }
                }
            }
            const distractors = candidates.sort(() => Math.random() - 0.5).slice(0, 3);
            const choices = [correct, ...distractors].sort(() => Math.random() - 0.5);
            return {
                type: 'mcq',
                title: `${a} vaut **${va}** et ${b} vaut **${vb}**. Quelle combinaison vaut **${target}** ?`,
                mcqChoices: choices,
                mcqAnswer: choices.indexOf(correct),
                mcqCompact: true,
                answers: [String(target)]
            };
        }
    },

    // Pyramid: addition pyramid
    // params: size (4|5), minBase (1), maxBase (20), showApex (false), hiddenCount (null=auto)
    pyramideAdditions: {
        generate(params = {}) {
            const size = params.size ?? 4;
            const minBase = params.minBase ?? 1;
            const maxBase = params.maxBase ?? 20;
            const showApex = params.showApex ?? false;

            // Build base row
            const base = [];
            for (let i = 0; i < size; i++) base.push(rand(minBase, maxBase));

            // Compute all rows bottom-up (base = index 0)
            const allRows = [base];
            for (let r = 1; r < size; r++) {
                const prev = allRows[r - 1];
                const row = [];
                for (let c = 0; c < prev.length - 1; c++) row.push(prev[c] + prev[c + 1]);
                allRows.push(row);
            }

            // Decide which cells are "given" (true = shown, false = pupil fills in)
            // Base: all given; middle: hide ~half; apex: depends on showApex
            const givenRows = allRows.map((row, r) => {
                if (r === 0) return row.map(() => true);
                if (r === allRows.length - 1) return [showApex];
                // Alternate hidden cells in middle rows
                return row.map((_, c) => c % 2 !== 0);
            });

            // Payload is apex-first (reversed)
            const rows = [...allRows].reverse();
            const given = [...givenRows].reverse();

            return { type: 'pyramid', pyramid: { rows, given } };
        }
    },

    // Clock: read analog clock
    // params: step (minute granularity: 60/30/15/5/1), minHour (1), maxHour (12)
    lireHeure: {
        generate(params = {}) {
            const step = params.step ?? 5;
            const minHour = params.minHour ?? 1;
            const maxHour = params.maxHour ?? 12;
            const hour = rand(minHour, maxHour);
            const totalSteps = Math.floor(60 / step);
            const minuteStep = rand(0, totalSteps - 1);
            const minute = minuteStep * step;
            const hStr = String(hour);
            const mStr = String(minute).padStart(2, '0');
            const hStr2 = String(hour).padStart(2, '0');
            return {
                type: 'clock',
                title: 'Quelle heure est-il ?',
                hour,
                minute,
                answers: [`${hStr}:${mStr}`, `${hStr2}:${mStr}`]
            };
        }
    },

    // Sort: order fractions
    // params: count (4), direction ('asc'), sameDenominator (true), denominator (random 4-12)
    // sameDenominator=false draws from a pool of common fractions (halves, thirds, quarters…)
    trierFractions: {
        generate(params = {}) {
            const count = params.count ?? 4;
            const direction = params.direction ?? 'asc';
            const sameDen = params.sameDenominator ?? true;

            let fracs;
            if (sameDen) {
                const denChoices = params.denominator
                    ? [params.denominator]
                    : [4, 6, 8, 10, 12];
                const den = denChoices[rand(0, denChoices.length - 1)];
                const nums = new Set();
                while (nums.size < count) nums.add(rand(1, den - 1));
                fracs = [...nums].map(n => ({ n, d: den, v: n / den }));
            } else {
                const pool = [
                    {n:1,d:2},{n:1,d:3},{n:2,d:3},{n:1,d:4},{n:3,d:4},
                    {n:1,d:6},{n:5,d:6},{n:1,d:8},{n:3,d:8},{n:5,d:8},{n:7,d:8},
                    {n:1,d:10},{n:3,d:10},{n:7,d:10},{n:9,d:10},
                ].map(f => ({...f, v: f.n / f.d}));
                fracs = pool.slice().sort(() => Math.random() - 0.5).slice(0, count);
            }

            fracs.sort((a, b) => direction === 'asc' ? a.v - b.v : b.v - a.v);
            const items = fracs.map(f => `${f.n}/${f.d}`);
            const title = direction === 'asc' ? 'Ordre croissant' : 'Ordre décroissant';
            return { type: 'sort', title, items, direction };
        }
    },

};

// Dual export: Node.js (build time) + browser (runtime)
if (typeof module !== 'undefined') module.exports = generators;
if (typeof window !== 'undefined') window.AppGenerators = generators;


