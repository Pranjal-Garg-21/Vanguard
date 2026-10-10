/**
 * Fund simulator for the Mutual Fund Challenge. Pure: no React, no storage.
 *
 * A fund has a unit price (the NAV). You buy units with your rupees: units = money / NAV. A lump sum buys
 * once; a SIP buys every month, so it gets more units when the NAV is low. Each fund's yearly cost is taken out
 * of its growth, so it compounds against you. An ETF also charges a small trading cost on each purchase.
 *
 * Every fund uses the SAME random draws for a given seed ("the same market"), so differences between funds
 * come from the fund (its swings and its cost), not from luck.
 */
import { assumptions } from './assumptions';
import { maxDrawdown } from './finance';
import { quantile, type Percentiles } from './montecarlo';
import { drawRegimes } from './regimes';
import { createRng, hashSeed } from './rng';
import { generateReturns, pathFromReturns } from './simulate';

export const START_NAV = 100;

export interface FundPlan {
  method: 'lump' | 'sip';
  /** The lump sum, or the amount added each month. */
  amount: number;
  years: number;
}

export interface FundRun {
  fundId: string;
  /** Unit price at month 0..months. */
  nav: number[];
  /** Units held after buying in each month (month 0..months). */
  units: number[];
  /** Units bought at the start of each month 0..months-1. */
  unitsBought: number[];
  /** What your units are worth at each month. */
  value: number[];
  invested: number[];
  finalValue: number;
  totalInvested: number;
  totalUnits: number;
  /** What the fund's yearly cost took, in rupees, compared with the same market with no yearly cost. */
  costDrag: number;
  /** What the ETF trading cost took (0 for other funds). */
  tradingCostPaid: number;
  /** Largest fall in the unit price from a peak, as a fraction. */
  maxDrawdown: number;
}

export const months = (plan: FundPlan) => Math.round(plan.years * 12);

function fundSpec(fundId: string) {
  const f = assumptions.funds[fundId];
  if (!f) throw new Error(`Unknown fund: ${fundId}`);
  return f;
}

/** Unit price path for a fund in a given market (seed + run), with or without its yearly cost. */
function navPath(fundId: string, nMonths: number, seed: number | string, run: number, withCost: boolean): number[] {
  const f = fundSpec(fundId);
  const market = createRng(hashSeed(seed, 'fund-market', run));
  const regimes = drawRegimes(nMonths, market.fork('regimes'));
  const returns = generateReturns(
    { id: fundId, meanAnnual: f.meanAnnual, volAnnual: f.volAnnual, fee: withCost ? f.costYearly : 0 },
    nMonths,
    market.fork('returns'),
    { regimes },
  );
  return pathFromReturns(returns, START_NAV);
}

/** Buys units on the plan's schedule at the given unit prices. */
function buyUnits(plan: FundPlan, nav: number[], tradingCost: number) {
  const n = months(plan);
  const unitsBought: number[] = [];
  const units: number[] = [];
  const invested: number[] = [];
  let held = 0;
  let put = 0;
  for (let m = 0; m <= n; m++) {
    const buys = plan.method === 'sip' ? m < n : m === 0;
    const bought = buys ? (plan.amount * (1 - tradingCost)) / (nav[m] || START_NAV) : 0;
    if (m < n) unitsBought.push(bought);
    held += bought;
    put += buys ? plan.amount : 0;
    units.push(held);
    invested.push(put);
  }
  return { unitsBought, units, invested };
}

export function simulateFund(fundId: string, plan: FundPlan, seed: number | string, run = 0): FundRun {
  const f = fundSpec(fundId);
  const n = months(plan);
  const tc = f.tradingCost ?? 0;
  const nav = navPath(fundId, n, seed, run, true);
  const bought = buyUnits(plan, nav, tc);
  const value = bought.units.map((u, m) => u * (nav[m] ?? 0));

  const navNoCost = navPath(fundId, n, seed, run, false);
  const noCost = buyUnits(plan, navNoCost, tc);
  const finalNoCost = (noCost.units[n] ?? 0) * (navNoCost[n] ?? 0);

  const totalInvested = bought.invested[n] ?? 0;
  return {
    fundId,
    nav,
    units: bought.units,
    unitsBought: bought.unitsBought,
    value,
    invested: bought.invested,
    finalValue: value[n] ?? 0,
    totalInvested,
    totalUnits: bought.units[n] ?? 0,
    costDrag: finalNoCost - (value[n] ?? 0),
    tradingCostPaid: totalInvested * tc,
    maxDrawdown: maxDrawdown(nav),
  };
}

/** Every fund in the same market. */
export function compareFunds(plan: FundPlan, seed: number | string): Record<string, FundRun> {
  return Object.fromEntries(Object.keys(assumptions.funds).map((id) => [id, simulateFund(id, plan, seed)]));
}

export interface FundFutures {
  percentiles: Percentiles;
  invested: number[];
  summary: { p5: number; median: number; p95: number; invested: number; lossProbability: number };
}

/** 500 other possible futures for one fund and plan. Feeds FanChart and RangeDisplay. */
export function runFundFutures(fundId: string, plan: FundPlan, seed: number | string, runs = assumptions.simulation.futuresRuns): FundFutures {
  const n = months(plan);
  const paths: number[][] = [];
  let invested: number[] = [];
  for (let r = 0; r < runs; r++) {
    const run = simulateFund(fundId, plan, seed, r + 1); // run 0 is "your market"; the futures are others
    paths.push(run.value);
    invested = run.invested;
  }
  const percentiles: Percentiles = { p5: [], p25: [], p50: [], p75: [], p95: [] };
  for (let m = 0; m <= n; m++) {
    const column = paths.map((p) => p[m] ?? 0).sort((a, b) => a - b);
    percentiles.p5.push(quantile(column, 0.05));
    percentiles.p25.push(quantile(column, 0.25));
    percentiles.p50.push(quantile(column, 0.5));
    percentiles.p75.push(quantile(column, 0.75));
    percentiles.p95.push(quantile(column, 0.95));
  }
  const totalInvested = invested[n] ?? 0;
  return {
    percentiles,
    invested,
    summary: {
      p5: percentiles.p5[n] ?? 0,
      median: percentiles.p50[n] ?? 0,
      p95: percentiles.p95[n] ?? 0,
      invested: totalInvested,
      lossProbability: paths.filter((p) => (p[n] ?? 0) < totalInvested).length / runs,
    },
  };
}

/** For a SIP: when the unit price was lowest and highest, and how many units the same rupees bought at each. */
export function sipFacts(run: FundRun) {
  const prices = run.nav.slice(0, run.unitsBought.length);
  const lowest = prices.indexOf(Math.min(...prices));
  const highest = prices.indexOf(Math.max(...prices));
  const average = prices.reduce((a, b) => a + b, 0) / prices.length;
  return {
    cheapestMonth: lowest + 1,
    dearestMonth: highest + 1,
    unitsAtCheapest: run.unitsBought[lowest] ?? 0,
    unitsAtDearest: run.unitsBought[highest] ?? 0,
    averageNav: average,
    averageCost: run.totalInvested / run.totalUnits,
  };
}
