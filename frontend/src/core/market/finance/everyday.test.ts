import { describe, it, expect } from 'vitest';
import * as f from './index';

describe('everyday money formulas', () => {
  it('percentOf, monthsToGoal and coverMonths', () => {
    expect(f.percentOf(3000, 10000)).toBeCloseTo(0.3);
    expect(f.monthsToGoal(6000, 500)).toBe(12);
    expect(f.monthsToGoal(6001, 500)).toBe(13);
    expect(f.coverMonths(30000, 10000)).toBe(3);
    expect(() => f.monthsToGoal(100, 0)).toThrow();
  });
  it('emi: 1,00,000 at 12% for 12 months is about 8,885', () => {
    expect(f.emi(100000, 0.12, 12)).toBeCloseTo(8884.88, 1);
    expect(f.emi(12000, 0, 12)).toBe(1000);
    expect(f.loanInterest(100000, 0.12, 12)).toBeCloseTo(6618.5, 0);
  });
  it('a flat rate hides a much higher real rate', () => {
    // 10% flat for 2 years on 1,00,000: pay 1,20,000 back = 5,000 a month.
    expect(f.flatEmi(100000, 0.1, 2)).toBeCloseTo(5000);
    const real = f.flatToReal(100000, 0.1, 2);
    expect(real).toBeGreaterThan(0.17);
    expect(real).toBeLessThan(0.2);
    expect(f.emi(100000, real, 24)).toBeCloseTo(5000, 0);
  });
  it('card balance: paying more clears it sooner and costs less', () => {
    const slow = f.monthsToClear(20000, 0.36, 800);
    const fast = f.monthsToClear(20000, 0.36, 2000);
    expect(fast).toBeLessThan(slow);
    expect(f.interestToClear(20000, 0.36, 2000)).toBeLessThan(f.interestToClear(20000, 0.36, 800));
    expect(() => f.monthsToClear(20000, 0.36, 500)).toThrow();
  });
});
