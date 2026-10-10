import { assumptions, type Regime } from '../assumptions';
import type { Rng } from '../rng';
import { averageDriftMultiplier } from './regimes';

/** A scripted news event. `target` is an asset/company/sector id, or 'market' for everything. */
export interface Shock {
  month: number; // 1-based month in which the move lands
  target: string;
  pct: number; // 0.25 = +25%, -0.15 = -15%
  newsKey: string;
}
export type ShockSchedule = Shock[];

/** What the engine needs to know about an asset. Matches the shape in assumptions.json. */
export interface AssetSpec {
  id: string;
  meanAnnual: number;
  volAnnual: number;
  fee?: number;
}

export interface ReturnOptions {
  /** One regime per month. Omit for "always calm" (steady drift and volatility). */
  regimes?: Regime[];
  shocks?: ShockSchedule;
  /** A fictional company shuts down in this month (1-based): price collapses and stays near zero. */
  failureMonth?: number;
}

const FAILURE_MULTIPLIER = 0.02; // keeps 2% of value: a company can fail, never reach exactly 0

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

/** Monthly return series for one asset. Index 0 is month 1. */
export function generateReturns(asset: AssetSpec, months: number, rng: Rng, opts: ReturnOptions = {}): number[] {
  const { regimes: regimeTable, maxMonthlyMove } = assumptions.simulation;
  const driftNorm = averageDriftMultiplier();
  const monthlyDrift = Math.pow(1 + asset.meanAnnual, 1 / 12) - 1;
  const monthlyVol = asset.volAnnual / Math.sqrt(12);
  const monthlyFee = (asset.fee ?? 0) / 12;
  const out: number[] = [];

  for (let m = 1; m <= months; m++) {
    const regime = opts.regimes?.[m - 1] ?? 'calm';
    const drift = opts.regimes ? (monthlyDrift * regimeTable[regime].driftMult) / driftNorm : monthlyDrift;
    const vol = monthlyVol * regimeTable[regime].volMult;
    let r = drift + vol * rng.normal() - monthlyFee;

    for (const s of opts.shocks ?? []) {
      if (s.month === m && (s.target === 'market' || s.target === asset.id)) r += s.pct;
    }
    if (opts.failureMonth === m) r = FAILURE_MULTIPLIER - 1;
    out.push(opts.failureMonth === m ? r : clamp(r, -maxMonthlyMove, maxMonthlyMove));
  }
  return out;
}

/** Price path from a return series. Index 0 is the starting price. Never negative. */
export function pathFromReturns(returns: number[], startPrice = 100): number[] {
  const path = [startPrice];
  for (const r of returns) path.push(Math.max(0, path[path.length - 1] * (1 + r)));
  return path;
}

export function simulateAsset(
  asset: AssetSpec,
  months: number,
  rng: Rng,
  opts: ReturnOptions = {},
  startPrice = 100,
): number[] {
  return pathFromReturns(generateReturns(asset, months, rng, opts), startPrice);
}

/**
 * Value path of a mix held at constant weights (rebalanced every month).
 * `weights` are asset ids -> fraction, summing to 1. Each asset gets its own forked stream.
 * `monthly` is added at the start of each month (a SIP); `initial` is the lump sum at month 0.
 */
export function simulatePortfolio(
  weights: Record<string, number>,
  months: number,
  rng: Rng,
  opts: ReturnOptions & { initial?: number; monthly?: number } = {},
): { values: number[]; invested: number[] } {
  assertWeights(weights);
  const initial = opts.initial ?? 0;
  const monthly = opts.monthly ?? 0;
  const ids = Object.keys(weights);
  const series = ids.map((id) => {
    const a = assumptions.assets[id];
    if (!a) throw new Error(`Unknown asset: ${id}`);
    return generateReturns({ id, meanAnnual: a.meanAnnual, volAnnual: a.volAnnual, fee: a.fee }, months, rng.fork(id), opts);
  });

  const values = [initial];
  const invested = [initial];
  for (let m = 0; m < months; m++) {
    const portfolioReturn = ids.reduce((sum, id, i) => sum + weights[id] * series[i][m], 0);
    values.push(Math.max(0, (values[m] + monthly) * (1 + portfolioReturn)));
    invested.push(invested[m] + monthly);
  }
  return { values, invested };
}

export function assertWeights(weights: Record<string, number>): void {
  const sum = Object.values(weights).reduce((a, b) => a + b, 0);
  if (Math.abs(sum - 1) > 1e-6) throw new Error(`Weights must sum to 1, got ${sum}`);
  if (Object.values(weights).some((w) => w < 0)) throw new Error('Weights cannot be negative');
}
