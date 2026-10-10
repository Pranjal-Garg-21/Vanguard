import { describe, it, expect } from 'vitest';
import { fillTemplate, formatRupees, formatValue, placeholders, runCalcs } from '../../src/games/investing/lessons/calc';

describe('formatting', () => {
  it('uses Indian digit grouping', () => {
    expect(formatRupees(1234567)).toBe('₹12,34,567');
    expect(formatRupees(21589.25)).toBe('₹21,589');
    expect(formatRupees(100000)).toBe('₹1,00,000');
  });
  it('shows paise when asked, and a minus sign before the rupee symbol', () => {
    expect(formatRupees(70.5, 2)).toBe('₹70.50');
    expect(formatRupees(-50)).toBe('-₹50');
  });
  it('percent takes a fraction', () => {
    expect(formatValue(0.08, 'percent')).toBe('8%');
    expect(formatValue(-0.0187, 'percent', 1)).toBe('-1.9%');
  });
});

describe('runCalcs', () => {
  it('runs finance functions with vars and earlier calcs', () => {
    const ctx = runCalcs(
      { P: { value: 10000, fmt: 'rupees' }, r: { value: 0.08, fmt: 'percent' }, years: { value: 10 } },
      [
        { id: 'simple', fn: 'simpleAmount', args: ['$P', '$r', '$years'], fmt: 'rupees' },
        { id: 'comp', fn: 'compoundAmount', args: ['$P', '$r', '$years'], fmt: 'rupees' },
        { id: 'extra', fn: 'sub', args: ['$comp', '$simple'], fmt: 'rupees' },
      ],
    );
    expect(ctx.simple.text).toBe('₹18,000');
    expect(ctx.comp.text).toBe('₹21,589');
    expect(ctx.extra.text).toBe('₹3,589');
    expect(ctx.r.text).toBe('8%');
  });
  it('rejects unknown functions, unknown references and later references', () => {
    expect(() => runCalcs({}, [{ id: 'x', fn: 'noSuchFn', args: [1] }])).toThrow(/Unknown calc function/);
    expect(() => runCalcs({}, [{ id: 'x', fn: 'add', args: ['$nope', 1] }])).toThrow(/unknown or later/);
    expect(() =>
      runCalcs({}, [
        { id: 'a', fn: 'add', args: ['$b', 1] },
        { id: 'b', fn: 'add', args: [1, 1] },
      ]),
    ).toThrow();
  });
});

describe('templates', () => {
  it('fills placeholders and finds them', () => {
    const ctx = runCalcs({ a: { value: 1500, fmt: 'rupees' } });
    expect(fillTemplate('You have {a}.', ctx)).toBe('You have ₹1,500.');
    expect(placeholders('{a} and {b_2}')).toEqual(['a', 'b_2']);
  });
  it('throws on an unknown placeholder so a typo never reaches a student', () => {
    expect(() => fillTemplate('{missing}', {})).toThrow(/Unknown placeholder/);
  });
});
