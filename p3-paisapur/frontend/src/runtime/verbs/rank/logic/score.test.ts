import { describe, expect, it } from 'vitest';

import { bestOrder, countInversions, scoreOrder, type RankItem } from './score';

/** The four borrowing options from UC-BR-01. */
const debt: RankItem[] = [
  { id: 'family', textKey: 'd.family', value: 2000 },
  { id: 'bnpl', textKey: 'd.bnpl', value: 2400 },
  { id: 'moneylender', textKey: 'd.ml', value: 2600 },
  { id: 'loan_app', textKey: 'd.app', value: 3100 },
];

describe('rank scoring', () => {
  it('orders cheapest first', () => {
    expect(bestOrder(debt, 'asc')).toEqual(['family', 'bnpl', 'moneylender', 'loan_app']);
  });

  it('scores a perfect order as 1 with no inversions', () => {
    const r = scoreOrder(['family', 'bnpl', 'moneylender', 'loan_app'], debt, 'asc', 1000);
    expect(r.inversions).toBe(0);
    expect(r.accuracy).toBe(1);
    expect(r.topPickExtraCost).toBe(0);
  });

  it('scores a fully reversed order as 0', () => {
    const r = scoreOrder(['loan_app', 'moneylender', 'bnpl', 'family'], debt, 'asc', 1000);
    expect(r.inversions).toBe(6);
    expect(r.maxInversions).toBe(6);
    expect(r.accuracy).toBe(0);
    // Their top pick costs ₹1,100 more than the cheapest.
    expect(r.topPickExtraCost).toBe(1100);
  });

  it('gives partial credit for one swap rather than zero', () => {
    const r = scoreOrder(['bnpl', 'family', 'moneylender', 'loan_app'], debt, 'asc', 1000);
    expect(r.inversions).toBe(1);
    expect(r.accuracy).toBeGreaterThan(0.8);
    expect(r.accuracy).toBeLessThan(1);
    expect(r.topPickExtraCost).toBe(400);
  });

  it('never counts equal-value items as inverted', () => {
    const tie: RankItem[] = [
      { id: 'a', textKey: 'a', value: 500 },
      { id: 'b', textKey: 'b', value: 500 },
    ];
    expect(countInversions(['b', 'a'], tie, 'asc')).toBe(0);
  });

  it('handles an empty order without throwing', () => {
    const r = scoreOrder([], [], 'asc', 0);
    expect(r.accuracy).toBe(1);
    expect(r.topPickExtraCost).toBe(0);
  });
});
