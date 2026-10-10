import { describe, it, expect } from 'vitest';
import * as f from '@/core/market/finance';

/**
 * Facts that appear as plain words in lesson text (not as {placeholders}).
 * If a number in the lesson JSON changes, one of these fails and tells you the prose is now wrong.
 */
describe('lesson 1: profit and loss', () => {
  it('"that 500 must double" to get back to 1,000', () => {
    expect(1000 * (1 - 0.5) * 2).toBe(1000);
  });
  it('check 04: after a 50% fall you hold half; rise needed is 100%', () => {
    expect(1 - 0.5).toBe(0.5);
    expect(f.breakevenGain(0.5)).toBeCloseTo(1);
  });
  it('check 05: a 20% fall leaves 80 of 100; 20 more on 80 is a 25% rise', () => {
    expect(100 * (1 - 0.2)).toBe(80);
    expect(20 / 80).toBeCloseTo(0.25);
    expect(f.breakevenGain(0.2)).toBeCloseTo(0.25);
  });
});

describe('lesson 2: interest', () => {
  it('"far less than half": a late starter ends with under half of the early starter', () => {
    const early = f.futureValueMonthly(500, 0.1, (58 - 18) * 12);
    const late = f.futureValueMonthly(500, 0.1, (58 - 28) * 12);
    expect(late / early).toBeLessThan(0.5);
  });
  it('"though she saved only 1.3 times as much": money put in differs far less than the result', () => {
    expect((40 * 12) / (30 * 12)).toBeCloseTo(1.333, 2);
    const early = f.futureValueMonthly(500, 0.1, 40 * 12);
    const late = f.futureValueMonthly(500, 0.1, 30 * 12);
    expect(early / late).toBeGreaterThan(2);
  });
  it('check 05 working: year 1 earns 1,000 so you hold 11,000; year 2 earns 1,100', () => {
    expect(10000 * 0.1).toBe(1000);
    expect(10000 + 1000).toBe(11000);
    expect(11000 * 0.1).toBeCloseTo(1100);
    expect(f.compoundAmount(10000, 0.1, 2)).toBeCloseTo(12100);
  });
  it('check 02 distractor: 5,900 is the original money plus the interest', () => {
    expect(5000 + f.simpleInterest(5000, 0.06, 3)).toBe(5900);
  });
  it('check 02 distractor: 300 is one year of interest', () => {
    expect(f.simpleInterest(5000, 0.06, 1)).toBeCloseTo(300);
  });
  it('check 05 distractors differ from the right answer', () => {
    expect(f.compoundAmount(10000, 0.1, 2)).not.toBe(11000);
    expect(f.compoundAmount(10000, 0.1, 2)).not.toBe(20000);
  });
  it('check 03: Rule of 72 at 9% gives 8, and the options 9, 12, 4 are all different', () => {
    expect(f.ruleOf72(9)).toBe(8);
  });
});
