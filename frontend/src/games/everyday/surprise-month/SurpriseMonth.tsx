/**
 * UC-SM-03 Surprise Month — P3.
 *
 * A shock arrives. With a buffer the character pays it and the month carries
 * on; without one they pick between four options that all cost something, none
 * of which is mocked. Then they decide how big a buffer would have made it a
 * non-event, which opens the Emergency jar in Jar Split.
 *
 * This is a `checkpoint` scenario — P1's Rewind treats it as the favourite
 * branch point, so the state before the choice has to be snapshot-able.
 *
 * TODO(P2): the option list is the Choose verb's job. Built inline until it
 * lands; the content shape already matches §6.3's `play.options`.
 */

import { useMemo, useState } from 'react';

import { rupees, useT } from '@/platform';
import { combine, type GameProps } from '../shared/game';
import { conceptMap, effectMap } from '@/runtime/verbs/types';
import { bufferFromContext, emergencyTargets, pickShock, type Shock } from './logic/shock';
import content from '@/content/scenarios/save/surprise-month.json';

type Option = (typeof content.options)[number];

export function SurpriseMonth({ ctx, onComplete }: GameProps) {
  const t = useT();

  const shock = useMemo(
    () => pickShock(content.shocks as Shock[], ctx),
    [ctx],
  );
  const buffer = bufferFromContext(ctx);
  const covered = shock !== undefined && buffer >= shock.amount;

  const targets = useMemo(
    () => emergencyTargets(ctx, content.targetMonthsOfNeeds),
    [ctx],
  );

  const [phase, setPhase] = useState<'hook' | 'choose' | 'result' | 'reflect'>('hook');
  const [chosen, setChosen] = useState<Option | null>(null);
  const [target, setTarget] = useState<number | null>(null);
  const [startedAt] = useState(() => Date.now());

  if (!shock) return null;

  // With a buffer there is no decision to make, which is exactly the lesson.
  const options = content.options.filter((option) =>
    'needsBuffer' in option && option.needsBuffer ? covered : !covered,
  );

  if (phase === 'hook') {
    return (
      <section className="game game--sm03">
        <p>{t(shock.hookKey, { amount: rupees(shock.amount) })}</p>
        <p className={covered ? 'buffer buffer--have' : 'buffer buffer--none'}>
          {covered
            ? t('sm03.buffer.have', { amount: rupees(buffer) })
            : t('sm03.buffer.none')}
        </p>
        <button type="button" onClick={() => setPhase('choose')}>
          {t('common.continue')}
        </button>
      </section>
    );
  }

  if (phase === 'choose') {
    return (
      <section className="game game--sm03">
        <ul className="choose__options">
          {options.map((option) => (
            <li key={option.id}>
              <button
                type="button"
                onClick={() => {
                  setChosen(option);
                  setPhase('result');
                }}
              >
                {t(option.textKey)}
              </button>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  if (phase === 'result' && chosen) {
    return (
      <section className="game game--sm03">
        <p>{t(chosen.resultKey)}</p>
        {'badge' in chosen && chosen.badge && (
          <p className="badge">🛡️ {t(`sm03.badge.${chosen.badge}`)}</p>
        )}
        <p>{t(content.conceptCard.textKey)}</p>
        <button type="button" onClick={() => setPhase('reflect')}>
          {t('common.continue')}
        </button>
      </section>
    );
  }

  if (phase === 'reflect' && chosen) {
    return (
      <section className="game game--sm03">
        <h3>{t('sm03.reflect.question')}</h3>
        <ul className="reflect__options">
          {targets.map((option) => (
            <li key={option.months}>
              <button
                type="button"
                aria-pressed={target === option.amount}
                onClick={() => setTarget(option.amount)}
              >
                {t('sm03.reflect.option', {
                  amount: rupees(option.amount),
                  label: t(option.labelKey),
                })}
              </button>
            </li>
          ))}
        </ul>

        {target !== null && (
          <p>{covered ? t('sm03.reflect.already') : t('sm03.reflect.saved')}</p>
        )}

        <button
          type="button"
          disabled={target === null}
          onClick={() => {
            const effects = {
              ...effectMap(chosen.effects),
              // Opens the Emergency jar in Jar Split (UC-PB-02).
              'meta.flags.hasEmergencyJar': true,
              'meta.goals.emergencyTarget': target ?? 0,
              ...('flags' in chosen && chosen.flags
                ? Object.fromEntries(
                    Object.entries(chosen.flags).map(([f, v]) => [`meta.flags.${f}`, v]),
                  )
                : {}),
            };

            onComplete(
              combine(content.summaryKey, [
                {
                  choices: [
                    {
                      stepId: 'sm03.choose',
                      choiceId: chosen.id,
                      ms: Date.now() - startedAt,
                    },
                  ],
                  conceptDeltas: conceptMap(chosen.concepts),
                  misconceptions:
                    'misconception' in chosen && chosen.misconception
                      ? [chosen.misconception]
                      : [],
                  effects,
                },
              ]),
            );
          }}
        >
          {t('common.continue')}
        </button>
      </section>
    );
  }

  return null;
}
