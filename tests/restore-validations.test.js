import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { changedLines, onlyMatches } = require('../scripts/restore-validations.js');

const diff = (...lines) => ['diff --git a/x.md b/x.md', '--- a/x.md', '+++ b/x.md', '@@ -4 +4 @@', ...lines].join('\n');
const OPERATION = /^\s*operation:/;

describe('restore --only: every changed line must match', () => {
  it('reads the changed lines, not the file headers, and ignores blank lines', () => {
    expect(changedLines(diff('-operation: "3 + 2 = 5"', '+operation: "3 + 2 = 5 pommes"', '+'))).toEqual([
      'operation: "3 + 2 = 5"',
      'operation: "3 + 2 = 5 pommes"',
    ]);
  });
  it('accepts a hidden-line edit, refuses anything else', () => {
    expect(onlyMatches(diff('+    operation: "9 + 4 = 13"'), OPERATION)).toBe(true);
    expect(onlyMatches(diff('+operation: "3 + 2 = 5"', '-title: "A"', '+title: "B"'), OPERATION)).toBe(false);
    expect(onlyMatches(diff(), OPERATION)).toBe(false); // nothing changed: nothing to restore
  });
});
