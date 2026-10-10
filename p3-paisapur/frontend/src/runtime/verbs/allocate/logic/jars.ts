/**
 * Jar allocation rules. Pure — no React, no platform. Owner: P3.
 *
 * The teaching mechanic is the live overflow check (§12.6): bills are attached
 * to a jar, and under-funding that jar names the bill that will not be paid.
 */

import type { Level } from '@/core/types';
import type { Localised } from '../../types';

export type AllocateBill = Localised & {
  id: string;
  amount: number;
};

export type AllocateJar = Localised & {
  id: string;
  emoji?: string;
  /** Known commitments that must come out of this jar this month. */
  bills?: AllocateBill[];
  /** The Emergency jar only appears once UC-SM-03 has introduced it. */
  minLevel?: Level;
};

export type Underfunded = {
  jarId: string;
  shortfall: number;
  firstUncoveredBillKey?: string;
};

export type AllocateDetail = {
  allocations: Record<string, number>;
  remaining: number;
  underfunded: Underfunded[];
  billsCovered: boolean;
};

export const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);

export const billsTotal = (jar: AllocateJar) =>
  sum((jar.bills ?? []).map((b) => b.amount));

/** Which jars cannot pay their bills, and by how much. */
export function findUnderfunded(
  jars: readonly AllocateJar[],
  allocations: Record<string, number>,
): Underfunded[] {
  const out: Underfunded[] = [];
  for (const jar of jars) {
    const needed = billsTotal(jar);
    if (needed === 0) continue;
    const got = allocations[jar.id] ?? 0;
    if (got >= needed) continue;

    // Name the first bill that runs out of money, cheapest first — that is the
    // one the student can most easily see they have lost.
    const ordered = [...(jar.bills ?? [])].sort((a, b) => a.amount - b.amount);
    let running = got;
    let firstUncovered: AllocateBill | undefined;
    for (const bill of ordered) {
      if (running < bill.amount) {
        firstUncovered = bill;
        break;
      }
      running -= bill.amount;
    }
    out.push({
      jarId: jar.id,
      shortfall: needed - got,
      firstUncoveredBillKey: firstUncovered?.textKey,
    });
  }
  return out;
}
