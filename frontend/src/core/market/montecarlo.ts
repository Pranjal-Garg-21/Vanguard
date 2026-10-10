import { assumptions } from './assumptions';
import { drawRegimes } from './regimes';
import { assertWeights, simulatePortfolio, type ShockSchedule } from './simulate';
import { createRng, hashSeed } from './rng';

export interface FuturesInput {
  /** Asset id -> fraction of the money, summing to 1. */
  weights: Record<string, number>;
  months: number;
  seed: number | string;
  /** Lump sum at month 0. */
  initial?: number;
  /** Added at the start of every month (a SIP). */
  monthly?: number;
  /** Defaults to assumptions.simulation.futuresRuns (500). */
  runs?: number;
  shocks?: ShockSchedule;
  /** Set false to ignore calm/boom/crash moods (steady drift and volatility only). */
  useRegimes?: boolean;
}

export interface Percentiles {
  p5: number[];
  p25: number[];
  p50: number[];
  p75: number[];
  p95: number[];
}

export interface FuturesResult {
  /** Value of every run at every month; paths[run][month]. */
  paths: number[][];
  /** Per-month percentile bands, index 0 = month 0. Feed straight into FanChart. */
  percentiles: Percentiles;
  /** Money put in at each month (for the "amount you put in" line). */
  invested: number[];
  summary: {
    /** Final-value bad case, middle and good case across the futures. */
    p5: number;
    median: number;
    p95: number;
    invested: number;
    /** Share of futures (0-1) that ended below the amount put in. */
    lossProbability: number;
  };
}

/** Value at fraction q (0-1) of an ascending-sorted array, interpolating between neighbours. */
export function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) throw new Error('empty');
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  const a = sorted[lo] ?? 0;
  const b = sorted[hi] ?? 0;
  return a + (b - a) * (pos - lo);
}

export function runFutures(input: FuturesInput): FuturesResult {
  assertWeights(input.weights);
  const runs = input.runs ?? assumptions.simulation.futuresRuns;
  const { months } = input;
  const useRegimes = input.useRegimes ?? true;

  const paths: number[][] = [];
  let invested: number[] = [];

  for (let run = 0; run < runs; run++) {
    const rng = createRng(hashSeed(input.seed, 'future', run));
    const regimes = useRegimes ? drawRegimes(months, rng.fork('regimes')) : undefined;
    const result = simulatePortfolio(input.weights, months, rng.fork('assets'), {
      initial: input.initial,
      monthly: input.monthly,
      shocks: input.shocks,
      regimes,
    });
    paths.push(result.values);
    invested = result.invested; // identical for every run
  }

  const percentiles: Percentiles = { p5: [], p25: [], p50: [], p75: [], p95: [] };
  for (let m = 0; m <= months; m++) {
    const column = paths.map((p) => p[m] ?? 0).sort((a, b) => a - b);
    percentiles.p5.push(quantile(column, 0.05));
    percentiles.p25.push(quantile(column, 0.25));
    percentiles.p50.push(quantile(column, 0.5));
    percentiles.p75.push(quantile(column, 0.75));
    percentiles.p95.push(quantile(column, 0.95));
  }

  const totalInvested = invested[months] ?? 0;
  const finals = paths.map((p) => p[months] ?? 0);
  return {
    paths,
    percentiles,
    invested,
    summary: {
      p5: percentiles.p5[months] ?? 0,
      median: percentiles.p50[months] ?? 0,
      p95: percentiles.p95[months] ?? 0,
      invested: totalInvested,
      lossProbability: finals.filter((v) => v < totalInvested).length / runs,
    },
  };
}
