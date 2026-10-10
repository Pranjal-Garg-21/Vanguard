/**
 * UC-BANK-01 Document Hunt — P3.
 *
 * Triage in board layout: all eight items visible, tap an item then tap where
 * it goes, wrong ones bounce back out of the folder with a spoken reason.
 *
 * The age rule is the interesting part. For an under-18 character the bank
 * needs a guardian's ID (minor account), and does NOT need a PAN card. So the
 * deck is not fixed — showing a PAN card to a 16-year-old and then bouncing it
 * would teach something false, and showing the guardian ID to a 21-year-old
 * would make a correct answer wrong. Cards are selected by age, not just level.
 */

import { useMemo } from 'react';

import { Triage, type TriageCard } from '@/runtime/verbs/triage';
import { asBuckets, combine, type GameProps } from '../shared/game';
import { conceptMap } from '@/runtime/verbs/types';

import content from '@/content/scenarios/bank/document-hunt.json';
import { characterAge, deckForAge, type DocCard } from './logic/deck';

export function DocumentHunt({ ctx, onComplete }: GameProps) {
  const age = characterAge(ctx);

  const cards = useMemo<TriageCard[]>(
    () =>
      deckForAge(content.cards as DocCard[], age).map((c) => ({
        id: c.id,
        textKey: c.textKey,
        imageKey: c.imageKey,
        audioKey: c.audioKey,
        correctBucket: c.correctBucket,
        explainKey: c.explainKey,
        concepts: conceptMap(c.concepts),
        minLevel: ('minLevel' in c ? c.minLevel : 1) as 1 | 2 | 3,
      })),
    [age],
  );

  return (
    <Triage
      stepId="bank01.hunt"
      ctx={ctx}
      buckets={asBuckets(content.buckets)}
      cards={cards}
      layout="board"
      bounceWrong
      promptKey={content.promptKey}
      onComplete={(outcome) =>
        onComplete(
          combine('bank01.summary', [
            {
              choices: outcome.choices,
              conceptDeltas: outcome.conceptDeltas,
              misconceptions: outcome.misconceptions,
              // Documents gathered is what unlocks the Bank Counter next.
              effects: { 'meta.flags.hasDocuments': true },
            },
          ]),
        )
      }
    />
  );
}
