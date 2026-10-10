import { describe, it, expect } from 'vitest';
import { createRng } from '../../src/games/investing/engine/rng';
import { assumptions } from '../../src/games/investing/engine/assumptions';
import {
  averageDriftMultiplier,
  drawRegimes,
  stationaryDistribution,
} from '../../src/games/investing/engine/market/regimes';
import {
  generateReturns,
  pathFromReturns,
  simulateAsset,
  simulatePortfolio,
  type AssetSpec,
} from '../../src/games/investing/engine/market/simulate';

const bumpy: AssetSpec = { id: 'bumpy_ride', ...assumptions.assets.bumpy_ride };
const steady: AssetSpec = { id: 'steady_box', ...assumptions.assets.steady_box };
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const sd = (xs: number[]) => {
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
};

describe('regimes', () => {
  it('transition rows each sum to 1', () => {
    for (const row of Object.values(assumptions.simulation.regimeTransitions)) {
      expect(Object.values(row).reduce((a, b) => a + b, 0)).toBeCloseTo(1);
    }
  });
  it('stationary distribution sums to 1 and calm dominates', () => {
    const d = stationaryDistribution();
    expect(d.calm + d.boom + d.crash).toBeCloseTo(1);
    expect(d.calm).toBeGreaterThan(d.boom);
    expect(d.boom).toBeGreaterThan(d.crash);
  });
  it('drawRegimes is seeded, starts calm and has the right length', () => {
    const a = drawRegimes(60, createRng(3));
    expect(a).toEqual(drawRegimes(60, createRng(3)));
    expect(a).toHaveLength(60);
    expect(a[0]).toBe('calm');
  });
  it('long-run time in crash is close to the stationary share', () => {
    const r = drawRegimes(60000, createRng(11));
    const share = r.filter((x) => x === 'crash').length / r.length;
    expect(Math.abs(share - stationaryDistribution().crash)).toBeLessThan(0.01);
  });
});

describe('generateReturns', () => {
  it('without regimes: mean and volatility match the assumptions', () => {
    const r = generateReturns(bumpy, 60000, createRng(1));
    const annualisedMean = Math.pow(1 + mean(r), 12) - 1;
    // bumpy_ride: 13% mean, 0.5% fee
    expect(Math.abs(annualisedMean - (0.13 - 0.005))).toBeLessThan(0.02);
    expect(Math.abs(sd(r) * Math.sqrt(12) - 0.22)).toBeLessThan(0.01);
  });
  it('with regimes: long-run mean is still close to the configured mean (drift is normalised)', () => {
    const rng = createRng(2);
    const regimes = drawRegimes(120000, rng.fork('regimes'));
    const r = generateReturns(steady, 120000, rng.fork('r'), { regimes });
    const annualised = Math.pow(1 + mean(r), 12) - 1;
    expect(Math.abs(annualised - 0.065)).toBeLessThan(0.01);
  });
  it('crashes pull the average drift multiplier below 1, so the engine boosts drift to compensate', () => {
    expect(averageDriftMultiplier()).toBeLessThan(1);
    expect(averageDriftMultiplier()).toBeGreaterThan(0.8);
  });
  it('is deterministic for the same seed', () => {
    expect(generateReturns(bumpy, 36, createRng(9))).toEqual(generateReturns(bumpy, 36, createRng(9)));
  });
  it('no single month moves more than the cap', () => {
    const cap = assumptions.simulation.maxMonthlyMove;
    for (const r of generateReturns({ ...bumpy, volAnnual: 3 }, 5000, createRng(4))) {
      expect(Math.abs(r)).toBeLessThanOrEqual(cap + 1e-12);
    }
  });
  it('a shock lands in exactly its month, on its target only', () => {
    const base = generateReturns(bumpy, 12, createRng(5));
    const shocked = generateReturns(bumpy, 12, createRng(5), {
      shocks: [{ month: 4, target: 'bumpy_ride', pct: -0.2, newsKey: 'news.test' }],
    });
    for (let i = 0; i < 12; i++) {
      if (i === 3) expect(shocked[i]).toBeCloseTo(base[i] - 0.2);
      else expect(shocked[i]).toBe(base[i]);
    }
    const other = generateReturns(bumpy, 12, createRng(5), {
      shocks: [{ month: 4, target: 'gold', pct: -0.2, newsKey: 'news.test' }],
    });
    expect(other).toEqual(base);
  });
  it("a 'market' shock hits every asset", () => {
    const shocks = [{ month: 2, target: 'market', pct: -0.1, newsKey: 'n' }];
    const a = generateReturns(bumpy, 3, createRng(6), { shocks });
    const b = generateReturns(bumpy, 3, createRng(6));
    expect(a[1]).toBeCloseTo(b[1] - 0.1);
  });
});

describe('prices', () => {
  it('starts at the start price and never goes negative', () => {
    const p = simulateAsset({ ...bumpy, volAnnual: 3 }, 600, createRng(8), {}, 100);
    expect(p[0]).toBe(100);
    expect(Math.min(...p)).toBeGreaterThanOrEqual(0);
  });
  it('pathFromReturns compounds correctly', () => {
    const p = pathFromReturns([0.1, -0.5], 100);
    expect(p[0]).toBe(100);
    expect(p[1]).toBeCloseTo(110);
    expect(p[2]).toBeCloseTo(55);
  });
  it('a failed company collapses to about 2% of its value and stays low', () => {
    const p = simulateAsset(bumpy, 12, createRng(10), { failureMonth: 6 }, 100);
    expect(p[6]).toBeLessThan(p[5] * 0.03);
    expect(p[12]).toBeLessThan(p[5] * 0.2);
  });
  it('the same random returns give the same path (fair strategy comparisons)', () => {
    const returns = generateReturns(bumpy, 24, createRng(12));
    expect(pathFromReturns(returns)).toEqual(pathFromReturns(returns));
  });
});

describe('simulatePortfolio', () => {
  it('is deterministic and tracks money put in', () => {
    const run = () =>
      simulatePortfolio({ steady_box: 0.5, bumpy_ride: 0.5 }, 24, createRng(77), { initial: 1000, monthly: 100 });
    expect(run()).toEqual(run());
    const { values, invested } = run();
    expect(values).toHaveLength(25);
    expect(invested[0]).toBe(1000);
    expect(invested[24]).toBe(1000 + 24 * 100);
  });
  it('adding or removing another asset does not change an existing asset\'s returns', () => {
    const a = simulatePortfolio({ steady_box: 1 }, 12, createRng(5)).values;
    const b = simulatePortfolio({ steady_box: 1, gold: 0 }, 12, createRng(5)).values;
    expect(a).toEqual(b);
  });
  it('rejects weights that do not sum to 1, negative weights, and unknown assets', () => {
    expect(() => simulatePortfolio({ steady_box: 0.5 }, 12, createRng(1))).toThrow();
    expect(() => simulatePortfolio({ steady_box: 1.5, gold: -0.5 }, 12, createRng(1))).toThrow();
    expect(() => simulatePortfolio({ real_company: 1 }, 12, createRng(1))).toThrow();
  });
});
