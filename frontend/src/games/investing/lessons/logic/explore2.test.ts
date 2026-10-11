import { describe, it, expect } from 'vitest';
import { cashSpeed, etfBuy, feeCompare, goldOutcome, horizonRange, pyramidGrowth, sipUnits } from './explore';

describe('sipUnits', () => {
  it('buys more units when the price is low, and the average cost beats the plain average price', () => {
    const r = sipUnits(2000, [100, 80, 125, 100]);
    expect(r.units).toEqual([20, 25, 16, 20]);
    expect(r.totalUnits).toBe(81);
    expect(r.averageCost).toBeLessThan(r.averageNav);
  });
});

describe('feeCompare', () => {
  it('a higher yearly fee costs real money over ten years', () => {
    const r = feeCompare(1000, 0.1, 10, 0.005, 0.02);
    expect(r.putIn).toBe(120000);
    expect(Math.round(r.gap)).toBe(16135);
    expect(r.a).toBeGreaterThan(r.b);
  });
  it('equal fees give no gap', () => {
    expect(feeCompare(1000, 0.1, 10, 0.01, 0.01).gap).toBeCloseTo(0);
  });
});

describe('etfBuy', () => {
  it('units depend on the price you buy at, and the ETF has a trading cost', () => {
    const r = etfBuy(10000, 101, 99, 0.001);
    expect(r.etfUnits).toBeCloseTo(101.0101, 3);
    expect(r.fundUnits).toBeCloseTo(99.0099, 3);
    expect(r.etfCost).toBeCloseTo(10);
  });
});

describe('goldOutcome', () => {
  it('a 12% making charge needs about a 13.6% rise to get your money back', () => {
    const flat = goldOutcome(60000, 0.12, 0);
    expect(flat.chargePaid).toBeCloseTo(7200);
    expect(flat.result).toBeCloseTo(-7200);
    expect(flat.breakeven).toBeCloseTo(0.13636, 4);
    expect(goldOutcome(60000, 0.12, flat.breakeven).result).toBeCloseTo(0, 6);
    expect(goldOutcome(60000, 0.12, 0.1).sellValue).toBeCloseTo(58080);
  });
});

describe('cashSpeed', () => {
  it('property is slow and costs a share of the money', () => {
    const p = cashSpeed(100000, 'property');
    expect(p.days).toBe(90);
    expect(p.received).toBeCloseTo(94000);
    expect(cashSpeed(100000, 'steady_box').received).toBe(100000);
  });
  it('rejects an unknown asset', () => {
    expect(() => cashSpeed(100, 'nope')).toThrow();
  });
});

describe('horizonRange (what the time-horizon room says about waiting)', () => {
  const short = horizonRange(10000, 'bumpy_ride', 1);
  const long = horizonRange(10000, 'bumpy_ride', 20);
  it('is repeatable', () => {
    expect(horizonRange(10000, 'bumpy_ride', 5)).toEqual(horizonRange(10000, 'bumpy_ride', 5));
  });
  it('waiting shrinks the chance of ending below what you put in, but never makes it zero', () => {
    expect(long.lossChance).toBeLessThan(short.lossChance);
    expect(long.lossChance).toBeGreaterThan(0);
  });
  it('waiting widens the range in rupees', () => {
    expect(long.high - long.low).toBeGreaterThan(short.high - short.low);
  });
  it('a bumpier path has a wider range at the same wait', () => {
    const steady = horizonRange(10000, 'steady_box', 5);
    const bumpy = horizonRange(10000, 'bumpy_ride', 5);
    expect(bumpy.high - bumpy.low).toBeGreaterThan(steady.high - steady.low);
  });
});

describe('pyramidGrowth', () => {
  it('3 recruits each: 729 at level 6, 1,093 in all, and it outgrows a town of 10,000 by level 9', () => {
    expect(pyramidGrowth(3, 6)).toEqual({ atLevel: 729, total: 1093 });
    expect(pyramidGrowth(3, 8).total).toBeLessThan(10000);
    expect(pyramidGrowth(3, 9).total).toBeGreaterThan(10000);
  });
  it('one recruit each is a line, not a pyramid', () => {
    expect(pyramidGrowth(1, 4)).toEqual({ atLevel: 1, total: 5 });
  });
});
