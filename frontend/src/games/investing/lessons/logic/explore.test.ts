import { describe, expect, it } from 'vitest';
import { EXPLORE_WIDGETS, VISUALS, fallAndRise, growthSeries } from './explore';

describe('fallAndRise', () => {
  it('a 50% fall needs a 100% rise, and an equal rise only gets back to 75%', () => {
    const r = fallAndRise(1000, 0.5);
    expect(r.afterFall).toBe(500);
    expect(r.needGain).toBeCloseTo(1);
    expect(r.afterSameRise).toBeCloseTo(750);
  });
  it('no fall means nothing to recover', () => {
    const r = fallAndRise(1000, 0);
    expect(r.afterFall).toBe(1000);
    expect(r.needGain).toBe(0);
  });
  it('the rise needed always exceeds the fall, and grows faster the bigger the fall', () => {
    let last = 0;
    for (const fall of [0.1, 0.2, 0.3, 0.5, 0.7, 0.9]) {
      const { needGain } = fallAndRise(1000, fall);
      expect(needGain).toBeGreaterThan(fall);
      expect(needGain).toBeGreaterThan(last);
      last = needGain;
    }
  });
  it('clamps silly input so the slider can never divide by zero', () => {
    expect(Number.isFinite(fallAndRise(1000, 1).needGain)).toBe(true);
    expect(Number.isFinite(fallAndRise(1000, 2).needGain)).toBe(true);
    expect(fallAndRise(1000, -1).afterFall).toBe(1000);
  });
});

describe('growthSeries', () => {
  const s = growthSeries(10000, 0.08, 10);
  it('has a point for every year from 0 to the end', () => {
    expect(s).toHaveLength(11);
    expect(s[0]).toEqual({ year: 0, simple: 10000, compound: 10000 });
  });
  it('matches the lesson numbers at year 10', () => {
    expect(s[10]!.simple).toBeCloseTo(18000);
    expect(s[10]!.compound).toBeCloseTo(21589.25, 1);
  });
  it('compound is never below simple, and the gap only widens', () => {
    let gap = 0;
    for (const p of s) {
      expect(p.compound).toBeGreaterThanOrEqual(p.simple - 1e-9);
      expect(p.compound - p.simple).toBeGreaterThanOrEqual(gap - 1e-9);
      gap = p.compound - p.simple;
    }
  });
});

describe('format lists', () => {
  it('have no duplicates', () => {
    expect(new Set(EXPLORE_WIDGETS).size).toBe(EXPLORE_WIDGETS.length);
    expect(new Set(VISUALS).size).toBe(VISUALS.length);
  });
});
