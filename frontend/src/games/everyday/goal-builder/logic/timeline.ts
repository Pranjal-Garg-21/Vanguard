/**
 * Turning a monthly amount into a date. Pure. Owner: P3.
 *
 * The year-one milestone is treated as a first-class outcome rather than an
 * alternate flow. On the §7.5 numbers most characters need 18–30 months to
 * reach their goal, so "longer than a year" is the common case — and a student
 * who ends the LifePath year without the thing should read that as being
 * partway there, not as having failed.
 */

import { monthsToReach } from '@/runtime/verbs/commit';

/** §8.5 names these; the calendar month each falls in, 0 = January. */
export const FESTIVALS: Record<number, string> = {
  0: 'sankranti',
  3: 'ugadi',
  6: 'bonalu',
  8: 'ganesh',
  10: 'diwali',
  11: 'christmas',
};

export const LIFEPATH_MONTHS = 12;

export type GoalPlan = {
  monthly: number;
  goalAmount: number;
  /** Total months needed. `undefined` when the goal never arrives. */
  monthsToGoal: number | undefined;
  withinYear: boolean;
  /** What they will have saved by the end of the LifePath year. */
  yearOneAmount: number;
  /** Progress towards the goal at twelve months, 0–1. */
  yearOneShare: number;
  /** Festival the goal lands on or just after, if one is close. */
  festivalKey?: string;
  nextYear: boolean;
};

/**
 * The festival a goal lands on, if one falls in that month or the month after.
 * Naming a date the student recognises beats "in 19 months".
 */
export function festivalFor(
  monthsFromNow: number,
  startMonthOfYear: number,
): string | undefined {
  for (let ahead = 0; ahead <= 1; ahead++) {
    const calendarMonth = (startMonthOfYear + monthsFromNow + ahead) % 12;
    const festival = FESTIVALS[calendarMonth];
    if (festival) return festival;
  }
  return undefined;
}

export function buildPlan(
  goalAmount: number,
  monthly: number,
  startMonthOfYear: number,
): GoalPlan {
  const monthsToGoal = monthsToReach(goalAmount, monthly);
  const yearOneAmount = Math.max(0, monthly) * LIFEPATH_MONTHS;

  return {
    monthly,
    goalAmount,
    monthsToGoal,
    withinYear: monthsToGoal !== undefined && monthsToGoal <= LIFEPATH_MONTHS,
    yearOneAmount,
    yearOneShare: goalAmount > 0 ? Math.min(1, yearOneAmount / goalAmount) : 0,
    festivalKey:
      monthsToGoal === undefined ? undefined : festivalFor(monthsToGoal, startMonthOfYear),
    nextYear: monthsToGoal !== undefined && monthsToGoal > LIFEPATH_MONTHS,
  };
}

/**
 * How close the student's guess was. The gap is the lesson (§10.2 Predict), so
 * this reports the gap rather than right/wrong.
 */
export function scorePrediction(
  guess: number,
  actual: number | undefined,
): { key: string; gap: number } {
  if (actual === undefined) return { key: 'pb03.predict.off', gap: 0 };
  const gap = Math.abs(guess - actual);
  if (gap === 0) return { key: 'pb03.predict.exact', gap };
  if (gap <= Math.max(1, Math.round(actual * 0.2))) return { key: 'pb03.predict.close', gap };
  return { key: 'pb03.predict.off', gap };
}

/** A spread of plausible guesses around the truth, so the options are fair. */
export function predictionOptions(actual: number | undefined): number[] {
  if (actual === undefined) return [6, 12, 24, 36];
  const spread = new Set<number>([
    Math.max(1, Math.round(actual / 2)),
    actual,
    Math.round(actual * 1.5),
    actual * 2,
  ]);
  return [...spread].sort((a, b) => a - b);
}
