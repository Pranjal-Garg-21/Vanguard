/**
 * UC-SM-02 Spending Detective — P3.
 *
 * Sort the month into "again and again" and "just once", see the chart, find
 * the biggest repeat, convert it to a year, rank the leaks and halve one.
 *
 * The Triage step is the task §12.6 describes: the student thinks the small
 * things came to about ₹500, and has to find where the rest went. Two buckets
 * is the right shape for that — the categories are already known, what the
 * student has to spot is which payments kept happening.
 *
 * Every transaction is simulated. Nothing here touches a real phone or bank.
 */

import { useMemo, useState } from 'react';

import { rupees, useT } from '@/platform';
import { Triage, type TriageCard } from '@/runtime/verbs/triage';
import { Rank, type RankDetail, type RankItem } from '@/runtime/verbs/rank';
import type { VerbOutcome } from '@/runtime/verbs/types';
import { asBuckets, combine, type GameProps } from '../shared/game';
import { SpendChart } from './components/SpendChart';
import { TransactionList } from './components/TransactionList';
import {
  annualise,
  categoryTotals,
  historyFor,
  leaks,
  lineTotal,
  projectHalving,
  totalOf,
  type Txn,
} from './logic/history';
import content from '@/content/scenarios/save/spending-detective.json';

type Phase = 'hook' | 'sort' | 'chart' | 'rank' | 'pick' | 'done';

export function SpendingDetective({ ctx, onComplete }: GameProps) {
  const t = useT();

  const history = useMemo(() => historyFor(ctx), [ctx]);
  const total = totalOf(history);
  const theLeaks = useMemo(() => leaks(history), [history]);
  const repeatedTotal = history.filter((x) => x.repeated).reduce((s, x) => s + lineTotal(x), 0);

  const colours = useMemo(
    () => Object.fromEntries(content.categories.map((c) => [c.id, c.colour])),
    [],
  );
  const labelKeys = useMemo(
    () => Object.fromEntries(content.categories.map((c) => [c.id, c.textKey])),
    [],
  );

  const [phase, setPhase] = useState<Phase>('hook');
  const [sortOutcome, setSortOutcome] = useState<VerbOutcome | null>(null);
  const [rankOutcome, setRankOutcome] = useState<VerbOutcome | null>(null);
  const [picked, setPicked] = useState<Txn | null>(null);

  const cards = useMemo<TriageCard[]>(
    () =>
      history.map((txn) => ({
        id: txn.id,
        textKey: txn.textKey,
        amount: lineTotal(txn),
        correctBucket: txn.repeated ? 'often' : 'one_off',
        explainKey: undefined,
        concepts: { expense_tracking: 0.8 },
        misconception: txn.repeated ? 'small_spends_dont_matter' : undefined,
      })),
    [history],
  );

  const rankItems = useMemo<RankItem[]>(
    () =>
      theLeaks.map((txn) => ({
        id: txn.id,
        textKey: txn.textKey,
        value: lineTotal(txn),
        concepts: { expense_tracking: 0.9 },
      })),
    [theLeaks],
  );

  const biggest = theLeaks[0];

  function finish() {
    const rankDetail = rankOutcome?.detail as RankDetail | undefined;
    onComplete(
      combine(content.summaryKey, [
        {
          choices: [
            ...(sortOutcome?.choices ?? []),
            ...(rankOutcome?.choices ?? []),
            ...(picked
              ? [{ stepId: 'sm02.pick', choiceId: picked.id, ms: rankDetail?.elapsedMs ?? 0 }]
              : []),
          ],
          conceptDeltas: {
            ...(sortOutcome?.conceptDeltas ?? {}),
            ...(rankOutcome?.conceptDeltas ?? {}),
          },
          misconceptions: [
            ...(sortOutcome?.misconceptions ?? []),
            ...(rankOutcome?.misconceptions ?? []),
          ],
        },
      ]),
    );
  }

  if (phase === 'hook') {
    return (
      <section className="game game--sm02">
        <p>{t(content.hookKey)}</p>
        <TransactionList rows={history.map((x) => ({ ...x }))} />
        <p className="simulated">{t('sm02.simulated')}</p>
        <button type="button" onClick={() => setPhase('sort')}>
          {t('common.continue')}
        </button>
      </section>
    );
  }

  if (phase === 'sort') {
    return (
      <Triage
        stepId="sm02.sort"
        ctx={ctx}
        layout="queue"
        buckets={asBuckets(content.buckets)}
        cards={cards}
        promptKey={content.promptKey}
        onComplete={(outcome) => {
          setSortOutcome(outcome);
          setPhase('chart');
        }}
      />
    );
  }

  if (phase === 'chart') {
    return (
      <section className="game game--sm02">
        <h3>{t('sm02.chart.title')}</h3>
        <SpendChart
          totals={categoryTotals(history)}
          colours={colours}
          labelKeys={labelKeys}
          total={total}
        />
        <p>{t('sm02.chart.small_total', { amount: rupees(repeatedTotal) })}</p>

        {/* The multiplication that makes a ₹20 habit visible. */}
        {biggest && (
          <p className="leak__annual">
            {t('sm02.leak.annual', {
              name: t(biggest.textKey),
              monthly: rupees(lineTotal(biggest)),
              annual: rupees(annualise(lineTotal(biggest))),
            })}
          </p>
        )}

        <button
          type="button"
          onClick={() => setPhase(theLeaks.length > 1 ? 'rank' : 'pick')}
        >
          {t('common.continue')}
        </button>
      </section>
    );
  }

  if (phase === 'rank') {
    return (
      <Rank
        stepId="sm02.rank"
        ctx={ctx}
        items={rankItems}
        direction="desc"
        costUnit="rupees"
        promptKey="sm02.leak.rank_prompt"
        onComplete={(outcome) => {
          setRankOutcome(outcome);
          setPhase('pick');
        }}
      />
    );
  }

  if (phase === 'pick') {
    if (theLeaks.length === 0) {
      return (
        <section className="game game--sm02">
          <p>{t('sm02.leak.nothing')}</p>
          <button type="button" onClick={finish}>
            {t('common.continue')}
          </button>
        </section>
      );
    }
    return (
      <section className="game game--sm02">
        <h3>{t('sm02.leak.pick')}</h3>
        <TransactionList
          rows={theLeaks.map((x) => ({ ...x }))}
          selectedId={picked?.id ?? null}
          onSelect={(id) => setPicked(theLeaks.find((x) => x.id === id) ?? null)}
        />
        <button type="button" disabled={!picked} onClick={() => setPhase('done')}>
          {t('common.continue')}
        </button>
      </section>
    );
  }

  return (
    <section className="game game--sm02">
      {picked && (
        <p className="leak__projection">
          {t('sm02.leak.projection', {
            name: t(picked.textKey),
            saved: rupees(projectHalving(lineTotal(picked), content.projectionMonths)),
            months: content.projectionMonths,
          })}
        </p>
      )}
      <p>{t(content.conceptCard.textKey)}</p>
      <button type="button" onClick={finish}>
        {t('common.continue')}
      </button>
    </section>
  );
}
