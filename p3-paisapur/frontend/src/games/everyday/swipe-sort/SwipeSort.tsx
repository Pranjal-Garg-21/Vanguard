/**
 * UC-PB-01 Needs vs Wants Swipe Sort — P3.
 *
 * Runs the Triage verb over a persona-filtered deck. The card pool does the
 * heavy lifting; this component's real job is the two things the pool cannot
 * express on its own:
 *
 *   • Filtering the deck to the character's life, so a school student is never
 *     asked about hostel mess fees (12.6: "cards are drawn from the persona's
 *     life").
 *   • Watching for `fun_is_bad` — a misconception that no single card can
 *     reveal, because it only exists as a pattern across the whole round.
 */

import { useMemo } from 'react';

import { Triage, type TriageCard } from '@/runtime/verbs/triage';
import type { MisconceptionId } from '@/core/types';
import { asBuckets, combine, matchesPersona, type GameProps } from '../shared/game';
import { conceptMap } from '@/runtime/verbs/types';
import content from '@/content/scenarios/plan/swipe-sort.json';
import { detectFunIsBad, type FunRecord } from './logic/fun';
import { storyPrice } from '../shared/economics';

type PoolCard = (typeof content.cards)[number];

export function SwipeSort({ ctx, onComplete }: GameProps) {
  const cards = useMemo<TriageCard[]>(
    () =>
      (content.cards as PoolCard[])
        .filter((c) => matchesPersona('personaFilter' in c ? c.personaFilter : undefined, ctx))
        .map((c) => ({
          id: c.id,
          textKey: c.textKey,
          // Items the story's shops also sell show the story's price.
          amount: storyPrice(ctx, 'storyItem' in c ? c.storyItem : undefined) ?? c.amount,
          correctBucket: c.correctBucket,
          explainKey: c.explainKey,
          recontext: 'recontext' in c ? c.recontext : undefined,
          concepts: conceptMap(c.concepts),
          misconception: 'misconception' in c ? c.misconception : undefined,
          minLevel: ('minLevel' in c ? c.minLevel : 1) as 1 | 2 | 3,
        })),
    [ctx],
  );

  return (
    <Triage
      stepId="pb01.sort"
      ctx={ctx}
      buckets={asBuckets(content.buckets)}
      cards={cards}
      layout="queue"
      maxCards={content.maxCards}
      promptKey={content.promptKey}
      shuffle
      onComplete={(outcome) => {
        const records =
          (outcome.detail as { records?: FunRecord[] } | undefined)?.records ?? [];
        const extra: MisconceptionId[] = detectFunIsBad(records) ? ['fun_is_bad'] : [];

        onComplete(
          combine('pb01.summary', [
            {
              choices: outcome.choices,
              conceptDeltas: outcome.conceptDeltas,
              misconceptions: [...outcome.misconceptions, ...extra],
            },
          ]),
        );
      }}
    />
  );
}
