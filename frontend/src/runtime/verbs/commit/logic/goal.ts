/**
 * Commitment maths. Pure — no React, no platform. Owner: P3.
 */

/**
 * Above this share of monthly income we warn before confirming. Not a block —
 * a family contributor may genuinely need to commit a lot, and the plan
 * refuses to moralise at them (§12.6 UC-PB-02 alternate flow).
 */
export const HEAVY_COMMITMENT_SHARE = 0.4;

/**
 * Months to reach a goal at a monthly rate. Rounds up: a part month is still a
 * month. Also used by the What-If Lab goal calculator (UC-TK-01).
 */
export function monthsToReach(goalAmount: number, monthly: number): number | undefined {
  if (monthly <= 0 || goalAmount <= 0) return undefined;
  return Math.ceil(goalAmount / monthly);
}
