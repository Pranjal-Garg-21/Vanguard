import { describe, expect, it } from 'vitest';
import {
  EXPLORE_WIDGETS,
  VISUALS,
  bondPriceAt,
  bondSchedule,
  fallAndRise,
  growthSeries,
  inflationCups,
  lenderOutcomes,
  positionOutcome,
  startEarlyResult,
} from './explore';

describe('fallAndRise', () => {
  it('a 50% fall needs a 100% rise, and an equal rise only gets back to 75%', () => {
    const r = fallAndRise(1000, 0.5);
    expect(r.afterFall).toBe(500);
    expect(r.needGain).toBeCloseTo(1);
    expect(r.afterSameRise).toBeCloseTo(750);
  });
  it('no fall means nothing to recover', () => {
    const r = fallAndRise(1000, 0);
    expect(r.afterFall).toBe(1000);
    expect(r.needGain).toBe(0);
  });
  it('the rise needed always exceeds the fall, and grows faster the bigger the fall', () => {
    let last = 0;
    for (const fall of [0.1, 0.2, 0.3, 0.5, 0.7, 0.9]) {
      const { needGain } = fallAndRise(1000, fall);
      expect(needGain).toBeGreaterThan(fall);
      expect(needGain).toBeGreaterThan(last);
      last = needGain;
    }
  });
  it('clamps silly input so the slider can never divide by zero', () => {
    expect(Number.isFinite(fallAndRise(1000, 1).needGain)).toBe(true);
    expect(Number.isFinite(fallAndRise(1000, 2).needGain)).toBe(true);
    expect(fallAndRise(1000, -1).afterFall).toBe(1000);
  });
});

describe('growthSeries', () => {
  const s = growthSeries(10000, 0.08, 10);
  it('has a point for every year from 0 to the end', () => {
    expect(s).toHaveLength(11);
    expect(s[0]).toEqual({ year: 0, simple: 10000, compound: 10000 });
  });
  it('matches the lesson numbers at year 10', () => {
    expect(s[10]!.simple).toBeCloseTo(18000);
    expect(s[10]!.compound).toBeCloseTo(21589.25, 1);
  });
  it('compound is never below simple, and the gap only widens', () => {
    let gap = 0;
    for (const p of s) {
      expect(p.compound).toBeGreaterThanOrEqual(p.simple - 1e-9);
      expect(p.compound - p.simple).toBeGreaterThanOrEqual(gap - 1e-9);
      gap = p.compound - p.simple;
    }
  });
});

describe('startEarlyResult', () => {
  it('starting at 18 vs 28, saving 500 a month at 10% until 58', () => {
    const early = startEarlyResult(500, 0.1, 18, 58);
    const late = startEarlyResult(500, 0.1, 28, 58);
    expect(early.putIn).toBe(240000);
    expect(late.putIn).toBe(180000);
    expect(early.finalAmount / late.finalAmount).toBeGreaterThan(2.5);
    expect(late.finalAmount / early.finalAmount).toBeLessThan(0.5);
  });
  it('starting at the stop age saves nothing, and later never beats earlier', () => {
    expect(startEarlyResult(500, 0.1, 58, 58).finalAmount).toBe(0);
    expect(startEarlyResult(500, 0.1, 70, 58).months).toBe(0);
    let last = Infinity;
    for (const age of [18, 22, 26, 30, 34, 38]) {
      const r = startEarlyResult(500, 0.1, age, 58).finalAmount;
      expect(r).toBeLessThan(last);
      last = r;
    }
  });
});

describe('inflationCups', () => {
  it('chai at 20 rupees, 6% inflation: 36 rupees in 10 years, 50 cups become 27', () => {
    const r = inflationCups(20, 0.06, 10, 1000);
    expect(r.futurePrice).toBeCloseTo(35.82, 1);
    expect(r.cupsNow).toBe(50);
    expect(r.cupsThen).toBe(27);
  });
  it('zero years or zero inflation changes nothing, and more of either buys fewer cups', () => {
    expect(inflationCups(20, 0.06, 0, 1000).cupsThen).toBe(50);
    expect(inflationCups(20, 0, 30, 1000).cupsThen).toBe(50);
    expect(inflationCups(20, 0.06, 20, 1000).cupsThen).toBeLessThan(inflationCups(20, 0.06, 10, 1000).cupsThen);
    expect(inflationCups(20, 0.08, 10, 1000).cupsThen).toBeLessThan(inflationCups(20, 0.04, 10, 1000).cupsThen);
  });
});

describe('lenderOutcomes', () => {
  it('lend 1,000 at 10%: +100 if paid; if the borrower fails and 40% comes back, -600', () => {
    const r = lenderOutcomes(1000, 0.1, 0.4);
    expect(r.gainIfPaid).toBeCloseTo(100);
    expect(r.backIfPaid).toBeCloseTo(1100);
    expect(r.backIfFails).toBeCloseTo(400);
    expect(r.netIfFails).toBeCloseTo(-600);
  });
  it('full recovery means no loss; the promised rate never changes the loss', () => {
    expect(lenderOutcomes(1000, 0.1, 1).netIfFails).toBeCloseTo(0);
    expect(lenderOutcomes(1000, 0.4, 0.4).netIfFails).toBeCloseTo(lenderOutcomes(1000, 0.05, 0.4).netIfFails);
  });
  it('clamps recovery to 0..1', () => {
    expect(lenderOutcomes(1000, 0.1, 2).netIfFails).toBeCloseTo(0);
    expect(lenderOutcomes(1000, 0.1, -1).netIfFails).toBeCloseTo(-1000);
  });
});

describe('bondSchedule', () => {
  it('6% coupon on 10,000 for 2 years: 600 a year, 11,200 in total', () => {
    const r = bondSchedule(10000, 0.06, 2);
    expect(r.payments).toEqual([600, 10600]);
    expect(r.yearlyInterest).toBe(600);
    expect(r.total).toBe(11200);
  });
});

describe('bondPriceAt', () => {
  it('worth less than face when market rates are higher, more when lower, equal when the same', () => {
    expect(bondPriceAt(10000, 0.07, 0.09, 2).price).toBeCloseTo(9648, 0);
    expect(bondPriceAt(10000, 0.07, 0.09, 2).difference).toBeLessThan(0);
    expect(bondPriceAt(10000, 0.07, 0.05, 2).difference).toBeGreaterThan(0);
    expect(bondPriceAt(10000, 0.07, 0.07, 2).difference).toBeCloseTo(0);
  });
});

describe('positionOutcome', () => {
  it('10 shares at 100, up 12%, 2 dividend, 0.5% fee: profit 135', () => {
    const r = positionOutcome(10, 100, 0.12, 2, 0.005);
    expect(r.nowPrice).toBeCloseTo(112);
    expect(r.spent).toBe(1000);
    expect(r.fee).toBeCloseTo(5);
    expect(r.valueNow).toBeCloseTo(1120);
    expect(r.dividend).toBe(20);
    expect(r.profit).toBeCloseTo(135);
  });
  it('a price fall can make the whole position a loss even with a dividend', () => {
    expect(positionOutcome(10, 100, -0.1, 2, 0.005).profit).toBeLessThan(0);
  });
});

describe('format lists', () => {
  it('have no duplicates', () => {
    expect(new Set(EXPLORE_WIDGETS).size).toBe(EXPLORE_WIDGETS.length);
    expect(new Set(VISUALS).size).toBe(VISUALS.length);
  });
});
