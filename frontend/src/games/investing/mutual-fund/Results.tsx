/**
 * What happened, in six short pages: how it went, the ups and downs, what it cost (all four funds), other possible
 * futures, fund or ETF, and a check. Each page has one idea.
 */
import { useMemo } from 'react';
import { assumptions, compareFunds, formatRupees, runFundFutures, simulateFund, type FundPlan } from '@/core/market';
import { runCalcs } from '@/games/investing/lessons/logic/calc';
import { QuestionFlow } from '@/games/investing/lessons/QuestionFlow';
import type { RoomQuestion } from '@/games/investing/lessons/logic/types';
import { useQuestionRunner } from '@/games/investing/lessons/useQuestionRunner';
import { EtfBuy } from '@/games/investing/lessons/widgets/EtfBuy';
import { t } from '@/platform';
import { AssumptionsDrawer, Badge, Button, Card, FanChart, Pager, RangeDisplay, type PagerPage } from '@/ui';
import raw from '@/content/scenarios/invest/mutual_fund.json';
import { LineChart, UnitsBars } from './Charts';
import { notesFor, type Note } from './logic/notes';

const check = (raw as unknown as { check: { vars: Parameters<typeof runCalcs>[0]; calcs: Parameters<typeof runCalcs>[1]; questions: RoomQuestion[] } }).check;
const EDGE = { good: 'border-s-brand', warn: 'border-s-warn', info: 'border-s-info' } as const;

export function Results({ fundId, plan, seed, onAgain }: { fundId: string; plan: FundPlan; seed: number | string; onAgain: () => void }) {
  const fundName = (id: string) => t(assumptions.funds[id]!.labelKey);
  const run = useMemo(() => simulateFund(fundId, plan, seed), [fundId, plan, seed]);
  const all = useMemo(() => compareFunds(plan, seed), [plan, seed]);
  const futures = useMemo(() => runFundFutures(fundId, plan, seed), [fundId, plan, seed]);
  const notes = useMemo(() => notesFor({ fundId, plan, run, futures, all, fundName }), [fundId, plan, run, futures, all]); // eslint-disable-line react-hooks/exhaustive-deps
  const pick = (...keys: string[]) => notes.filter((n) => keys.some((k) => n.key === k || n.key.startsWith(k)));

  const checkCtx = useMemo(() => runCalcs(check.vars, check.calcs), []);
  const runner = useQuestionRunner('mutual_fund', checkCtx);
  const earned = check.questions.reduce((s, q) => s + runner.earnedFor(q), 0);
  const total = check.questions.reduce((s, q) => s + q.points, 0);
  const etf = assumptions.funds.index_etf!;
  const result = notes.find((n) => n.key === 'result')!;

  const pages: PagerPage[] = [
    {
      id: 'how',
      title: t('mutualfund.r1.title'),
      hint: t('mutualfund.r1.hint'),
      content: (
        <Card className="space-y-4">
          <p className="text-xl text-ink">{t(`mutualfund.note.${result.key}`, result.vars)}</p>
          <LineChart
            title={t('mutualfund.chart.value')}
            series={[
              { label: t('mutualfund.chart.legend.value'), values: run.value, stroke: 'var(--color-brand)' },
              { label: t('mutualfund.chart.legend.invested'), values: run.invested, stroke: 'var(--color-ink-soft)', dashed: true },
            ]}
          />
        </Card>
      ),
    },
    {
      id: 'ups',
      title: t('mutualfund.r2.title'),
      hint: t('mutualfund.r2.hint'),
      content: (
        <>
          <Card className="space-y-4">
            <LineChart title={t('mutualfund.chart.nav')} series={[{ label: t('mutualfund.chart.legend.nav'), values: run.nav, stroke: 'var(--color-brand)' }]} format={(v) => `₹${Math.round(v)}`} />
            {plan.method === 'sip' && <UnitsBars units={run.unitsBought} title={t('mutualfund.chart.units')} />}
          </Card>
          <Notes notes={pick('dip', 'sip.')} />
        </>
      ),
    },
    {
      id: 'cost',
      title: t('mutualfund.r3.title'),
      hint: t('mutualfund.r3.hint'),
      content: (
        <>
          <Notes notes={pick('cost', 'etf.trading', 'vsIndex.')} />
          <Card className="space-y-3">
            <h3 className="font-bold">{t('mutualfund.compare.title')}</h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[26rem] text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-muted">
                    <th className="py-2 text-start">{t('mutualfund.compare.fund')}</th>
                    <th className="py-2 text-end">{t('mutualfund.compare.final')}</th>
                    <th className="py-2 text-end">{t('mutualfund.compare.cost')}</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(all).map(([id, r]) => (
                    <tr key={id} className="border-t border-line">
                      <td className="py-2 font-bold text-ink">
                        {fundName(id)} {id === fundId && <Badge variant="good">{t('mutualfund.pick.chosen')}</Badge>}
                      </td>
                      <td className="py-2 text-end text-ink">{formatRupees(r.finalValue)}</td>
                      <td className="py-2 text-end text-ink-soft">{formatRupees(r.costDrag)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-sm text-muted">{t('mutualfund.compare.note')}</p>
          </Card>
          <details className="rounded-xl border border-line bg-surface p-4">
            <summary className="cursor-pointer font-bold text-info">{t('mutualfund.fee.title')}</summary>
            <p className="mt-2 rounded-lg bg-surface-2 p-3 font-mono text-ink">{t('mutualfund.fee.formula')}</p>
          </details>
        </>
      ),
    },
    {
      id: 'futures',
      title: t('mutualfund.r4.title'),
      hint: t('mutualfund.r4.hint'),
      content: (
        <>
          <Card className="space-y-4">
            <FanChart percentiles={futures.percentiles} invested={futures.invested} />
            <RangeDisplay low={futures.summary.p5} median={futures.summary.median} high={futures.summary.p95} />
            <p className="text-xs text-muted">{t('mutualfund.futures.note')}</p>
          </Card>
          <Notes notes={pick('think.loss', 'think.neverZero')} />
          <AssumptionsDrawer assetIds={[]} showInflation={false} notes={[t('mutualfund.assume.note')]} />
        </>
      ),
    },
    {
      id: 'etf',
      title: t('mutualfund.r5.title'),
      hint: t('mutualfund.r5.hint'),
      content: (
        <>
          <Card className="space-y-3">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[26rem] text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-muted">
                    <th className="py-2" />
                    <th className="py-2 text-start">{t('mutualfund.etf.col.fund')}</th>
                    <th className="py-2 text-start">{t('mutualfund.etf.col.etf')}</th>
                  </tr>
                </thead>
                <tbody>
                  {(['bought', 'through', 'cost', 'small'] as const).map((row) => (
                    <tr key={row} className="border-t border-line align-top">
                      <th className="py-2 pe-3 text-start font-bold text-ink">{t(`mutualfund.etf.row.${row}`)}</th>
                      <td className="py-2 pe-3 text-ink-soft">{t(`mutualfund.etf.row.${row}Fund`)}</td>
                      <td className="py-2 text-ink-soft">{t(`mutualfund.etf.row.${row}Etf`)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-ink">{t('mutualfund.etf.same')}</p>
          </Card>
          <details className="rounded-xl border border-line bg-surface p-4">
            <summary className="cursor-pointer font-bold text-info">{t('mutualfund.etf.lab')}</summary>
            <div className="mt-3">
              <EtfBuy amount={10000} nav={101} prices={[99, 100, 102]} cost={etf.tradingCost ?? 0.001} />
            </div>
          </details>
          <Notes notes={pick('think.sector', 'think.active', 'think.etf')} />
        </>
      ),
    },
    {
      id: 'check',
      title: t('mutualfund.r6.title'),
      hint: t('mutualfund.r6.hint'),
      content: (
        <>
          <p className="rounded-lg border-s-4 border-brand bg-brand/10 p-3 text-ink">{t('mutualfund.never')}</p>
          <p className="text-sm font-bold text-muted">{t('investui.room.pointsEarned', { earned, total })}</p>
          <QuestionFlow
            questions={check.questions}
            ctx={checkCtx}
            h={{
              stateOf: runner.stateOf,
              isDone: runner.isDone,
              submitNumber: runner.submitNumber,
              pickOption: runner.pickOption,
              toggleHint: runner.toggleHint,
              reveal: runner.reveal,
            }}
          />
          <Notes notes={pick('think.noBest')} />
          <Button size="lg" onClick={onAgain}>
            {t('mutualfund.again')}
          </Button>
        </>
      ),
    },
  ];

  return <Pager pages={pages} />;
}

function Notes({ notes }: { notes: Note[] }) {
  if (notes.length === 0) return null;
  return (
    <ul className="space-y-2">
      {notes.map((n, i) => (
        <li key={i} className={`rounded-lg border-s-4 bg-surface-2 p-3 ${EDGE[n.tone]}`}>
          <div className="mb-0.5 text-xs font-bold uppercase tracking-[0.12em] text-muted">{n.kind === 'think' ? t('mutualfund.note.think') : t('mutualfund.note.happened')}</div>
          <p className="text-ink">{t(`mutualfund.note.${n.key}`, n.vars)}</p>
        </li>
      ))}
    </ul>
  );
}
