/**
 * Allocate verb — P3.
 *
 * "Student splits an amount across jars." Used by:
 *   • UC-PB-02 Jar Split        — income into Needs / Wants / Future (MVP)
 *   • UC-BANK-02 Bank Counter   — the opening deposit
 *   • UC-SM-04 Where to Keep Your Money (stretch)
 *   • P4's investment mix, P3's Debt Cost Ladder repayment split
 *
 * Tap-to-move: tap a coin in the tray, tap a jar. No drag.
 *
 * The teaching mechanic is the **live overflow check** (§12.6): bills are
 * attached to a jar, and if the student under-funds that jar the Next button
 * names the bill that will not be paid. The lesson is "your bus pass won't be
 * covered", not a score.
 */

import { useMemo, useRef, useState } from 'react';

import { rupees, useT } from '@/platform';
import {
  billsTotal,
  findUnderfunded,
  sum,
  type AllocateDetail,
  type AllocateJar,
} from './logic/jars';
import type {
  ConceptId,
  MiniGameChoice,
} from '@/core/types';
import { WRONG_TARGET } from '../types';
import type {
  VerbCommonProps,
  VerbOutcome,
} from '../types';

export type AllocateProps = VerbCommonProps & {
  /** Income for the month, already scaled to the persona by the caller. */
  total: number;
  jars: AllocateJar[];
  /**
   * `auto` picks coins at L1–L2 and sliders at L3, matching the plan's
   * "L1 coins only, L3 percentages and custom jars".
   */
  mode?: 'coins' | 'slider' | 'auto';
  /** L1 uses a single ₹50 coin so the maths stays countable. */
  coinDenominations?: number[];
  /** Everything must be allocated before continuing. */
  requireFull?: boolean;
  promptKey?: string;
  concepts?: Record<ConceptId, number>;
  onPlayAudio?: (audioKey: string) => void;
};

export function Allocate({
  stepId,
  ctx,
  onComplete,
  total,
  jars,
  mode = 'auto',
  coinDenominations,
  requireFull = true,
  promptKey,
  concepts,
  onPlayAudio,
}: AllocateProps) {
  const t = useT();

  const visibleJars = useMemo(
    () => jars.filter((j) => (j.minLevel ?? 1) <= ctx.level),
    [jars, ctx.level],
  );

  const effectiveMode = mode === 'auto' ? (ctx.level === 3 ? 'slider' : 'coins') : mode;

  // L1 keeps a single small denomination so counting stays possible; higher
  // levels get bigger coins so a ₹12,000 salary is not 240 taps.
  const coins = useMemo(() => {
    if (coinDenominations) return coinDenominations;
    if (ctx.level === 1) return [50];
    return total >= 5000 ? [100, 500, 1000] : [50, 100, 500];
  }, [coinDenominations, ctx.level, total]);

  const [allocations, setAllocations] = useState<Record<string, number>>(() =>
    Object.fromEntries(visibleJars.map((j) => [j.id, 0])),
  );
  const [selectedCoin, setSelectedCoin] = useState<number | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const startedAt = useRef<number>(Date.now());

  const allocated = sum(Object.values(allocations));
  const remaining = total - allocated;
  const underfunded = findUnderfunded(visibleJars, allocations);

  function addTo(jarId: string, amount: number) {
    if (amount <= 0) return;
    const capped = Math.min(amount, remaining);
    if (capped <= 0) {
      setWarning('verb.allocate.nothing_left');
      return;
    }
    setWarning(null);
    setAllocations((a) => ({ ...a, [jarId]: (a[jarId] ?? 0) + capped }));
  }

  function setJar(jarId: string, value: number) {
    const others = sum(
      Object.entries(allocations)
        .filter(([id]) => id !== jarId)
        .map(([, v]) => v),
    );
    const capped = Math.max(0, Math.min(value, total - others));
    setAllocations((a) => ({ ...a, [jarId]: capped }));
  }

  function takeBack(jarId: string) {
    setAllocations((a) => ({ ...a, [jarId]: 0 }));
  }

  function finish() {
    const detail: AllocateDetail = {
      allocations,
      remaining,
      underfunded,
      billsCovered: underfunded.length === 0,
    };

    const choices: MiniGameChoice[] = visibleJars.map((jar) => ({
      stepId,
      choiceId: `${jar.id}:${allocations[jar.id] ?? 0}`,
      correct: underfunded.some((u) => u.jarId === jar.id) ? false : undefined,
      ms: Date.now() - startedAt.current,
    }));

    const conceptDeltas: Record<ConceptId, number> = {};
    if (concepts) {
      for (const [concept, target] of Object.entries(concepts)) {
        conceptDeltas[concept] = detail.billsCovered ? target : WRONG_TARGET;
      }
    }

    const outcome: VerbOutcome = {
      choices,
      conceptDeltas,
      misconceptions: [],
      detail,
    };
    onComplete(outcome);
  }

  const canContinue = requireFull ? remaining === 0 : true;

  return (
    <section className="allocate">
      {promptKey && <p>{t(promptKey)}</p>}

      <p className="allocate__remaining" aria-live="polite">
        {t('verb.allocate.remaining', { amount: remaining })}
      </p>

      {effectiveMode === 'coins' && (
        <div className="allocate__tray">
          {coins.map((coin) => (
            <button
              key={coin}
              type="button"
              aria-pressed={selectedCoin === coin}
              disabled={coin > remaining}
              onClick={() => setSelectedCoin(selectedCoin === coin ? null : coin)}
            >
              {rupees(coin)}
            </button>
          ))}
          {remaining > 0 && (
            <button type="button" onClick={() => setSelectedCoin(remaining)}>
              {t('verb.allocate.all_of_it', { amount: remaining })}
            </button>
          )}
        </div>
      )}

      <ul className="allocate__jars">
        {visibleJars.map((jar) => {
          const value = allocations[jar.id] ?? 0;
          const needed = billsTotal(jar);
          const short = underfunded.find((u) => u.jarId === jar.id);
          const pct = total > 0 ? Math.round((value / total) * 100) : 0;

          return (
            <li key={jar.id} className="allocate__jar">
              <h3>
                {jar.emoji} {t(jar.textKey)}
              </h3>
              <p>
                {rupees(value)}
                {ctx.level === 3 && ` · ${pct}%`}
              </p>

              {jar.bills && jar.bills.length > 0 && (
                <ul className="allocate__bills">
                  {jar.bills.map((bill) => (
                    <li key={bill.id}>
                      {t(bill.textKey)} · {rupees(bill.amount)}
                    </li>
                  ))}
                </ul>
              )}

              {effectiveMode === 'coins' ? (
                <button
                  type="button"
                  disabled={selectedCoin === null}
                  onClick={() => {
                    if (selectedCoin !== null) addTo(jar.id, selectedCoin);
                  }}
                >
                  {t('verb.allocate.put_here')}
                </button>
              ) : (
                <input
                  type="range"
                  min={0}
                  max={total}
                  step={Math.max(10, Math.round(total / 100))}
                  value={value}
                  aria-label={t(jar.textKey)}
                  onChange={(e) => setJar(jar.id, Number(e.currentTarget.value))}
                />
              )}

              {value > 0 && (
                <button type="button" onClick={() => takeBack(jar.id)}>
                  {t('verb.allocate.take_back')}
                </button>
              )}

              {/* The live overflow check — the whole point of the game. */}
              {short && (
                <p role="status" className="allocate__overflow">
                  {short.firstUncoveredBillKey
                    ? t('verb.allocate.bill_uncovered', {
                        bill: t(short.firstUncoveredBillKey),
                      })
                    : t('verb.allocate.short_by', { amount: short.shortfall })}
                </p>
              )}
              {needed > 0 && !short && (
                <p className="allocate__covered">{t('verb.allocate.bills_covered')}</p>
              )}

              {jar.audioKey && onPlayAudio && (
                <button
                  type="button"
                  aria-label={t('common.play_audio')}
                  onClick={() => onPlayAudio(jar.audioKey!)}
                >
                  🔊
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {warning && <p role="alert">{t(warning)}</p>}

      <button type="button" disabled={!canContinue} onClick={finish}>
        {underfunded.length > 0
          ? t('verb.allocate.continue_anyway')
          : t('common.continue')}
      </button>

      {!canContinue && <p>{t('verb.allocate.allocate_all_first')}</p>}
    </section>
  );
}
