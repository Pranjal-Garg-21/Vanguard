/**
 * Triage verb — P3.
 *
 * "Student sorts items into two buckets." Two MVP games use it:
 *   • UC-PB-01 Needs vs Wants Swipe Sort  → `layout="queue"`, one card at a time
 *   • UC-BANK-01 Document Hunt            → `layout="board"`, all items visible
 *
 * Interaction is **tap-to-move**, not drag: tap an item, tap a bucket. Every
 * target is a real <button>, so keyboard and screen-reader support come for
 * free — the plan requires tap and keyboard fallbacks (work_division §P3.1).
 *
 * Two content rules from §12.6 are enforced here, not left to content authors:
 *   • A card with no `correctBucket` is **ambiguous and never marked wrong.**
 *   • Every disagreement is explained at the end, never scored silently.
 */

import { useMemo, useRef, useState } from 'react';

import { rupees, useT } from '@/platform';
import {
  expectedBucket,
  explanationKey,
  selectCards,
  type QueueEntry,
  type SortRecord,
  type TriageBucket,
  type TriageCard,
} from './logic/deck';
import type {
  ConceptId,
  MiniGameChoice,
  MisconceptionId,
} from '@/core/types';
import { WRONG_TARGET } from '../types';
import type {
  VerbCommonProps,
  VerbOutcome,
} from '../types';

export type TriageProps = VerbCommonProps & {
  buckets: [TriageBucket, TriageBucket];
  cards: TriageCard[];
  layout?: 'queue' | 'board';
  /**
   * Document Hunt behaviour: a wrong item bounces back out of the folder with a
   * spoken reason instead of staying put. Queue layout ignores this.
   */
  bounceWrong?: boolean;
  /** Swipe Sort stops at 8 cards (§12.6); Document Hunt shows all of them. */
  maxCards?: number;
  promptKey?: string;
  shuffle?: boolean;
  onPlayAudio?: (audioKey: string) => void;
};

export function Triage({
  stepId,
  ctx,
  onComplete,
  buckets,
  cards,
  layout = 'queue',
  bounceWrong = false,
  maxCards,
  promptKey,
  shuffle = false,
  onPlayAudio,
}: TriageProps) {
  const t = useT();

  const initial = useMemo<QueueEntry[]>(
    () => selectCards(cards, ctx.level, ctx.seed, { maxCards, shuffle }),
    [cards, ctx.level, ctx.seed, maxCards, shuffle],
  );

  const [queue, setQueue] = useState<QueueEntry[]>(initial);
  const [cursor, setCursor] = useState(0);
  const [records, setRecords] = useState<SortRecord[]>([]);
  const [placed, setPlaced] = useState<Record<string, string>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [bounce, setBounce] = useState<{ cardId: string; reasonKey?: string } | null>(null);
  const [phase, setPhase] = useState<'sorting' | 'summary'>('sorting');

  const startedAt = useRef<number>(Date.now());

  const current = layout === 'queue' ? queue[cursor] : undefined;
  const remaining = layout === 'queue' ? queue.length - cursor : 0;

  function sort(entry: QueueEntry, bucketId: string) {
    const answer = expectedBucket(entry);
    const correct = answer == null ? undefined : answer === bucketId;
    const ms = Date.now() - startedAt.current;

    // Document Hunt: the wrong document comes straight back out of the folder.
    if (bounceWrong && correct === false) {
      setRecords((r) => [...r, { card: entry, bucketId, correct, ms }]);
      setBounce({ cardId: entry.id, reasonKey: explanationKey(entry) });
      setSelectedId(null);
      startedAt.current = Date.now();
      return;
    }

    setRecords((r) => [...r, { card: entry, bucketId, correct, ms }]);
    setPlaced((p) => ({ ...p, [entry.id]: bucketId }));
    setSelectedId(null);
    setBounce(null);
    startedAt.current = Date.now();

    if (layout === 'queue') {
      // Re-queue the card with its new context, once.
      const needsRecontext = entry.recontext && !entry.isRecontext;
      setQueue((q) => {
        const next = q.slice();
        if (needsRecontext && entry.recontext) {
          next.push({ ...entry, isRecontext: true, contextKey: entry.recontext.contextKey });
        }
        return next;
      });
      setCursor((c) => {
        const nextCursor = c + 1;
        const total = queue.length + (needsRecontext ? 1 : 0);
        if (nextCursor >= total) setPhase('summary');
        return nextCursor;
      });
    }
  }

  function finish() {
    const choices: MiniGameChoice[] = records.map((r) => ({
      stepId,
      choiceId: `${r.card.id}:${r.bucketId}`,
      correct: r.correct,
      ms: r.ms,
    }));

    const conceptDeltas: Record<ConceptId, number> = {};
    const misconceptions: MisconceptionId[] = [];

    for (const r of records) {
      if (!r.card.concepts) continue;
      for (const [concept, target] of Object.entries(r.card.concepts)) {
        // Ambiguous cards are treated as correct — they cannot be got wrong.
        conceptDeltas[concept] = r.correct === false ? WRONG_TARGET : target;
      }
      if (r.correct === false && r.card.misconception) {
        misconceptions.push(r.card.misconception);
      }
    }

    const outcome: VerbOutcome = {
      choices,
      conceptDeltas,
      misconceptions: [...new Set(misconceptions)],
      detail: { records, placed },
    };
    onComplete(outcome);
  }

  // -- summary -------------------------------------------------------------
  if (phase === 'summary') {
    // Only the final showing of each card is reviewed, so a re-contexted card
    // is discussed once, with its new context.
    const lastByCard = new Map<string, SortRecord>();
    for (const r of records) lastByCard.set(r.card.id, r);
    const reviewable = [...lastByCard.values()].filter(
      (r) => r.correct === false || (r.correct === undefined && explanationKey(r.card)),
    );

    return (
      <section className="triage triage--summary">
        <h2>{t('verb.triage.summary_title')}</h2>
        {reviewable.length === 0 ? (
          <p>{t('verb.triage.all_agreed')}</p>
        ) : (
          <ul>
            {reviewable.map((r) => (
              <li key={r.card.id}>
                <strong>{t(r.card.textKey)}</strong>
                <p>
                  {r.correct === undefined
                    ? t('verb.triage.another_way')
                    : t('verb.triage.you_sorted', {
                        bucket: t(
                          buckets.find((b) => b.id === r.bucketId)?.labelKey ?? r.bucketId,
                        ),
                      })}
                </p>
                {explanationKey(r.card) && <p>{t(explanationKey(r.card)!)}</p>}
              </li>
            ))}
          </ul>
        )}
        <button type="button" onClick={finish}>
          {t('common.continue')}
        </button>
      </section>
    );
  }

  // -- board layout (Document Hunt) ----------------------------------------
  if (layout === 'board') {
    const loose = queue.filter((c) => placed[c.id] === undefined);
    const inBucket = (bucketId: string) => queue.filter((c) => placed[c.id] === bucketId);

    return (
      <section className="triage triage--board">
        {promptKey && <p>{t(promptKey)}</p>}

        <ul className="triage__items">
          {loose.map((card) => (
            <li key={card.id}>
              <button
                type="button"
                aria-pressed={selectedId === card.id}
                onClick={() => setSelectedId(selectedId === card.id ? null : card.id)}
              >
                {card.imageKey && <span className="triage__art" data-image={card.imageKey} />}
                {t(card.textKey)}
              </button>
              {bounce?.cardId === card.id && (
                <p role="alert">
                  {bounce.reasonKey ? t(bounce.reasonKey) : t('verb.triage.not_this_one')}
                </p>
              )}
            </li>
          ))}
        </ul>

        <div className="triage__buckets">
          {buckets.map((bucket) => (
            <div key={bucket.id}>
              <button
                type="button"
                disabled={selectedId === null}
                onClick={() => {
                  const card = queue.find((c) => c.id === selectedId);
                  if (card) sort(card, bucket.id);
                }}
              >
                {bucket.emoji} {t(bucket.labelKey)}
              </button>
              <ul>
                {inBucket(bucket.id).map((c) => (
                  <li key={c.id}>{t(c.textKey)}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <button type="button" onClick={() => setPhase('summary')}>
          {t('verb.triage.done')}
        </button>
      </section>
    );
  }

  // -- queue layout (Swipe Sort) -------------------------------------------
  if (!current) return null;

  return (
    <section className="triage triage--queue">
      {promptKey && <p>{t(promptKey)}</p>}
      <p aria-live="polite">{t('verb.triage.remaining', { count: remaining })}</p>

      <article className="triage__card">
        {current.imageKey && <span className="triage__art" data-image={current.imageKey} />}
        <h3>{t(current.textKey)}</h3>
        {current.amount !== undefined && <p>{rupees(current.amount)}</p>}
        {current.contextKey && <p className="triage__context">{t(current.contextKey)}</p>}
        {current.audioKey && onPlayAudio && (
          <button
            type="button"
            aria-label={t('common.play_audio')}
            onClick={() => onPlayAudio(current.audioKey!)}
          >
            🔊
          </button>
        )}
      </article>

      <div className="triage__buckets">
        {buckets.map((bucket) => (
          <button key={bucket.id} type="button" onClick={() => sort(current, bucket.id)}>
            {bucket.emoji} {t(bucket.labelKey)}
          </button>
        ))}
      </div>
    </section>
  );
}
