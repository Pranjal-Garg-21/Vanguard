/**
 * Speed budget: the plan wants 500 futures of 20 years to finish in under 1 second on a phone slowed to a quarter of
 * normal speed, so under about 250 ms here. These tests fail if the engine gets much slower.
 */
import { describe, it, expect } from 'vitest';
import { runFundFutures } from './funds-sim';
import { runFutures } from './montecarlo';

const time = (fn: () => void) => {
  fn(); // warm up
  const t0 = performance.now();
  fn();
  return performance.now() - t0;
};

describe('500 futures of 20 years', () => {
  it('a three-path mix runs in the budget', () => {
    const ms = time(() => runFutures({ weights: { steady_box: 0.4, mixed_basket: 0.4, bumpy_ride: 0.2 }, months: 240, seed: 'perf', initial: 10000, monthly: 2000, runs: 500 }));
    expect(ms, `took ${ms.toFixed(0)} ms`).toBeLessThan(250);
  });

  it('a fund (with and without cost) runs in the budget', () => {
    const ms = time(() => runFundFutures('active_growth', { method: 'sip', amount: 1000, years: 20 }, 'perf', 500));
    expect(ms, `took ${ms.toFixed(0)} ms`).toBeLessThan(500); // each run simulates two price paths
  });
});
