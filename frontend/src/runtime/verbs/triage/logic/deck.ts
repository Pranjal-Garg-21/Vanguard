/**
 * Triage deck selection. Pure — no React, no platform. Owner: P3.
 */

import type { ConceptId, Level, MisconceptionId } from '@/core/types';
import type { Localised } from '../../types';
import { deriveSeed, makeRng, shuffled } from '../../shared/rng';

export type TriageBucket = {
  id: string;
  labelKey: string;
  emoji?: string;
};

export type TriageCard = Localised & {
  id: string;
  /** Price shown on the card, e.g. 1800 for sneakers. Formatted as ₹ by locale. */
  amount?: number;
  /**
   * Which bucket is right. Omit (or null) for genuinely ambiguous items —
   * "biryani with friends" is not objectively a want. Ambiguous cards are
   * accepted either way and get "here's another way to see it" in the summary.
   */
  correctBucket?: string | null;
  /** Why it belongs where it belongs. Shown on a miss and in the summary. */
  explainKey?: string;
  /**
   * The context re-sort: the card comes back with new information and may have
   * a different answer. "Phone recharge — and your classes are online."
   */
  recontext?: {
    contextKey: string;
    correctBucket?: string | null;
    explainKey?: string;
  };
  /** Mastery targets when sorted correctly (§10.3). */
  concepts?: Record<ConceptId, number>;
  misconception?: MisconceptionId;
  /** Card only appears at or above this level. L1 pools are deliberately small. */
  minLevel?: Level;
};

export type QueueEntry = TriageCard & {
  /** Set on the second showing of a card that has a `recontext`. */
  contextKey?: string;
  isRecontext?: boolean;
};

export type SortRecord = {
  card: QueueEntry;
  bucketId: string;
  /** `undefined` for ambiguous cards — deliberately not a boolean. */
  correct: boolean | undefined;
  ms: number;
};

export function selectCards(
  cards: readonly TriageCard[],
  level: Level,
  seed: number,
  opts: { maxCards?: number; shuffle?: boolean } = {},
): TriageCard[] {
  const eligible = cards.filter((c) => (c.minLevel ?? 1) <= level);
  const ordered = opts.shuffle
    ? shuffled(eligible, makeRng(deriveSeed(seed, 'triage')))
    : eligible;
  return opts.maxCards ? ordered.slice(0, opts.maxCards) : ordered;
}

/** The answer for a card, accounting for a re-contexted showing. */
export function expectedBucket(entry: QueueEntry): string | null | undefined {
  return entry.isRecontext && entry.recontext
    ? entry.recontext.correctBucket
    : entry.correctBucket;
}

export function explanationKey(entry: QueueEntry): string | undefined {
  return entry.isRecontext && entry.recontext?.explainKey
    ? entry.recontext.explainKey
    : entry.explainKey;
}
