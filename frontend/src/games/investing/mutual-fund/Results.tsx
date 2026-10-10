/** Step 4: what happened. Your market, 500 other futures, all four funds side by side, the ETF difference, and a check. */
import { useMemo } from 'react';
import { assumptions, compareFunds, formatRupees, runFundFutures, simulateFund, type FundPlan } from '@/core/market';
import { runCalcs } from '@/games/investing/lessons/logic/calc';
import { QuestionRow } from '@/games/investing/lessons/RoomQuestions';
import { useQuestionRunner } from '@/games/investing/lessons/useQuestionRunner';
import { EtfBuy } from '@/games/investing/lessons/widgets/EtfBuy';
import { t } from '@/platform';
import { AssumptionsDrawer, Badge, Button, Card, FanChart, RangeDisplay } from '@/ui';
import raw from '@/content/scenarios/invest/mutual_fund.json';
import { LineChart, UnitsBars } from './Charts';
import { notesFor, type Note } from './logic/notes';

const check = (raw as unknown as { check: { vars: Parameters<typeof runCalcs>[0]; calcs: Parameters<typeof runCalcs>[1]; questions: import('@/games/investing/lessons/logic/types').RoomQuestion[] } }).check;
const EDGE = { good: 'border-l-brand', warn: 'border-l-warn', info: 'border-l-info' } as const;

export function Results({ fundId, plan, seed, onAgain }: { fundId: string; plan: FundPlan; seed: number | string; onAgain: () => void }) {
  const fundName = (id: string) => t(assumptions.funds[id]!.labelKey);
  const run = useMemo(() => simulateFund(fundId, plan, seed), [fundId, plan, seed]);
  const all = useMemo(() => compareFunds(plan, seed), [plan, seed]);
  const futures = useMemo(() => runFundFutures(fundId, plan, seed), [fundId, plan, seed]);
  const notes = useMemo(() => notesFor({ fundId, plan, run, futures, all, fundName }), [fundId, plan, run, futures, all]); // eslint-disable-line

  const checkCtx = useMemo(() => runCalcs(check.vars, check.calcs), []);
  const runner = useQuestionRunner('mutual_fund', checkCtx);
  const earned = check.questions.reduce((s, q) => s + runner.earnedFor(q), 0);
  const total = check.questions.reduce((s, q) => s + q.points, 0);
  const etf = assumptions.funds.index_etf!;

  return (
    <div className="space-y-6">
      <Card className="space-y-4">
        <h1 className="text-2xl font-bold">{t('mutualfund.result.title')}</h1>
        <p className="text-sm text-muted">{t('mutualfund.result.market')}</p>
        <div className="grid gap-4 lg:grid-cols-2">
          <LineChart
            title={t('mutualfund.chart.nav')}
            series={[{ label: t('mutualfund.chart.legend.nav'), values: run.nav, stroke: 'var(--color-brand)' }]}
            format={(v) => `₹${Math.round(v)}`}
          />
          <LineChart
            title={t('mutualfund.chart.value')}
            series={[
              { label: t('mutualfund.chart.legend.value'), values: run.value, stroke: 'var(--color-brand)' },
              { label: t('mutualfund.chart.legend.invested'), values: run.invested, stroke: 'var(--color-ink-soft)', dashed: true },
            ]}
          />
        </div>
        {plan.method === 'sip' && <UnitsBars units={run.unitsBought} title={t('mutualfund.chart.units')} />}
      </Card>

      <NotesCard notes={notes} />

      <Card className="space-y-4">
        <h2 className="text-lg font-bold">{t('mutualfund.futures.title')}</h2>
        <FanChart percentiles={futures.percentiles} invested={futures.invested} />
        <RangeDisplay low={futures.summary.p5} median={futures.summary.median} high={futures.summary.p95} />
        <p className="text-xs text-muted">{t('mutualfund.futures.note')}</p>
        <AssumptionsDrawer assetIds={[]} showInflation={false} notes={[t('mutualfund.assume.note')]} />
      </Card>

      <Card className="space-y-3">
        <h2 className="text-lg font-bold">{t('mutualfund.compare.title')}</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[28rem] text-start text-sm">
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
                    {fundName(id)} {id === fundId && <Badge tone="good">{t('mutualfund.pick.chosen')}</Badge>}
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

      <Card className="space-y-3">
        <h2 className="text-lg font-bold">{t('mutualfund.fee.title')}</h2>
        <p className="rounded-lg bg-surface-2 p-3 font-mono text-ink">{t('mutualfund.fee.formula')}</p>
      </Card>

      <Card className="space-y-4">
        <h2 className="text-lg font-bold">{t('mutualfund.etf.title')}</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[28rem] text-sm">
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
        <p className="text-sm text-ink">{t('mutualfund.etf.same')}</p>
        <EtfBuy amount={10000} nav={101} prices={[99, 100, 102]} cost={etf.tradingCost ?? 0.001} />
      </Card>

      <p className="rounded-lg border-l-4 border-brand bg-brand/10 p-3 text-ink">{t('mutualfund.never')}</p>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-bold">{t('mutualfund.check.title')}</h2>
          <span className="text-sm font-bold text-muted">{t('investui.room.pointsEarned', { earned, total })}</span>
        </div>
        {check.questions.map((q) => (
          <QuestionRow
            key={q.id}
            q={q}
            ctx={checkCtx}
            state={runner.stateOf(q)}
            onSubmitNumber={(v) => runner.submitNumber(q, v)}
            onPickOption={(id) => runner.pickOption(q, id)}
            onHint={() => runner.toggleHint(q)}
            onReveal={() => runner.reveal(q)}
          />
        ))}
      </section>

      <Button size="lg" onClick={onAgain}>
        {t('mutualfund.again')}
      </Button>
    </div>
  );
}

function NotesCard({ notes }: { notes: Note[] }) {
  return (
    <Card className="space-y-3">
      <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-muted">{t('mutualfund.result.title')}</h2>
      <ul className="space-y-2">
        {notes.map((n, i) => (
          <li key={i} className={`rounded-lg border-l-4 bg-surface-2 p-3 ${EDGE[n.tone]}`}>
            <div className="mb-0.5 text-xs font-bold uppercase tracking-[0.12em] text-muted">{n.kind === 'think' ? t('mutualfund.note.think') : t('mutualfund.note.happened')}</div>
            <p className="text-ink">{t(`mutualfund.note.${n.key}`, n.vars)}</p>
          </li>
        ))}
      </ul>
    </Card>
  );
}
