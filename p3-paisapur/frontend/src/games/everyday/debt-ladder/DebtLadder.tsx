/**
 * UC-BR-01 Debt Cost Ladder — P3.
 *
 * The character needs ₹2,000 for three months. Five ways to get it. The student
 * ranks them by what they actually pay back, sees the ladder, picks one, and
 * then misses a payment — because the missed payment is where the four options
 * stop looking similar.
 *
 * The misconception this is built to catch is `compare_emi_not_total`. Buy-now-
 * pay-later has the SMALLEST instalment of the four (₹400) and the second
 * LARGEST total (₹2,400), because it stretches over six months rather than the
 * three the money is needed for. Ranking by the monthly figure therefore gets
 * the order wrong, which is the point. Every option shows its instalment, its
 * term and its total side by side, so the student can see the trap rather than
 * being told about it afterwards.
 */

import { useMemo, useState } from 'react';

import { useT } from '@/platform';
import { Rank, type RankDetail, type RankItem } from '@/runtime/verbs/rank';
import type { RichEffectMap, VerbOutcome } from '@/runtime/verbs/types';
import { combine, type GameProps } from '../shared/game';
import { conceptMap, effectMap } from '@/runtime/verbs/types';
import content from '@/content/scenarios/borrow/debt-ladder.json';
import { ladderOptions, type LadderOption } from './logic/ladder';

type Option = LadderOption;

/** Values every line about a lender can use. */
const varsFor = (o: Option) => ({
  total: o.value,
  monthly: o.monthlyPayment,
  months: o.months,
  rate: o.ratePercent,
  yearly: Math.round(o.ratePercent * 12),
  fee: o.feePercent,
  borrowed: o.borrowed,
  principal: content.principal,
});

type Phase = 'hook' | 'rank' | 'choose' | 'missed' | 'concept';

export function DebtLadder({ ctx, onComplete }: GameProps) {
  const t = useT();

  const [phase, setPhase] = useState<Phase>('hook');
  const [rankOutcome, setRankOutcome] = useState<VerbOutcome | null>(null);
  const [chosen, setChosen] = useState<Option | null>(null);
  const options = useMemo(() => ladderOptions(), []);

  /**
   * Did the student order by monthly payment instead of by total repaid? That
   * is the compare_emi_not_total misconception, and it is worth naming only
   * when it actually happened.
   */
  const rankedByInstalment = useMemo(() => {
    const detail = rankOutcome?.detail as RankDetail | undefined;
    if (!detail) return false;
    const byInstalment = [...options]
      .sort((a, b) => a.monthlyPayment - b.monthlyPayment)
      .map((o) => o.id);
    return (
      detail.inversions > 0 && detail.order.every((id, i) => id === byInstalment[i])
    );
  }, [rankOutcome, options]);

  const items = useMemo<RankItem[]>(
    () =>
      options.map((o) => ({
        id: o.id,
        textKey: o.textKey,
        value: o.value,
        revealKey: o.revealKey,
        revealVars: varsFor(o),
        concepts: conceptMap(o.concepts),
        misconception: o.misconception,
      })),
    [options],
  );

  function finish(option: Option | null) {
    const detail = rankOutcome?.detail as RankDetail | undefined;

    // Not borrowing is a real answer: no debt, nothing owed.
    if (!option) {
      onComplete(
        combine(content.summaryKey, [
          {
            choices: [...(rankOutcome?.choices ?? []), { stepId: 'br01.choose', choiceId: 'none', ms: detail?.elapsedMs ?? 0 }],
            conceptDeltas: rankOutcome?.conceptDeltas ?? {},
            misconceptions: rankOutcome?.misconceptions ?? [],
          },
        ]),
      );
      return;
    }

    // Taking the money is a real debt in the simulation, not just a score.
    const effects: RichEffectMap = {
      'money.debt.add': {
        amount: option.borrowed,
        lender: option.id,
        totalRepayable: option.value,
        months: option.months,
      },
      ...effectMap('chooseEffects' in option ? option.chooseEffects : undefined),
      ...effectMap('missedEffects' in option ? option.missedEffects : undefined),
    };
    if ('flags' in option && option.flags) {
      for (const [flag, value] of Object.entries(option.flags as Record<string, boolean>)) {
        effects[`meta.flags.${flag}`] = value;
      }
    }

    const result = combine(content.summaryKey, [
      {
        choices: rankOutcome?.choices ?? [],
        conceptDeltas: rankOutcome?.conceptDeltas ?? {},
        misconceptions: rankOutcome?.misconceptions ?? [],
      },
      {
        choices: [
          {
            stepId: 'br01.choose',
            choiceId: option.id,
            // Choosing an expensive option is a decision, not a wrong answer —
            // sometimes family is not an option. Only the ranking is scored.
            ms: detail?.elapsedMs ?? 0,
          },
        ],
        conceptDeltas: {},
        misconceptions:
          'misconception' in option && option.misconception ? [option.misconception] : [],
        effects,
      },
    ]);

    onComplete(result);
  }

  if (phase === 'hook') {
    return (
      <section className="game game--br01">
        <p>{t(content.hookKey, { principal: content.principal })}</p>
        <button type="button" onClick={() => setPhase('rank')}>
          {t('common.continue')}
        </button>
      </section>
    );
  }

  if (phase === 'rank') {
    return (
      <Rank
        stepId="br01.rank"
        ctx={ctx}
        items={items}
        direction="asc"
        costUnit="rupees"
        promptKey={content.promptKey}
        promptVars={{ principal: content.principal }}
        onComplete={(outcome) => {
          setRankOutcome(outcome);
          setPhase('choose');
        }}
      />
    );
  }

  if (phase === 'choose') {
    return (
      <section className="game game--br01">
        <p>{t(content.chooseKey)}</p>
        <ul>
          {options.map((option) => (
            <li key={option.id}>
              <button
                type="button"
                onClick={() => {
                  setChosen(option);
                  setPhase('missed');
                }}
              >
                <strong>{t(option.textKey)}</strong>
                {/* Both figures, side by side — this is the whole lesson. */}
                <span>
                  {t('br01.monthly_vs_total', {
                    monthly: option.monthlyPayment,
                    months: option.months,
                    total: option.value,
                  })}
                </span>
              </button>
            </li>
          ))}
          <li>
            <button type="button" onClick={() => finish(null)}>
              <strong>{t('br01.none.text')}</strong>
              <span>{t('br01.none.detail')}</span>
            </button>
          </li>
        </ul>
      </section>
    );
  }

  if (phase === 'missed' && chosen) {
    return (
      <section className="game game--br01">
        <h3>{t('br01.missed_title')}</h3>
        <p>{t('br01.chose', { option: t(chosen.textKey) })}</p>
        <p>{t('br01.missed_intro')}</p>
        <p>{t(chosen.missedPaymentKey)}</p>
        <button type="button" onClick={() => setPhase('concept')}>
          {t('common.continue')}
        </button>
      </section>
    );
  }

  if (phase === 'concept' && chosen) {
    return (
      <section className="game game--br01">
        <p>{t(content.conceptCard.textKey)}</p>
        <p>
          {t('br01.result.cheapest_first', {
            family: options.find((o) => o.id === 'family')?.value ?? content.principal,
            diff: (options.find((o) => o.id === 'loan_app')?.value ?? 0) - (options.find((o) => o.id === 'family')?.value ?? 0),
            principal: content.principal,
          })}
        </p>
        {/* Only called out when they actually fell for it. */}
        {rankedByInstalment && <p>{t('br01.result.emi_trap')}</p>}
        <p>{t('br01.borrowed', { amount: content.principal })}</p>
        <button type="button" onClick={() => finish(chosen)}>
          {t('common.continue')}
        </button>
      </section>
    );
  }

  return null;
}
