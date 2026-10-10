/**
 * Time Machine: pick a goal, meet the three paths, split your money, run 500 futures, read the range.
 * Use case UC-INV-04 · Owner: P4 · Route: /learn/invest/time-machine
 *
 * Four short steps, one idea each, so nobody has to take in the whole screen at once.
 */
import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { assumptions } from '@/core/market';
import { formatRupees } from '@/games/investing/lessons/logic/calc';
import { InvestShell } from '@/games/investing/lessons/InvestShell';
import { LabSlider } from '@/games/investing/lessons/widgets/controls';
import { logEvent, t } from '@/platform';
import { AssumptionsDrawer, Card, ChevronIcon, FanChart, Pager, RangeDisplay, type PagerPage } from '@/ui';
import content from '@/content/scenarios/invest/time_machine.json';
import { PathsGuide } from './PathsGuide';
import { pickInsight, tenths, type InsightRule } from './logic/insight';
import { defaultMix, MIX_IDS, setShare, type Mix } from './logic/mix';
import { runTimeMachine, timeMachineChoice, type TimeMachineParams, type TimeMachineRun } from './logic/run';

const goals = content.goals;
const rules = content.rules as InsightRule[];

const tenthsText = (share: number) => {
  const { key, n } = tenths(share);
  return t(key, n === undefined ? {} : { n });
};

export function TimeMachine({ seed }: { seed?: number | string }) {
  const [page, setPage] = useState(0);
  const [goalId, setGoalId] = useState(goals[0]!.id);
  const goal = goals.find((g) => g.id === goalId)!;
  const [years, setYears] = useState(goal.years);
  const [initial, setInitial] = useState(goal.initial);
  const [monthly, setMonthly] = useState(goal.monthly);
  const [mix, setMix] = useState<Mix>(defaultMix);
  const [inflation, setInflation] = useState(assumptions.inflation.base);
  const [done, setDone] = useState<{ params: TimeMachineParams; run: TimeMachineRun } | null>(null);

  const params: TimeMachineParams = useMemo(() => ({ years, initial, monthly, mix, target: goal.target }), [years, initial, monthly, mix, goal.target]);

  const pickGoal = (id: string) => {
    const g = goals.find((x) => x.id === id)!;
    setGoalId(id);
    setYears(g.years);
    setInitial(g.initial);
    setMonthly(g.monthly);
    setDone(null);
  };

  const run = () => {
    const result = runTimeMachine(params, seed);
    setDone({ params, run: result });
    const insight = pickInsight(rules, result.facts);
    void logEvent({
      mode: 'arcade',
      activity: 'time_machine',
      concept: insight.concept,
      choice: timeMachineChoice(params.years, mix),
      level: 2,
      ...(insight.misconception ? { misconception: insight.misconception } : {}),
    });
    setPage(3);
    window.scrollTo({ top: 0 });
  };

  const pages: PagerPage[] = [
    {
      id: 'goal',
      title: t('timemachine.p1.title'),
      hint: t('timemachine.p1.hint'),
      content: (
        <Card className="space-y-4">
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t('timemachine.p1.title')}>
            {goals.map((g) => (
              <button
                key={g.id}
                type="button"
                role="radio"
                aria-checked={g.id === goalId}
                onClick={() => pickGoal(g.id)}
                className={`min-h-12 rounded-lg border px-4 text-start text-base font-bold transition-colors ${
                  g.id === goalId ? 'border-brand bg-brand/15 text-brand' : 'border-line-strong text-ink-soft hover:border-brand'
                }`}
              >
                {t(g.nameKey)}
              </button>
            ))}
          </div>
          <p className="text-lg text-ink">{t('timemachine.goal.target', { target: formatRupees(goal.target), years })}</p>
          <details className="rounded-lg bg-surface-2 p-3">
            <summary className="cursor-pointer font-bold text-info">{t('timemachine.p1.change')}</summary>
            <div className="mt-3 space-y-4">
              <LabSlider id="tm-years" label={t('timemachine.plan.years')} shown={String(years)} min={1} max={20} step={1} value={years} onChange={(v) => { setYears(v); setDone(null); }} />
              <LabSlider id="tm-initial" label={t('timemachine.plan.initial')} shown={formatRupees(initial)} min={0} max={50000} step={5000} value={initial} onChange={(v) => { setInitial(v); setDone(null); }} />
              <LabSlider id="tm-monthly" label={t('timemachine.plan.monthly')} shown={formatRupees(monthly)} min={0} max={5000} step={500} value={monthly} onChange={(v) => { setMonthly(v); setDone(null); }} />
            </div>
          </details>
        </Card>
      ),
    },
    {
      id: 'paths',
      title: t('timemachine.p2.title'),
      hint: t('timemachine.p2.hint'),
      content: <PathsGuide />,
    },
    {
      id: 'mix',
      title: t('timemachine.p3.title'),
      hint: t('timemachine.p3.hint'),
      nextLabel: t('timemachine.run'),
      onNext: run,
      content: (
        <Card className="space-y-5">
          {MIX_IDS.map((id) => (
            <div key={id} className="space-y-1">
              <LabSlider id={`tm-${id}`} label={t(`asset.${id}`)} shown={`${mix[id]}%`} min={0} max={100} step={5} value={mix[id]} onChange={(v) => { setMix((m) => setShare(m, id, v)); setDone(null); }} />
              <p className="text-sm text-muted">{t(`timemachine.mix.${id}.note`)}</p>
            </div>
          ))}
          <p className="text-sm text-muted">{t('timemachine.mix.hint')}</p>
        </Card>
      ),
    },
    {
      id: 'result',
      title: t('timemachine.p4.title'),
      hint: t('timemachine.p4.hint'),
      content: done ? <Result done={done} inflation={inflation} setInflation={setInflation} /> : null,
    },
  ];

  return (
    <InvestShell>
      <Link to="/learn/invest" className="inline-flex items-center gap-1 text-sm font-bold text-ink-soft hover:text-brand">
        <ChevronIcon dir="left" />
        {t('timemachine.back')}
      </Link>
      <Pager pages={pages} index={page} onIndex={setPage} />
    </InvestShell>
  );
}

function Result({ done, inflation, setInflation }: { done: { params: TimeMachineParams; run: TimeMachineRun }; inflation: number; setInflation: (n: number) => void }) {
  const { futures, facts } = done.run;
  const insight = pickInsight(rules, facts);
  const loss = tenthsText(facts.lossChance);

  return (
    <div className="space-y-4">
      <Card className="space-y-4">
        <FanChart percentiles={futures.percentiles} invested={futures.invested} inflation={inflation} learnMoreHref="/learn/invest/lesson_inflation" />
        <RangeDisplay low={futures.summary.p5} median={futures.summary.median} high={futures.summary.p95} />
        <p className="text-lg text-ink">{t('timemachine.result.goal', { chance: tenthsText(facts.goalChance) })}</p>
      </Card>

      <Card className="space-y-2 border-l-4 border-l-info">
        <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-muted">{t('timemachine.insight.title')}</h3>
        <p className="text-lg leading-relaxed text-ink">{t(insight.textKey, { loss })}</p>
      </Card>

      <details className="rounded-lg bg-surface-2 p-3">
        <summary className="cursor-pointer font-bold text-info">{t('timemachine.result.more')}</summary>
        <ul className="mt-2 space-y-1 text-ink-soft">
          <li>{t('timemachine.result.put', { amount: formatRupees(futures.summary.invested) })}</li>
          <li>{t('timemachine.result.loss', { chance: loss })}</li>
        </ul>
        <div className="mt-3">
          <AssumptionsDrawer assetIds={[...MIX_IDS]} inflation={{ value: inflation, onChange: setInflation }} />
        </div>
      </details>
    </div>
  );
}
