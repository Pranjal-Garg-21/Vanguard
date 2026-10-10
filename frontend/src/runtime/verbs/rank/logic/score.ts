/**
 * Rank scoring. Pure — no React, no platform. Owner: P3.
 *
 * §10.2 says the feedback for Rank is "cost of their order vs the best order,
 * in ₹", so this computes that rather than a right/wrong tick.
 */

import type { ConceptId, MisconceptionId } from '@/core/types';
import type { Localised } from '../../types';

export type RankItem = Localised & {
  id: string;
  /**
   * The hidden true value the correct order is derived from — total repaid for
   * debt options, step number for Rescue Mission, ₹ per month for leaks.
   */
  value: number;
  /** Revealed after submitting, e.g. "₹2,000 + ₹600 interest". */
  revealKey?: string;
  /** Values for the reveal's {placeholders}. */
  revealVars?: Record<string, string | number>;
  concepts?: Record<ConceptId, number>;
  misconception?: MisconceptionId;
};

export type RankDirection = 'asc' | 'desc';

export type RankDetail = {
  order: string[];
  bestOrder: string[];
  /** Pairs the student put the wrong way round. 0 = perfect. */
  inversions: number;
  maxInversions: number;
  /** 0–1. 1 = perfect order. Used for partial credit. */
  accuracy: number;
  /** Extra ₹ the student's top pick costs versus the genuinely best one. */
  topPickExtraCost: number;
  elapsedMs: number;
};

export function bestOrder(items: readonly RankItem[], direction: RankDirection): string[] {
  const sorted = [...items].sort((a, b) =>
    direction === 'asc' ? a.value - b.value : b.value - a.value,
  );
  return sorted.map((i) => i.id);
}

/**
 * Count pairs in the wrong relative order (Kendall tau distance).
 *
 * Items with equal `value` are never counted as inverted — two borrowing
 * options that cost the same are both acceptable in either position.
 */
export function countInversions(
  order: readonly string[],
  items: readonly RankItem[],
  direction: RankDirection,
): number {
  const valueOf = new Map(items.map((i) => [i.id, i.value]));
  let inversions = 0;
  for (let i = 0; i < order.length; i++) {
    for (let j = i + 1; j < order.length; j++) {
      const idA = order[i];
      const idB = order[j];
      if (idA === undefined || idB === undefined) continue;
      const a = valueOf.get(idA);
      const b = valueOf.get(idB);
      if (a === undefined || b === undefined || a === b) continue;
      const wrong = direction === 'asc' ? a > b : a < b;
      if (wrong) inversions++;
    }
  }
  return inversions;
}

export function scoreOrder(
  order: readonly string[],
  items: readonly RankItem[],
  direction: RankDirection,
  elapsedMs: number,
): RankDetail {
  const best = bestOrder(items, direction);
  const inversions = countInversions(order, items, direction);
  const n = order.length;
  const maxInversions = (n * (n - 1)) / 2;
  const valueOf = new Map(items.map((i) => [i.id, i.value]));

  const studentFirst = order[0];
  const bestFirst = best[0];
  const studentTop = studentFirst === undefined ? 0 : (valueOf.get(studentFirst) ?? 0);
  const bestTop = bestFirst === undefined ? 0 : (valueOf.get(bestFirst) ?? 0);

  return {
    order: [...order],
    bestOrder: best,
    inversions,
    maxInversions,
    accuracy: maxInversions === 0 ? 1 : 1 - inversions / maxInversions,
    topPickExtraCost: Math.abs(studentTop - bestTop),
    elapsedMs,
  };
}
