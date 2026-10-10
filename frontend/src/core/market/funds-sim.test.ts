import { describe, it, expect } from 'vitest';
import { assumptions } from './assumptions';
import { compareFunds, months, runFundFutures, simulateFund, sipFacts, START_NAV, type FundPlan } from './funds-sim';

const sip: FundPlan = { method: 'sip', amount: 1000, years: 10 };
const lump: FundPlan = { method: 'lump', amount: 50000, years: 10 };
const ids = Object.keys(assumptions.funds);

describe('fund profiles', () => {
  it('every fund has a growth, a swing and a yearly cost, and the costly ones grow more before cost', () => {
    for (const id of ids) {
      const f = assumptions.funds[id]!;
      expect(f.meanAnnual).toBeGreaterThan(0);
      expect(f.volAnnual).toBeGreaterThan(0);
      expect(f.costYearly).toBeGreaterThan(0);
    }
    expect(assumptions.funds.active_growth!.meanAnnual).toBeGreaterThan(assumptions.funds.index_basket!.meanAnnual);
    expect(assumptions.funds.active_growth!.costYearly).toBeGreaterThan(assumptions.funds.index_basket!.costYearly);
  });
  it('active and sector funds are not built to win: after cost they grow about the same as the index fund', () => {
    const net = (id: string) => assumptions.funds[id]!.meanAnnual - assumptions.funds[id]!.costYearly;
    expect(Math.abs(net('active_growth') - net('index_basket'))).toBeLessThan(0.01);
    expect(Math.abs(net('sector_focus') - net('index_basket'))).toBeLessThan(0.01);
  });
});

describe('simulateFund', () => {
  it('is repeatable for a seed and different for another', () => {
    expect(simulateFund('index_basket', sip, 's')).toEqual(simulateFund('index_basket', sip, 's'));
    expect(simulateFund('index_basket', sip, 's').nav).not.toEqual(simulateFund('index_basket', sip, 't').nav);
  });

  it('starts the unit price at 100 and never lets it go negative', () => {
    const r = simulateFund('sector_focus', sip, 's');
    expect(r.nav[0]).toBe(START_NAV);
    expect(r.nav).toHaveLength(months(sip) + 1);
    for (const p of r.nav) expect(p).toBeGreaterThanOrEqual(0);
  });

  it('a lump sum buys once, at the first price, as money divided by NAV', () => {
    const r = simulateFund('index_basket', lump, 's');
    expect(r.unitsBought[0]).toBeCloseTo(50000 / START_NAV);
    expect(r.unitsBought.slice(1).every((u) => u === 0)).toBe(true);
    expect(r.totalInvested).toBe(50000);
    expect(r.finalValue).toBeCloseTo(r.totalUnits * r.nav[months(lump)]!);
  });

  it('a SIP buys every month, and more units when the price is lower', () => {
    const r = simulateFund('sector_focus', sip, 's');
    expect(r.unitsBought).toHaveLength(120);
    expect(r.totalInvested).toBe(120000);
    const f = sipFacts(r);
    expect(r.nav[f.cheapestMonth - 1]!).toBeLessThanOrEqual(r.nav[f.dearestMonth - 1]!);
    expect(f.unitsAtCheapest).toBeGreaterThanOrEqual(f.unitsAtDearest);
    // The same rupees each month, so your average cost per unit is never above the plain average price.
    expect(f.averageCost).toBeLessThanOrEqual(f.averageNav + 1e-9);
  });

  it('the yearly cost always costs you something, and a costlier fund costs more in the same market', () => {
    const cheap = simulateFund('index_basket', lump, 's');
    const dear = simulateFund('active_growth', lump, 's');
    expect(cheap.costDrag).toBeGreaterThan(0);
    expect(dear.costDrag).toBeGreaterThan(cheap.costDrag);
  });

  it('only the ETF pays a trading cost, and it shrinks the units you get', () => {
    const etf = simulateFund('index_etf', sip, 's');
    const fund = simulateFund('index_basket', sip, 's');
    expect(etf.tradingCostPaid).toBeCloseTo(120000 * assumptions.funds.index_etf!.tradingCost!);
    expect(fund.tradingCostPaid).toBe(0);
    expect(etf.unitsBought[0]).toBeLessThan(sip.amount / etf.nav[0]!);
  });

  it('a SIP puts in more trading costs than a lump sum of the same total', () => {
    const lumpAll = simulateFund('index_etf', { method: 'lump', amount: 120000, years: 10 }, 's');
    const monthly = simulateFund('index_etf', sip, 's');
    expect(monthly.tradingCostPaid).toBeCloseTo(lumpAll.tradingCostPaid);
    // same total put in, so the same cost rate: the point is it is paid 120 times, not once
    expect(monthly.unitsBought.filter((u) => u > 0).length).toBe(120);
  });
});

describe('compareFunds', () => {
  it('runs every fund in the same market: same regimes and shocks, so a calmer fund swings less', () => {
    const all = compareFunds(lump, 's');
    expect(Object.keys(all).sort()).toEqual([...ids].sort());
    expect(all.sector_focus!.maxDrawdown).toBeGreaterThan(all.index_basket!.maxDrawdown);
  });
  it('the two index-style funds see the same market, so they end close together', () => {
    const all = compareFunds(lump, 's');
    const gap = Math.abs(all.index_basket!.finalValue - all.index_etf!.finalValue) / all.index_basket!.finalValue;
    expect(gap).toBeLessThan(0.1);
  });
});

describe('runFundFutures', () => {
  const f = runFundFutures('index_basket', sip, 's', 200);
  it('is ordered and repeatable', () => {
    const s = f.summary;
    expect(s.p5).toBeLessThanOrEqual(s.median);
    expect(s.median).toBeLessThanOrEqual(s.p95);
    expect(runFundFutures('index_basket', sip, 's', 200).summary).toEqual(s);
    expect(s.invested).toBe(120000);
  });
  it('a bumpier fund has a wider range', () => {
    const wild = runFundFutures('sector_focus', sip, 's', 200).summary;
    expect((wild.p95 - wild.p5) / wild.median).toBeGreaterThan((f.summary.p95 - f.summary.p5) / f.summary.median);
  });
  it('runs fast enough for a phone (200 futures of 10 years)', () => {
    const t0 = performance.now();
    runFundFutures('active_growth', sip, 'speed', 200);
    expect(performance.now() - t0).toBeLessThan(2000);
  });
});
