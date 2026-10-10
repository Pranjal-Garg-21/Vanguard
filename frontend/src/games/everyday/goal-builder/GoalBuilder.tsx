/**
 * UC-PB-03 Goal Builder — P3.
 *
 * Predict → set a monthly amount → see the month it lands in → make the goal
 * specific → save it as a commitment that the engine then enforces.
 *
 * TODO(P4): the prediction step is built inline here. Swap it for the Predict
 * verb when that lands — the shape it needs is in `logic/timeline.ts`
 * (`predictionOptions` and `scorePrediction`), kept separate for exactly that.
 */

import { useMemo, useState } from 'react';

import { rupees, useT } from '@/platform';
import { Commit } from '@/runtime/verbs/commit';
import type { MiniGameChoice } from '@/core/types';
import type { VerbOutcome } from '@/runtime/verbs/types';
import { combine, type GameProps } from '../shared/game';
import { characterGoal, disposableIncome } from '../shared/economics';
import { buildPlan, predictionOptions, scorePrediction } from './logic/timeline';
import content from '@/content/scenarios/plan/goal-builder.json';

type Specific = { id: string; textKey: string; amount: number };

export function GoalBuilder({ ctx, onComplete }: GameProps) {
  const t = useT();

  const goal = useMemo(() => characterGoal(ctx.persona), [ctx.persona]);
  const affordable = useMemo(() => disposableIncome(ctx.persona), [ctx.persona]);

  // A starting rate the character could actually manage: half of what is left
  // after the bills, rounded to something countable.
  const startingMonthly = Math.max(50, Math.round(affordable / 2 / 50) * 50);

  const [phase, setPhase] = useState<'hook' | 'predict' | 'plan' | 'specific' | 'commit'>(
    'hook',
  );
  const [guess, setGuess] = useState<number | null>(null);
  const [monthly, setMonthly] = useState(startingMonthly);
  const [specific, setSpecific] = useState<Specific | null>(null);

  const specifics = (content.specifics as Record<string, Specific[]>)[goal.id] ?? [];
  const targetAmount = specific?.amount ?? goal.amount;
  const plan = buildPlan(targetAmount, monthly, content.startMonthOfYear);
  const firstPlan = buildPlan(goal.amount, startingMonthly, content.startMonthOfYear);

  function reachedLine() {
    if (plan.monthsToGoal === undefined) return t('pb03.plan.never');
    if (plan.festivalKey) {
      return t(plan.nextYear ? 'pb03.plan.reached_next_year' : 'pb03.plan.reached_by', {
        monthly: rupees(monthly),
        festival: t(`pb03.festival.${plan.festivalKey}`),
      });
    }
    return t('pb03.plan.reached_in', { monthly: rupees(monthly), count: plan.monthsToGoal });
  }

  if (phase === 'hook') {
    return (
      <section className="game game--pb03">
        <p>{t(content.hookKey)}</p>
        <h3>
          {t(goal.textKey)} · {rupees(goal.amount)}
        </h3>
        <button type="button" onClick={() => setPhase('predict')}>
          {t('common.continue')}
        </button>
      </section>
    );
  }

  if (phase === 'predict') {
    const options = predictionOptions(firstPlan.monthsToGoal);
    return (
      <section className="game game--pb03">
        <p>
          {t('pb03.predict.question', {
            monthly: rupees(startingMonthly),
            amount: rupees(goal.amount),
          })}
        </p>
        <ul className="predict__options">
          {options.map((months) => (
            <li key={months}>
              <button
                type="button"
                onClick={() => {
                  setGuess(months);
                  setPhase('plan');
                }}
              >
                {t('pb03.predict.option', { count: months })}
              </button>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  if (phase === 'plan') {
    const verdict = guess === null ? null : scorePrediction(guess, firstPlan.monthsToGoal);
    return (
      <section className="game game--pb03">
        {verdict && firstPlan.monthsToGoal !== undefined && (
          <p className="predict__verdict">
            {t(verdict.key, { actual: firstPlan.monthsToGoal })}
          </p>
        )}

        <label htmlFor="monthly">{t('pb03.plan.how_much')}</label>
        <input
          id="monthly"
          type="range"
          min={0}
          max={Math.max(100, affordable)}
          step={50}
          value={monthly}
          onChange={(e) => setMonthly(Number(e.currentTarget.value))}
        />
        <p className="plan__rate">{rupees(monthly)}</p>
        <p aria-live="polite">{reachedLine()}</p>

        {/* A goal past the year mark is the common case, not a failure. */}
        {!plan.withinYear && plan.monthsToGoal !== undefined && (
          <>
            <p>
              {t('pb03.plan.year_one', {
                amount: rupees(plan.yearOneAmount),
                percent: Math.round(plan.yearOneShare * 100),
              })}
            </p>
            <p className="plan__long">{t('pb03.plan.long_goal')}</p>
          </>
        )}

        <button type="button" disabled={monthly <= 0} onClick={() => setPhase('specific')}>
          {t('common.continue')}
        </button>
      </section>
    );
  }

  if (phase === 'specific') {
    return (
      <section className="game game--pb03">
        <h3>{t('pb03.specific.title')}</h3>
        <p>{t('pb03.specific.why')}</p>
        <ul className="specific__options">
          {specifics.map((option) => (
            <li key={option.id}>
              <button
                type="button"
                onClick={() => {
                  setSpecific(option);
                  setPhase('commit');
                }}
              >
                <strong>{t(option.textKey)}</strong>
                <span>{rupees(option.amount)}</span>
              </button>
            </li>
          ))}
          {specifics.length === 0 && (
            <li>
              <button type="button" onClick={() => setPhase('commit')}>
                {t(goal.textKey)} · {rupees(goal.amount)}
              </button>
            </li>
          )}
        </ul>
      </section>
    );
  }

  return (
    <section className="game game--pb03">
      <p>{t(content.conceptCard.textKey)}</p>
      <Commit
        stepId="pb03.commit"
        ctx={ctx}
        kind="savings"
        labelKey={specific?.textKey ?? goal.textKey}
        destination="savingsJars.future"
        minAmount={0}
        maxAmount={Math.max(100, affordable)}
        stepAmount={50}
        monthlyIncome={affordable}
        goalAmount={targetAmount}
        concepts={{ goal_setting: 0.9 }}
        onComplete={(outcome: VerbOutcome) => {
          const predictionChoice: MiniGameChoice[] =
            guess === null
              ? []
              : [
                  {
                    stepId: 'pb03.predict',
                    choiceId: String(guess),
                    correct: guess === firstPlan.monthsToGoal,
                    ms: 0,
                  },
                ];

          onComplete(
            combine(content.summaryKey, [
              {
                choices: [...predictionChoice, ...outcome.choices],
                conceptDeltas: outcome.conceptDeltas,
                misconceptions: outcome.misconceptions,
                effects: {
                  ...(outcome.effects ?? {}),
                  // The 🎯 meter on the dashboard.
                  'meta.goals.set': {
                    id: goal.id,
                    labelKey: specific?.textKey ?? goal.textKey,
                    target: targetAmount,
                    monthly,
                  },
                },
              },
            ]),
          );
        }}
      />
    </section>
  );
}
