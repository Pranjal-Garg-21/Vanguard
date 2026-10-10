/**
 * UC-PB-02 Jar Split — P3.
 *
 * The first monthly budget, and the game the LifePath month loop leans on: the
 * plan it produces is what the engine spends from for the rest of the month.
 *
 * Income arrives as coins scaled to the character — ₹800 for a school student,
 * ₹12,000 for a first earner — so the same screen is a different problem for
 * each one. The bills attach to Needs, so under-funding it names the bill that
 * will not be paid rather than showing a score.
 */

import { useMemo, useState } from 'react';

import { rupees, useT } from '@/platform';
import { Allocate, type AllocateDetail, type AllocateJar } from '@/runtime/verbs/allocate';
import type { VerbOutcome } from '@/runtime/verbs/types';
import { combine, type GameProps } from '../shared/game';
import { characterBills, incomeFromContext } from '../shared/economics';
import { buildStatement, type MonthEndStatement } from './logic/statement';
import content from '@/content/scenarios/plan/jar-split.json';

export function JarSplit({ ctx, onComplete }: GameProps) {
  const t = useT();

  const [phase, setPhase] = useState<'hook' | 'allocate' | 'statement'>('hook');
  const [outcome, setOutcome] = useState<VerbOutcome | null>(null);

  const income = incomeFromContext(ctx);
  const bills = useMemo(() => characterBills(ctx.persona), [ctx.persona]);

  const jars = useMemo<AllocateJar[]>(
    () =>
      content.jars.map((jar) => ({
        id: jar.id,
        textKey: jar.textKey,
        emoji: jar.emoji,
        // Only the Needs jar carries the month's known bills.
        bills: 'attachBills' in jar && jar.attachBills ? bills : undefined,
        minLevel: ('minLevel' in jar ? jar.minLevel : 1) as 1 | 2 | 3,
      })),
    [bills],
  );

  const statement = useMemo<MonthEndStatement | null>(() => {
    const detail = outcome?.detail as AllocateDetail | undefined;
    if (!detail) return null;
    return buildStatement(income, bills, detail.allocations);
  }, [outcome, income, bills]);

  if (phase === 'hook') {
    return (
      <section className="game game--pb02">
        <p>{t(content.hookKey)}</p>
        <p>{t('pb02.statement.income', { amount: rupees(income) })}</p>
        <button type="button" onClick={() => setPhase('allocate')}>
          {t('common.continue')}
        </button>
      </section>
    );
  }

  if (phase === 'allocate') {
    return (
      <Allocate
        stepId="pb02.split"
        ctx={ctx}
        total={income}
        jars={jars}
        promptKey={content.promptKey}
        concepts={{ budget_jars: 0.9, fixed_vs_variable: 0.7 }}
        onComplete={(result) => {
          setOutcome(result);
          setPhase('statement');
        }}
      />
    );
  }

  if (statement) {
    return (
      <section className="game game--pb02">
        <h3>{t('pb02.statement.title')}</h3>
        <p>{t('pb02.statement.income', { amount: rupees(statement.income) })}</p>

        <ul className="statement">
          {statement.billsPaid.map((bill) => (
            <li key={bill.id} data-paid="true">
              {t('pb02.statement.paid', { bill: t(bill.textKey), amount: rupees(bill.amount) })}
            </li>
          ))}
          {statement.billsMissed.map((bill) => (
            <li key={bill.id} data-paid="false">
              {t('pb02.statement.missed', { bill: t(bill.textKey), amount: rupees(bill.amount) })}
            </li>
          ))}
        </ul>

        <p>{t('pb02.statement.future', { amount: rupees(statement.futureKept) })}</p>
        <p>
          {t('pb02.statement.needs_share', {
            percent: Math.round(statement.needsShare * 100),
          })}
        </p>

        {/* One line, chosen by the rules in logic/statement.ts. */}
        <p className="statement__verdict">
          {t(statement.verdictKey, { amount: rupees(statement.futureKept) })}
        </p>

        <p>{t(content.conceptCard.textKey)}</p>

        <button
          type="button"
          onClick={() =>
            onComplete(
              combine(content.summaryKey, [
                {
                  choices: outcome?.choices ?? [],
                  conceptDeltas: outcome?.conceptDeltas ?? {},
                  misconceptions: outcome?.misconceptions ?? [],
                  // The plan the engine spends from for the rest of the month.
                  effects: {
                    'money.savingsJars.needs': statement.allocations.needs ?? 0,
                    'money.savingsJars.wants': statement.allocations.wants ?? 0,
                    'money.savingsJars.future': statement.allocations.future ?? 0,
                    'money.savingsJars.emergency': statement.allocations.emergency ?? 0,
                  },
                },
              ]),
            )
          }
        >
          {t('common.continue')}
        </button>
      </section>
    );
  }

  return null;
}
