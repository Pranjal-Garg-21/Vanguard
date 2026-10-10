/**
 * The month-end statement: what leaked, what survived. Pure. Owner: P3.
 *
 * §12.6 asks for a statement after the plan is saved, and for specific
 * feedback when a family contributor's needs take most of their income. The
 * rules live here so they can be argued about and tested rather than being
 * buried in JSX.
 */

import type { Bill } from '../../shared/economics';

export type JarAllocations = Record<string, number>;

export type MonthEndStatement = {
  income: number;
  allocations: JarAllocations;
  billsPaid: Bill[];
  billsMissed: Bill[];
  /** Share of income that had to go to needs, 0–1. */
  needsShare: number;
  futureKept: number;
  wantsKept: number;
  verdictKey: string;
};

/** Above this share, needs are acknowledged rather than questioned. */
export const HEAVY_NEEDS_SHARE = 0.7;

/**
 * Which bills the Needs jar actually covers, cheapest first — the same order
 * the live overflow check uses, so the warning during play and the statement
 * afterwards never disagree.
 */
export function settleBills(
  bills: readonly Bill[],
  needsJar: number,
): { paid: Bill[]; missed: Bill[] } {
  const ordered = [...bills].sort((a, b) => a.amount - b.amount);
  const paid: Bill[] = [];
  const missed: Bill[] = [];
  let left = needsJar;

  for (const bill of ordered) {
    if (left >= bill.amount) {
      left -= bill.amount;
      paid.push(bill);
    } else {
      missed.push(bill);
    }
  }
  return { paid, missed };
}

export function buildStatement(
  income: number,
  bills: readonly Bill[],
  allocations: JarAllocations,
): MonthEndStatement {
  const needsJar = allocations.needs ?? 0;
  const futureKept = (allocations.future ?? 0) + (allocations.emergency ?? 0);
  const wantsKept = allocations.wants ?? 0;
  const { paid, missed } = settleBills(bills, needsJar);
  const needsShare = income > 0 ? needsJar / income : 0;

  return {
    income,
    allocations,
    billsPaid: paid,
    billsMissed: missed,
    needsShare,
    futureKept,
    wantsKept,
    verdictKey: verdictFor({ missed, needsShare, futureKept, wantsKept, income }),
  };
}

function verdictFor({
  missed,
  needsShare,
  futureKept,
  wantsKept,
  income,
}: {
  missed: Bill[];
  needsShare: number;
  futureKept: number;
  wantsKept: number;
  income: number;
}): string {
  // An unpaid bill is the most urgent thing to say, whatever else happened.
  if (missed.length > 0) return 'pb02.verdict.missed_bills';

  // Needs eating the income is a fact about this character's life, not a
  // mistake — §12.6 is explicit that the response acknowledges it.
  if (needsShare >= HEAVY_NEEDS_SHARE) return 'pb02.verdict.heavy_needs';

  if (futureKept === 0) return 'pb02.verdict.nothing_future';

  // Saving everything is not the lesson either: a plan nobody can live with
  // gets abandoned, which teaches the opposite of budgeting.
  if (income > 0 && wantsKept === 0 && futureKept > 0) return 'pb02.verdict.all_future';

  return 'pb02.verdict.good';
}
