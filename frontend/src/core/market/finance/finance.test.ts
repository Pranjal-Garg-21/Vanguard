import { describe, it, expect } from 'vitest';
import * as f from './index';

describe('4.1 profit, loss, return', () => {
  it('computes profit and percentage return', () => {
    expect(f.profit(1000, 1150)).toBe(150);
    expect(f.returnPct(1000, 1150)).toBeCloseTo(0.15);
    expect(f.returnPct(1000, 900)).toBeCloseTo(-0.1);
  });
  it('subtracts fees and adds income in a position', () => {
    // Lesson 6: 10 shares bought at 100, now 112, dividend 2/share, fee 10 => 130
    expect(f.positionProfit(10, 100, 112, 2, 10)).toBe(130);
  });
  it('breakevenGain: a 50% loss needs a 100% gain', () => {
    expect(f.breakevenGain(0.5)).toBeCloseTo(1);
    expect(f.breakevenGain(0.25)).toBeCloseTo(1 / 3);
    expect(() => f.breakevenGain(1)).toThrow();
  });
  it('-50% then +50% leaves you 25% down', () => {
    expect(1000 * 0.5 * 1.5).toBe(750);
  });
  it('maxDrawdown finds the biggest peak-to-trough fall', () => {
    expect(f.maxDrawdown([100, 120, 90, 110])).toBeCloseTo(0.25);
    expect(f.maxDrawdown([1, 2, 3])).toBe(0);
  });
});

describe('4.2 interest', () => {
  it('simple vs compound: 10,000 at 8% for 10 years', () => {
    expect(f.simpleAmount(10000, 0.08, 10)).toBeCloseTo(18000);
    expect(f.compoundAmount(10000, 0.08, 10)).toBeCloseTo(21589.25, 1);
    expect(f.interestOnInterest(10000, 0.08, 10)).toBeCloseTo(3589.25, 1);
  });
  it('compound is never less than simple for t >= 1', () => {
    for (const rate of [0.01, 0.05, 0.1, 0.2]) {
      for (const years of [1, 2, 5, 10, 30]) {
        expect(f.compoundAmount(1000, rate, years)).toBeGreaterThanOrEqual(f.simpleAmount(1000, rate, years) - 1e-9);
      }
    }
  });
  it('more frequent compounding never gives less', () => {
    expect(f.compoundAmount(1000, 0.1, 5, 12)).toBeGreaterThan(f.compoundAmount(1000, 0.1, 5, 1));
  });
  it('SIP: 500 a month for 10 years at 10%', () => {
    const fv = f.futureValueMonthly(500, 0.1, 120);
    expect(fv).toBeGreaterThan(102000);
    expect(fv).toBeLessThan(103000);
    expect(f.totalContributed(500, 120)).toBe(60000);
    expect(f.futureValueMonthly(500, 0, 12)).toBe(6000);
  });
  it('starting early beats starting late with the same monthly amount', () => {
    const early = f.futureValueMonthly(500, 0.1, 40 * 12); // age 18 to 58
    const late = f.futureValueMonthly(500, 0.1, 30 * 12); // age 28 to 58
    expect(early).toBeGreaterThan(late * 2);
  });
  it('Rule of 72 and exact doubling agree closely', () => {
    expect(f.ruleOf72(8)).toBe(9);
    expect(f.doublingYears(0.08)).toBeCloseTo(9.006, 2);
    expect(() => f.ruleOf72(0)).toThrow();
  });
  it('effective rate of 12% compounded monthly', () => {
    expect(f.effectiveRate(0.12, 12)).toBeCloseTo(0.12683, 4);
  });
});

describe('4.3 inflation and real return', () => {
  it('chai: 20 rupees becomes about 35.8 after 10 years at 6%', () => {
    const price = f.inflate(20, 0.06, 10);
    expect(price).toBeCloseTo(35.82, 1);
    // 1,000 rupees buys 50 cups today but only about 27 whole cups then
    expect(f.unitsAffordable(1000, 20)).toBe(50);
    expect(f.unitsAffordable(1000, price)).toBe(27);
  });
  it('realValue is the inverse of inflate', () => {
    expect(f.realValue(f.inflate(1234, 0.06, 7), 0.06, 7)).toBeCloseTo(1234);
  });
  it('4% earned with 6% inflation is a negative real return', () => {
    expect(f.realReturn(0.04, 0.06)).toBeCloseTo(-0.0189, 3);
    expect(f.realReturnApprox(0.04, 0.06)).toBeCloseTo(-0.02);
  });
});

describe('4.5 bonds', () => {
  it('3 years, 7% coupon on 10,000 pays 12,100 in total', () => {
    expect(f.couponSchedule(10000, 0.07, 3)).toEqual([700, 700, 10700]);
    expect(f.bondValueAtMaturity(10000, 0.07, 3)).toBe(12100);
  });
  it('price equals face value when market rate equals coupon', () => {
    expect(f.bondPrice(10000, 0.07, 0.07, 3)).toBeCloseTo(10000);
  });
  it('price falls when market rates rise, and rises when they fall', () => {
    const higher = f.bondPrice(10000, 0.07, 0.09, 3);
    expect(higher).toBeGreaterThan(9490);
    expect(higher).toBeLessThan(9500);
    expect(f.bondPrice(10000, 0.07, 0.05, 3)).toBeGreaterThan(10000);
  });
  it('default loss', () => {
    expect(f.defaultLoss(10000, 0.4)).toBeCloseTo(6000);
  });
});

describe('4.6 stocks', () => {
  it('market cap, dividend, fee, spread', () => {
    expect(f.marketCap(100, 1000)).toBe(100000);
    expect(f.dividendIncome(10, 2)).toBe(20);
    expect(f.tradeFee(1000, 0.005)).toBe(5);
    expect(f.spread(99, 101)).toBe(2);
  });
  it('a cheap share can be a bigger company than an expensive one', () => {
    expect(f.marketCap(10, 1_000_000)).toBeGreaterThan(f.marketCap(5000, 100));
  });
});

describe('4.9 funds', () => {
  it('NAV and units', () => {
    expect(f.navPerUnit(1_000_000, 10_000)).toBe(100);
    expect(f.unitsBought(1000, 50)).toBe(20);
  });
  it('rupee cost averaging buys more units when NAV is low', () => {
    const r = f.rupeeCostAveraging([100, 50, 100], 1000);
    expect(r.unitsPerMonth).toEqual([10, 20, 10]);
    expect(r.totalUnits).toBe(40);
    expect(r.totalInvested).toBe(3000);
    expect(r.averageCostPerUnit).toBe(75);
    expect(r.averageCostPerUnit).toBeLessThan(r.averageNav);
  });
  it('a higher yearly fee always costs more', () => {
    const low = f.feeDragLumpSum(10000, 0.1, 0.005, 10);
    const high = f.feeDragLumpSum(10000, 0.1, 0.02, 10);
    expect(high.feeCost).toBeGreaterThan(low.feeCost);
    expect(high.net).toBeLessThan(low.net);
  });
  it('1.5 percentage points of fee on a 500/month SIP costs about 8,000 over 10 years', () => {
    const cheap = f.futureValueMonthly(500, 0.095, 120);
    const costly = f.futureValueMonthly(500, 0.08, 120);
    expect(cheap - costly).toBeGreaterThan(7500);
    expect(cheap - costly).toBeLessThan(8700);
  });
  it('feeDragMonthly: net is below no-fee', () => {
    const r = f.feeDragMonthly(500, 0.1, 0.02, 120);
    expect(r.net).toBeLessThan(r.noFee);
    expect(r.feeCost).toBeCloseTo(r.noFee - r.net);
  });
});

describe('4.11 gold', () => {
  it('12% making charge needs about a 13.6% rise to break even', () => {
    expect(f.makingChargeAmount(60000, 0.12)).toBe(7200);
    expect(f.makingChargeBreakeven(0.12)).toBeCloseTo(0.13636, 4);
  });
  it('resale deduction and purity', () => {
    expect(f.resaleValue(50000, 0.1)).toBe(45000);
    expect(f.purity(22)).toBeCloseTo(0.9167, 3);
  });
});

describe('round2', () => {
  it('rounds to paise', () => {
    expect(f.round2(1.005)).toBe(1.01);
    expect(f.round2(2.345678)).toBe(2.35);
  });
});
