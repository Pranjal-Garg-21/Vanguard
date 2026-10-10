import { runFutures, type FuturesResult } from '@/core/market';
import type { InsightFacts } from './insight';
import { toWeights, type Mix } from './mix';

export interface TimeMachineParams {
  years: number;
  initial: number;
  monthly: number;
  mix: Mix;
  /** Goal amount in rupees. */
  target: number;
}

export interface TimeMachineRun {
  futures: FuturesResult;
  facts: InsightFacts;
}

/** Same seed + same choices = same 500 futures, so moving one slider shows only that slider's effect. */
export function runTimeMachine(p: TimeMachineParams, seed: number | string = 'time-machine'): TimeMachineRun {
  const months = Math.round(p.years * 12);
  const futures = runFutures({ weights: toWeights(p.mix), months, seed, initial: p.initial, monthly: p.monthly });
  const finals = futures.paths.map((path) => path[months] ?? 0);
  const { p5, invested, lossProbability } = futures.summary;
  return {
    futures,
    facts: {
      years: p.years,
      steadyShare: p.mix.steady_box,
      bumpyShare: p.mix.bumpy_ride,
      lossChance: lossProbability,
      goalChance: finals.filter((v) => v >= p.target).length / finals.length,
      p5BelowInvested: p5 < invested,
    },
  };
}
