import { describe, it, expect } from 'vitest';
import { createRng, hashSeed } from './rng';

const take = (n: number, fn: () => number) => Array.from({ length: n }, fn);

describe('rng', () => {
  it('same seed gives the same sequence', () => {
    const a = createRng(42);
    const b = createRng(42);
    expect(take(20, () => a.next())).toEqual(take(20, () => b.next()));
  });

  it('different seeds give different sequences', () => {
    const a = take(10, createRng(1).next);
    const b = take(10, createRng(2).next);
    expect(a).not.toEqual(b);
  });

  it('next() stays in [0, 1)', () => {
    const r = createRng(7);
    for (const v of take(5000, () => r.next())) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('normal() has mean ~0 and standard deviation ~1', () => {
    const r = createRng(123);
    const xs = take(40000, () => r.normal());
    const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
    const sd = Math.sqrt(xs.reduce((a, b) => a + (b - mean) ** 2, 0) / xs.length);
    expect(Math.abs(mean)).toBeLessThan(0.03);
    expect(Math.abs(sd - 1)).toBeLessThan(0.03);
  });

  it('fork is independent of how many numbers the parent has drawn', () => {
    const a = createRng(99);
    const b = createRng(99);
    take(500, () => b.next()); // b has consumed numbers, a has not
    expect(take(10, () => a.fork('gold').next())).toEqual(take(10, () => b.fork('gold').next()));
  });

  it('different fork labels give different streams', () => {
    const r = createRng(5);
    expect(r.fork('a').next()).not.toBe(r.fork('b').next());
  });

  it('hashSeed is stable and order sensitive', () => {
    expect(hashSeed('a', 1)).toBe(hashSeed('a', 1));
    expect(hashSeed('a', 1)).not.toBe(hashSeed(1, 'a'));
  });

  it('string seeds work', () => {
    expect(createRng('HYD-OC-07').next()).toBe(createRng('HYD-OC-07').next());
  });
});
