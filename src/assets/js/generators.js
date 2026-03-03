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

};

// Dual export: Node.js (build time) + browser (runtime)
if (typeof module !== 'undefined') module.exports = generators;
if (typeof window !== 'undefined') window.AppGenerators = generators;


