import { assumptions, type Regime } from './assumptions';
import type { Rng } from './rng';

const REGIMES: Regime[] = ['calm', 'boom', 'crash'];

/** Long-run share of time spent in each regime (power iteration on the transition table). */
export function stationaryDistribution(
  transitions: Record<Regime, Record<Regime, number>> = assumptions.simulation.regimeTransitions,
): Record<Regime, number> {
  let dist: Record<Regime, number> = { calm: 1, boom: 0, crash: 0 };
  for (let i = 0; i < 500; i++) {
    const nextDist: Record<Regime, number> = { calm: 0, boom: 0, crash: 0 };
    for (const from of REGIMES) {
      for (const to of REGIMES) nextDist[to] += dist[from] * transitions[from][to];
    }
    dist = nextDist;
  }
  return dist;
}

/**
 * Average drift multiplier over the long run. The engine divides drift by this so that
 * the long-run average return matches the number shown in the Assumptions drawer.
 */
export function averageDriftMultiplier(): number {
  if (cachedDriftMultiplier === null) {
    const dist = stationaryDistribution();
    const { regimes } = assumptions.simulation;
    cachedDriftMultiplier = REGIMES.reduce((sum, r) => sum + dist[r] * regimes[r].driftMult, 0);
  }
  return cachedDriftMultiplier;
}

// assumptions.json is fixed at build time, so this is computed once (it was the slowest part of a run).
let cachedDriftMultiplier: number | null = null;

/** One regime per month, starting calm. Market-wide: every asset in a run shares it. */
export function drawRegimes(months: number, rng: Rng): Regime[] {
  const { regimeTransitions } = assumptions.simulation;
  const out: Regime[] = [];
  let current: Regime = 'calm';
  for (let m = 0; m < months; m++) {
    out.push(current);
    const roll = rng.next();
    let acc = 0;
    let chosen: Regime = current;
    for (const to of REGIMES) {
      acc += regimeTransitions[current][to];
      if (roll < acc) {
        chosen = to;
        break;
      }
    }
    current = chosen;
  }
  return out;
}
