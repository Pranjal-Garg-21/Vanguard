import { describe, it, expect } from 'vitest';
import { quantile, runFutures } from '../../src/games/investing/engine/montecarlo';

describe('quantile', () => {
  it('interpolates', () => {
    expect(quantile([10, 20, 30, 40, 50], 0)).toBe(10);
    expect(quantile([10, 20, 30, 40, 50], 0.5)).toBe(30);
    expect(quantile([10, 20, 30, 40, 50], 1)).toBe(50);
    expect(quantile([0, 100], 0.25)).toBe(25);
  });
});

describe('runFutures', () => {
  const base = { months: 24, seed: 'HYD-OC-07', initial: 10000 };
  const steadyOnly = { steady_box: 1 };
  const bumpyOnly = { bumpy_ride: 1 };

  it('runs 500 futures by default', () => {
    expect(runFutures({ ...base, weights: steadyOnly }).paths).toHaveLength(500);
  });

  it('same inputs give identical output', () => {
    const a = runFutures({ ...base, weights: bumpyOnly });
    const b = runFutures({ ...base, weights: bumpyOnly });
    expect(a).toEqual(b);
  });

  it('different seeds give different charts', () => {
    const a = runFutures({ ...base, weights: bumpyOnly });
    const b = runFutures({ ...base, weights: bumpyOnly, seed: 'HYD-OC-08' });
    expect(a.summary.median).not.toBe(b.summary.median);
  });

  it('percentile bands are ordered at every month', () => {
    const { percentiles: p } = runFutures({ ...base, weights: { mixed_basket: 0.6, bumpy_ride: 0.4 } });
    for (let m = 0; m <= base.months; m++) {
      expect(p.p5[m]).toBeLessThanOrEqual(p.p25[m]);
      expect(p.p25[m]).toBeLessThanOrEqual(p.p50[m]);
      expect(p.p50[m]).toBeLessThanOrEqual(p.p75[m]);
      expect(p.p75[m]).toBeLessThanOrEqual(p.p95[m]);
    }
  });

  it('every band starts at the amount put in', () => {
    const { percentiles: p } = runFutures({ ...base, weights: bumpyOnly });
    for (const band of [p.p5, p.p25, p.p50, p.p75, p.p95]) expect(band[0]).toBe(10000);
  });

  it('tracks money invested for a monthly plan', () => {
    const r = runFutures({ months: 12, seed: 1, initial: 0, monthly: 500, weights: steadyOnly });
    expect(r.invested[0]).toBe(0);
    expect(r.summary.invested).toBe(6000);
  });

  it('Time Machine lesson: over 2 years the bumpy ride can lose money far more often than the steady box', () => {
    const steady = runFutures({ ...base, weights: steadyOnly });
    const bumpy = runFutures({ ...base, weights: bumpyOnly });
    expect(steady.summary.lossProbability).toBeLessThan(0.05);
    expect(bumpy.summary.lossProbability).toBeGreaterThan(0.1);
    expect(bumpy.summary.p5).toBeLessThan(bumpy.summary.invested); // the bad case is a loss
    expect(bumpy.summary.p95 - bumpy.summary.p5).toBeGreaterThan(steady.summary.p95 - steady.summary.p5); // wider range
  });

  it('Time Machine lesson: over 20 years the risky path is rarely below what you put in, and the middle is higher', () => {
    const short = runFutures({ ...base, weights: bumpyOnly, months: 24 });
    const long = runFutures({ ...base, weights: bumpyOnly, months: 240 });
    expect(long.summary.lossProbability).toBeLessThan(short.summary.lossProbability);
    expect(long.summary.median / long.summary.invested).toBeGreaterThan(short.summary.median / short.summary.invested);
    expect(long.summary.lossProbability).toBeGreaterThan(0); // waiting helps, but nothing is guaranteed
  });

  it('rejects bad weights', () => {
    expect(() => runFutures({ ...base, weights: { steady_box: 0.5 } })).toThrow();
  });

  it('performance: 500 futures x 20 years x 3 assets runs quickly', () => {
    const t0 = performance.now();
    runFutures({
      months: 240,
      seed: 'perf',
      initial: 10000,
      weights: { steady_box: 0.3, mixed_basket: 0.4, bumpy_ride: 0.3 },
    });
    const ms = performance.now() - t0;
    // Spec target is < 1000 ms on a throttled low-end phone. A desktop should be well under 250 ms.
    expect(ms).toBeLessThan(250);
  });
});
