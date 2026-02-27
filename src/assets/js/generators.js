/**
 * Shared generators — single source for both Node.js (build) and browser (runtime).
 * Each generator returns a seriesPlayer-compatible exercise item.
 */
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

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
    }
};

// Dual export: Node.js (build time) + browser (runtime)
if (typeof module !== 'undefined') module.exports = generators;
if (typeof window !== 'undefined') window.AppGenerators = generators;
