import { describe, expect, it } from 'vitest';

import { buildPlan, festivalFor, predictionOptions, scorePrediction } from './timeline';

describe('turning a monthly amount into a date', () => {
  it('reaches a goal inside the year when the rate is high enough', () => {
    const plan = buildPlan(6000, 1000, 5);
    expect(plan.monthsToGoal).toBe(6);
    expect(plan.withinYear).toBe(true);
    expect(plan.nextYear).toBe(false);
  });

  it('treats a multi-year goal as normal, with a year-one figure', () => {
    // A laptop at ₹1,300 a month is 20 months. On §7.5's numbers this is the
    // common case, so the year-one milestone has to be meaningful.
    const plan = buildPlan(25000, 1300, 5);
    expect(plan.monthsToGoal).toBe(20);
    expect(plan.withinYear).toBe(false);
    expect(plan.nextYear).toBe(true);
    expect(plan.yearOneAmount).toBe(15600);
    expect(plan.yearOneShare).toBeCloseTo(0.624, 2);
  });

  it('never reports progress above the goal', () => {
    expect(buildPlan(1000, 5000, 5).yearOneShare).toBe(1);
  });

  it('says a goal never arrives at nothing a month', () => {
    const plan = buildPlan(25000, 0, 5);
    expect(plan.monthsToGoal).toBeUndefined();
    expect(plan.festivalKey).toBeUndefined();
  });
});

describe('naming the month by a festival the student knows', () => {
  it('finds the festival in the landing month', () => {
    // Starting in June (5), seven months on is January — Sankranti.
    expect(festivalFor(7, 5)).toBe('sankranti');
  });

  it('looks one month ahead before giving up', () => {
    // June + 4 = October, no festival; November is Diwali.
    expect(festivalFor(4, 5)).toBe('diwali');
  });

  it('returns nothing when no festival is close', () => {
    expect(festivalFor(0, 0)).toBe('sankranti');
    expect(festivalFor(1, 0)).toBeUndefined();
  });
});

describe('the prediction step', () => {
  it('reports the gap rather than right or wrong', () => {
    expect(scorePrediction(20, 20).key).toBe('pb03.predict.exact');
    expect(scorePrediction(22, 20).key).toBe('pb03.predict.close');
    expect(scorePrediction(6, 20).key).toBe('pb03.predict.off');
    expect(scorePrediction(6, 20).gap).toBe(14);
  });

  it('always offers the true answer among the options', () => {
    for (const actual of [3, 7, 20, 50]) {
      expect(predictionOptions(actual)).toContain(actual);
    }
  });

  it('offers sorted, distinct options', () => {
    const options = predictionOptions(12);
    expect([...options].sort((a, b) => a - b)).toEqual(options);
    expect(new Set(options).size).toBe(options.length);
  });
});
