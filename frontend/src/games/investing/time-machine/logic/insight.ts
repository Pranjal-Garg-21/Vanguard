/**
 * Picks the one insight card shown after a run. Rules are data (content/scenarios/invest/time_machine.json),
 * checked in order; the first whose conditions all hold wins. Rules describe what the numbers show;
 * none of them may recommend a mix.
 */

export interface InsightFacts {
  years: number;
  /** Whole percents (0-100). */
  steadyShare: number;
  bumpyShare: number;
  /** Fractions (0-1) of the simulated futures. */
  lossChance: number;
  goalChance: number;
  /** The bad case (5th percentile) ended below the money put in. */
  p5BelowInvested: boolean;
}

export interface InsightWhen {
  minYears?: number;
  maxYears?: number;
  minSteady?: number;
  minBumpy?: number;
  minLossChance?: number;
  p5BelowInvested?: boolean;
}

export interface InsightRule {
  id: string;
  when: InsightWhen;
  textKey: string;
  concept: string;
  misconception?: string;
}

function holds(w: InsightWhen, f: InsightFacts): boolean {
  return (
    (w.minYears === undefined || f.years >= w.minYears) &&
    (w.maxYears === undefined || f.years <= w.maxYears) &&
    (w.minSteady === undefined || f.steadyShare >= w.minSteady) &&
    (w.minBumpy === undefined || f.bumpyShare >= w.minBumpy) &&
    (w.minLossChance === undefined || f.lossChance >= w.minLossChance) &&
    (w.p5BelowInvested === undefined || f.p5BelowInvested === w.p5BelowInvested)
  );
}

/** First matching rule. The last rule should have an empty `when` so something always matches. */
export function pickInsight(rules: InsightRule[], facts: InsightFacts): InsightRule {
  const hit = rules.find((r) => holds(r.when, facts));
  if (!hit) throw new Error('No insight rule matched: add a rule with an empty "when" at the end.');
  return hit;
}

/** A share of futures in words a student can picture: "about 3 in 10". */
export function tenths(share: number): { key: string; n?: number } {
  if (share <= 0) return { key: 'timemachine.tenths.none' };
  if (share >= 1) return { key: 'timemachine.tenths.all' };
  const n = Math.round(share * 10);
  if (n === 0) return { key: 'timemachine.tenths.few' };
  if (n === 10) return { key: 'timemachine.tenths.many' };
  return { key: 'timemachine.tenths.n', n };
}
