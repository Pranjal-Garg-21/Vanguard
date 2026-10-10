/**
 * Commit verb — P3.
 *
 * "Student sets a recurring amount and duration." Used by:
 *   • UC-PB-03 Goal Builder     — a monthly transfer to the Future jar (MVP)
 *   • UC-BR-01/02               — an EMI
 *   • P4's SIP                  — a monthly investment
 *
 * The point of this verb (§10.2) is that the result is **a locked obligation
 * that bites if income drops**, not a slider the student can quietly ignore.
 * So it emits a real `Commitment` for P2's engine, and it shows the student
 * what share of their income they are promising away before they confirm.
 */

import { useMemo, useRef, useState } from 'react';

import { rupees, useT } from '@/platform';
import { HEAVY_COMMITMENT_SHARE, monthsToReach } from './logic/goal';
import type {
  ConceptId,
  MiniGameChoice,
} from '@/core/types';
import type {
  Commitment,
  VerbCommonProps,
  VerbOutcome,
} from '../types';

export type CommitProps = VerbCommonProps & {
  kind: Commitment['kind'];
  /** What the student is committing to, e.g. "Laptop fund". */
  labelKey: string;
  /** Jar or account the money lands in, e.g. `savingsJars.future`. */
  destination?: string;
  /** Preset chips. Falls back to a slider range when not given. */
  amounts?: number[];
  minAmount?: number;
  maxAmount?: number;
  stepAmount?: number;
  /** Month counts to offer. `null` means "until I stop". */
  durations?: (number | null)[];
  /** Used for the share-of-income line and the heavy-commitment warning. */
  monthlyIncome?: number;
  /** What the student is saving towards, so we can show when they reach it. */
  goalAmount?: number;
  startMonth?: number;
  promptKey?: string;
  concepts?: Record<ConceptId, number>;
};

export type CommitDetail = {
  commitment: Commitment;
  /** Months to reach `goalAmount` at this rate, when a goal was given. */
  monthsToGoal?: number;
  shareOfIncome?: number;
};

export function Commit({
  stepId,
  ctx,
  onComplete,
  kind,
  labelKey,
  destination,
  amounts,
  minAmount = 0,
  maxAmount,
  stepAmount,
  durations = [3, 6, 12, null],
  monthlyIncome,
  goalAmount,
  startMonth = 0,
  promptKey,
  concepts,
}: CommitProps) {
  const t = useT();

  const presets = useMemo(() => amounts ?? [], [amounts]);
  const sliderMax = maxAmount ?? monthlyIncome ?? 5000;
  const sliderStep = stepAmount ?? Math.max(10, Math.round(sliderMax / 50));

  const [amount, setAmount] = useState<number>(presets[0] ?? minAmount);
  const [duration, setDuration] = useState<number | null>(durations[0] ?? null);
  const [confirming, setConfirming] = useState(false);
  const startedAt = useRef<number>(Date.now());

  const shareOfIncome =
    monthlyIncome && monthlyIncome > 0 ? amount / monthlyIncome : undefined;
  const heavy = shareOfIncome !== undefined && shareOfIncome > HEAVY_COMMITMENT_SHARE;
  const months = goalAmount !== undefined ? monthsToReach(goalAmount, amount) : undefined;

  function confirm() {
    const commitment: Commitment = {
      // Deterministic id: a replay of the same life must produce the same
      // commitment id, so no random or timestamp component here.
      id: `${kind}:${stepId}:${ctx.seed}`,
      kind,
      labelKey,
      amount,
      durationMonths: duration,
      startMonth,
      destination,
    };

    const detail: CommitDetail = { commitment, monthsToGoal: months, shareOfIncome };

    const choices: MiniGameChoice[] = [
      {
        stepId,
        choiceId: `${amount}:${duration ?? 'open'}`,
        ms: Date.now() - startedAt.current,
      },
    ];

    const outcome: VerbOutcome = {
      choices,
      conceptDeltas: concepts ?? {},
      misconceptions: [],
      // §6.3 effect-path convention, matching `money.debt.add`.
      effects: { 'money.commitments.add': commitment },
      detail,
    };
    onComplete(outcome);
  }

  return (
    <section className="commit">
      {promptKey && <p>{t(promptKey)}</p>}
      <h3>{t(labelKey)}</h3>

      <fieldset className="commit__amount">
        <legend>{t('verb.commit.how_much')}</legend>
        {presets.length > 0 ? (
          presets.map((preset) => (
            <button
              key={preset}
              type="button"
              aria-pressed={amount === preset}
              onClick={() => setAmount(preset)}
            >
              {rupees(preset)}
            </button>
          ))
        ) : (
          <input
            type="range"
            min={minAmount}
            max={sliderMax}
            step={sliderStep}
            value={amount}
            aria-label={t('verb.commit.how_much')}
            onChange={(e) => setAmount(Number(e.currentTarget.value))}
          />
        )}
        <p aria-live="polite">{rupees(amount)}</p>
      </fieldset>

      <fieldset className="commit__duration">
        <legend>{t('verb.commit.how_long')}</legend>
        {durations.map((option) => (
          <button
            key={option ?? 'open'}
            type="button"
            aria-pressed={duration === option}
            onClick={() => setDuration(option)}
          >
            {option === null
              ? t('verb.commit.until_i_stop')
              : t('verb.commit.n_months', { count: option })}
          </button>
        ))}
      </fieldset>

      {/* Make the promise concrete before it is made. */}
      {shareOfIncome !== undefined && (
        <p>
          {t('verb.commit.share_of_income', {
            percent: Math.round(shareOfIncome * 100),
          })}
        </p>
      )}
      {months !== undefined && goalAmount !== undefined && (
        <p>
          {t('verb.commit.reach_goal_in', { count: months, amount: goalAmount })}
        </p>
      )}
      {duration !== null && (
        <p>{t('verb.commit.total_over_term', { amount: amount * duration })}</p>
      )}

      {heavy && !confirming && (
        <p role="status">{t('verb.commit.heavy_warning')}</p>
      )}

      {confirming ? (
        <div className="commit__confirm">
          <p>{t('verb.commit.confirm_question')}</p>
          <button type="button" onClick={confirm}>
            {t('verb.commit.confirm_yes')}
          </button>
          <button type="button" onClick={() => setConfirming(false)}>
            {t('verb.commit.confirm_change')}
          </button>
        </div>
      ) : (
        <button type="button" disabled={amount <= 0} onClick={() => setConfirming(true)}>
          {t('verb.commit.set_it')}
        </button>
      )}
    </section>
  );
}
