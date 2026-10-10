/**
 * Time Machine: pick a goal, split your money, run 500 futures, read the range.
 * Use case UC-INV-04 · Owner: P4 · Route: /learn/invest/time-machine
 */
import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { assumptions } from '@/core/market';
import { formatRupees } from '@/games/investing/lessons/logic/calc';
import { InvestShell } from '@/games/investing/lessons/InvestShell';
import { LabSlider } from '@/games/investing/lessons/widgets/controls';
import { logEvent, t } from '@/platform';
import { AssumptionsDrawer, Button, Card, ChevronIcon, FanChart, Notice, RangeDisplay } from '@/ui';
import content from '@/content/scenarios/invest/time_machine.json';
import { PathsGuide } from './PathsGuide';
import { pickInsight, tenths, type InsightRule } from './logic/insight';
import { defaultMix, MIX_IDS, setShare, type Mix } from './logic/mix';
import { runTimeMachine, timeMachineChoice, type TimeMachineParams, type TimeMachineRun } from './logic/run';

const goals = content.goals;
const rules = content.rules as InsightRule[];

const sameParams = (a: TimeMachineParams, b: TimeMachineParams) =>
  a.years === b.years && a.initial === b.initial && a.monthly === b.monthly && a.target === b.target && MIX_IDS.every((id) => a.mix[id] === b.mix[id]);

const tenthsText = (share: number) => {
  const { key, n } = tenths(share);
  return t(key, n === undefined ? {} : { n });
};

export function TimeMachine({ seed }: { seed?: number | string }) {
  const [goalId, setGoalId] = useState(goals[0]!.id);
  const goal = goals.find((g) => g.id === goalId)!;
  const [years, setYears] = useState(goal.years);
  const [initial, setInitial] = useState(goal.initial);
  const [monthly, setMonthly] = useState(goal.monthly);
  const [mix, setMix] = useState<Mix>(defaultMix);
  const [inflation, setInflation] = useState(assumptions.inflation.base);
  const [done, setDone] = useState<{ params: TimeMachineParams; run: TimeMachineRun } | null>(null);

  const params: TimeMachineParams = useMemo(() => ({ years, initial, monthly, mix, target: goal.target }), [years, initial, monthly, mix, goal.target]);
  const stale = done !== null && !sameParams(done.params, params);

  const pickGoal = (id: string) => {
    const g = goals.find((x) => x.id === id)!;
    setGoalId(id);
    setYears(g.years);
    setInitial(g.initial);
    setMonthly(g.monthly);
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
  };

  return (
    <InvestShell wide>
      <Link to="/learn/invest" className="inline-flex items-center gap-1 text-sm font-bold text-ink-soft hover:text-brand">
        <ChevronIcon dir="left" />
        {t('timemachine.back')}
      </Link>
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">{t('timemachine.title')}</h1>
        <p className="max-w-3xl text-ink-soft">{t('timemachine.subtitle')}</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        <div className="space-y-4">
          <Card className="space-y-3">
            <h2 className="font-bold">{t('timemachine.step.goal')}</h2>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t('timemachine.step.goal')}>
              {goals.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  role="radio"
                  aria-checked={g.id === goalId}
                  onClick={() => pickGoal(g.id)}
                  className={`min-h-11 rounded-lg border px-3 text-start text-sm font-bold transition-colors ${
                    g.id === goalId ? 'border-brand bg-brand/15 text-brand' : 'border-line-strong text-ink-soft hover:border-brand'
                  }`}
                >
                  {t(g.nameKey)}
                </button>
              ))}
            </div>
            <p className="text-sm text-ink-soft">{t('timemachine.goal.target', { target: formatRupees(goal.target), years })}</p>
          </Card>

          <Card className="space-y-4">
            <h2 className="font-bold">{t('timemachine.step.plan')}</h2>
            <LabSlider id="tm-years" label={t('timemachine.plan.years')} shown={String(years)} min={1} max={20} step={1} value={years} onChange={setYears} />
            <LabSlider id="tm-initial" label={t('timemachine.plan.initial')} shown={formatRupees(initial)} min={0} max={50000} step={5000} value={initial} onChange={setInitial} />
            <LabSlider id="tm-monthly" label={t('timemachine.plan.monthly')} shown={formatRupees(monthly)} min={0} max={5000} step={500} value={monthly} onChange={setMonthly} />
          </Card>

          <PathsGuide />

          <Card className="space-y-4">
            <h2 className="font-bold">{t('timemachine.step.mix')}</h2>
            <p className="text-sm text-muted">{t('timemachine.mix.hint')}</p>
            {MIX_IDS.map((id) => (
              <div key={id} className="space-y-1">
                <LabSlider id={`tm-${id}`} label={t(`asset.${id}`)} shown={`${mix[id]}%`} min={0} max={100} step={5} value={mix[id]} onChange={(v) => setMix((m) => setShare(m, id, v))} />
                <p className="text-xs text-muted">{t(`timemachine.mix.${id}.note`)}</p>
              </div>
            ))}
          </Card>

          <Button size="lg" className="w-full" onClick={run}>
            {done ? t('timemachine.run.again') : t('timemachine.run')}
          </Button>
        </div>

        <div className="space-y-4">
          {done ? <Results done={done} stale={stale} inflation={inflation} setInflation={setInflation} /> : <Placeholder />}
        </div>
      </div>
    </InvestShell>
  );
}

function Placeholder() {
  return (
    <Card className="flex min-h-64 items-center justify-center text-center text-ink-soft">
      <p className="max-w-sm">{t('timemachine.subtitle')}</p>
    </Card>
  );
}

function Results({
  done,
  stale,
  inflation,
  setInflation,
}: {
  done: { params: TimeMachineParams; run: TimeMachineRun };
  stale: boolean;
  inflation: number;
  setInflation: (n: number) => void;
}) {
  const { futures, facts } = done.run;
  const insight = pickInsight(rules, facts);
  const loss = tenthsText(facts.lossChance);

  return (
    <div className={`space-y-4 ${stale ? 'opacity-60' : ''}`}>
      {stale && <Notice tone="info">{t('timemachine.stale')}</Notice>}

      <Card className="space-y-4">
        <h2 className="text-lg font-bold">{t('timemachine.result.title')}</h2>
        <FanChart percentiles={futures.percentiles} invested={futures.invested} inflation={inflation} learnMoreHref="/learn/invest/lesson_inflation" />
        <RangeDisplay low={futures.summary.p5} median={futures.summary.median} high={futures.summary.p95} />
        <ul className="space-y-1 text-ink-soft">
          <li>{t('timemachine.result.put', { amount: formatRupees(futures.summary.invested) })}</li>
          <li>{t('timemachine.result.goal', { chance: tenthsText(facts.goalChance) })}</li>
          <li>{t('timemachine.result.loss', { chance: loss })}</li>
        </ul>
      </Card>

      <Card className="space-y-2 border-l-4 border-l-info">
        <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-muted">{t('timemachine.insight.title')}</h2>
        <p className="text-lg leading-relaxed text-ink">{t(insight.textKey, { loss })}</p>
      </Card>

      <AssumptionsDrawer assetIds={[...MIX_IDS]} inflation={{ value: inflation, onChange: setInflation }} />
    </div>
  );
}
