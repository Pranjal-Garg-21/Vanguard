/**
 * Rank verb — P3.
 *
 * "Student puts a list in order." Used by:
 *   • UC-BR-01 Debt Cost Ladder — cheapest to most expensive borrowing (MVP)
 *   • UC-SAFE-10 Rescue Mission — the six fraud-recovery steps, in order (MVP)
 *   • UC-SM-02 Spending Detective — rank the leaks by size (MVP)
 *
 * Reordering is tap-to-move: ▲ / ▼ buttons, not drag. Native buttons means
 * keyboard order-changing works with no extra code.
 *
 * §10.2 says the feedback is "cost of their order vs the best order, in ₹" —
 * so this verb computes that, rather than showing a right/wrong tick.
 */

import { useMemo, useRef, useState } from 'react';

import { rupees, useT } from '@/platform';
import { deriveSeed, makeRng, shuffled } from '../shared/rng';
import {
  bestOrder,
  scoreOrder,
  type RankDetail,
  type RankItem,
} from './logic/score';
import type { ConceptId, MiniGameChoice } from '@/core/types';
import type {
  VerbCommonProps,
} from '../types';

export type RankProps = VerbCommonProps & {
  items: RankItem[];
  /** `asc` = lowest value first is correct (cheapest debt, first step). */
  direction?: 'asc' | 'desc';
  /**
   * `rupees` shows the money cost of the student's order. `none` is for orders
   * where the value is a sequence, not an amount (Rescue Mission steps).
   */
  costUnit?: 'rupees' | 'none';
  /** Rescue Mission shows a clock: acting fast matters. Never a countdown. */
  timed?: boolean;
  promptKey?: string;
  /** Values for the prompt's {placeholders}. */
  promptVars?: Record<string, string | number>;
  shuffle?: boolean;
  onPlayAudio?: (audioKey: string) => void;
};

export function Rank({
  stepId,
  ctx,
  onComplete,
  items,
  direction = 'asc',
  costUnit = 'rupees',
  timed = false,
  promptKey,
  promptVars,
  shuffle = false,
  onPlayAudio,
}: RankProps) {
  const t = useT();

  // Presentation order must never start in the correct order, or the student
  // can submit without thinking. Shuffling is seeded so a replayed life deals
  // the same starting order (§9.2); rotating by one is the fallback.
  const initial = useMemo(() => {
    const ids = shuffle
      ? shuffled(
          items.map((i) => i.id),
          makeRng(deriveSeed(ctx.seed, `rank:${stepId}`)),
        )
      : items.map((i) => i.id);
    const correct = bestOrder(items, direction);
    const sameAsCorrect = ids.every((id, idx) => id === correct[idx]);
    const first = ids[0];
    return sameAsCorrect && ids.length > 1 && first !== undefined
      ? [...ids.slice(1), first]
      : ids;
  }, [items, direction, shuffle, ctx.seed, stepId]);

  const [order, setOrder] = useState<string[]>(initial);
  const [result, setResult] = useState<RankDetail | null>(null);
  const startedAt = useRef<number>(Date.now());

  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= order.length) return;
    setOrder((o) => {
      const next = o.slice();
      const from = next[index];
      const to = next[target];
      if (from === undefined || to === undefined) return o;
      next[index] = to;
      next[target] = from;
      return next;
    });
  }

  function submit() {
    setResult(scoreOrder(order, items, direction, Date.now() - startedAt.current));
  }

  function finish(detail: RankDetail) {
    const choices: MiniGameChoice[] = [
      {
        stepId,
        choiceId: detail.order.join('>'),
        correct: detail.inversions === 0,
        ms: detail.elapsedMs,
      },
    ];

    const conceptDeltas: Record<ConceptId, number> = {};
    for (const item of items) {
      if (!item.concepts) continue;
      for (const [concept, target] of Object.entries(item.concepts)) {
        // Partial credit: a nearly-right order should not score like a random one.
        conceptDeltas[concept] = Math.max(
          conceptDeltas[concept] ?? 0,
          target * detail.accuracy,
        );
      }
    }

    const misconceptions =
      detail.inversions > 0
        ? [...new Set(items.map((i) => i.misconception).filter((m): m is string => !!m))]
        : [];

    onComplete({ choices, conceptDeltas, misconceptions, detail });
  }

  // -- reveal --------------------------------------------------------------
  if (result) {
    return (
      <section className="rank rank--result">
        <h3>{t('verb.rank.result_title')}</h3>

        {/* The ladder: best order, with the true value on each rung. */}
        <ol className="rank__ladder">
          {result.bestOrder.map((id, idx) => {
            const item = byId.get(id);
            if (!item) return null;
            const studentPosition = result.order.indexOf(id);
            return (
              <li key={id} data-moved={studentPosition !== idx}>
                <strong>{t(item.textKey)}</strong>
                {costUnit === 'rupees' && <span> · {rupees(item.value)}</span>}
                {item.revealKey && <p>{t(item.revealKey, item.revealVars)}</p>}
              </li>
            );
          })}
        </ol>

        {result.inversions === 0 ? (
          <p>{t('verb.rank.perfect')}</p>
        ) : costUnit === 'rupees' && result.topPickExtraCost > 0 ? (
          <p>{t('verb.rank.top_pick_cost', { amount: result.topPickExtraCost })}</p>
        ) : (
          <p>{t('verb.rank.out_of_order', { count: result.inversions })}</p>
        )}

        {timed && (
          <p>{t('verb.rank.elapsed', { seconds: Math.round(result.elapsedMs / 1000) })}</p>
        )}

        <button type="button" onClick={() => finish(result)}>
          {t('common.continue')}
        </button>
      </section>
    );
  }

  // -- ordering ------------------------------------------------------------
  return (
    <section className="rank">
      {promptKey && <p>{t(promptKey, promptVars)}</p>}

      <ol className="rank__list">
        {order.map((id, idx) => {
          const item = byId.get(id);
          if (!item) return null;
          return (
            <li key={id}>
              <span>{t(item.textKey)}</span>
              {item.audioKey && onPlayAudio && (
                <button
                  type="button"
                  aria-label={t('common.play_audio')}
                  onClick={() => onPlayAudio(item.audioKey!)}
                >
                  🔊
                </button>
              )}
              <button
                type="button"
                disabled={idx === 0}
                aria-label={t('verb.rank.move_up', { item: t(item.textKey) })}
                onClick={() => move(idx, -1)}
              >
                ▲
              </button>
              <button
                type="button"
                disabled={idx === order.length - 1}
                aria-label={t('verb.rank.move_down', { item: t(item.textKey) })}
                onClick={() => move(idx, 1)}
              >
                ▼
              </button>
            </li>
          );
        })}
      </ol>

      <button type="button" onClick={submit}>
        {t('verb.rank.check_order')}
      </button>
    </section>
  );
}
