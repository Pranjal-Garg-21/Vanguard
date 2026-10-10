import { describe, it, expect } from 'vitest';
import { bandPath, compactRupees, deflate, linePath, niceTicks } from './chart-math';

describe('deflate', () => {
  it('leaves month 0 alone and shrinks later months by inflation', () => {
    const out = deflate([1000, 1000, 1000], 0.12);
    expect(out[0]).toBe(1000);
    expect(out[2]!).toBeCloseTo(1000 / Math.pow(1.12, 2 / 12), 6);
    expect(out[2]!).toBeLessThan(out[1]!);
  });
  it('does nothing at zero inflation', () => {
    expect(deflate([5, 6, 7], 0)).toEqual([5, 6, 7]);
  });
});

describe('compactRupees', () => {
  it('uses Indian units', () => {
    expect(compactRupees(500)).toBe('₹500');
    expect(compactRupees(5000)).toBe('₹5k');
    expect(compactRupees(250000)).toBe('₹2.5L');
    expect(compactRupees(12000000)).toBe('₹1.2Cr');
    expect(compactRupees(-5000)).toBe('-₹5k');
  });
});

describe('niceTicks', () => {
  it('starts at 0, ends at or above max, and has few ticks', () => {
    for (const max of [37, 1234, 98765, 2.4e6, 0.8]) {
      const ticks = niceTicks(max);
      expect(ticks[0]).toBe(0);
      expect(ticks[ticks.length - 1]!).toBeGreaterThanOrEqual(max);
      expect(ticks.length).toBeLessThanOrEqual(7);
    }
  });
  it('gives round steps', () => {
    expect(niceTicks(100000)).toEqual([0, 25000, 50000, 75000, 100000]);
  });
  it('copes with a flat zero series', () => {
    expect(niceTicks(0).length).toBeGreaterThan(1);
  });
});

describe('paths', () => {
  const x = (i: number) => i * 10;
  const y = (v: number) => 100 - v;
  it('draws a line', () => {
    expect(linePath([0, 10], x, y)).toBe('M0.0,100.0 L10.0,90.0');
  });
  it('draws a closed band: along the top, back along the bottom', () => {
    expect(bandPath([0, 0], [10, 20], x, y)).toBe('M0.0,90.0 L10.0,80.0 L10.0,100.0 L0.0,100.0 Z');
  });
});
