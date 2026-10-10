/**
 * Mutual Fund Challenge: pick one of four made-up funds, invest a lump sum or a monthly SIP, and watch made-up years.
 * Use case UC-INV-08 · Owner: P4 · Route: /learn/invest/mutual-fund
 *
 * Four steps (learn, pick, plan, result). It never shows a "best" fund: the debrief says which one suits you
 * depends on time, amounts and cost. Seeded, so the same choices in the same class give the same market.
 */
import { useState } from 'react';
import { Link } from 'react-router';
import { assumptions, type FundPlan } from '@/core/market';
import { InvestShell } from '@/games/investing/lessons/InvestShell';
import { logEvent, t } from '@/platform';
import { ChevronIcon } from '@/ui';
import raw from '@/content/scenarios/invest/mutual_fund.json';
import { LearnStep } from './LearnStep';
import { PickStep } from './PickStep';
import { defaultPlan, PlanStep } from './PlanStep';
import { Results } from './Results';

type Step = 'learn' | 'pick' | 'plan' | 'result';
const STEPS: Step[] = ['learn', 'pick', 'plan', 'result'];
const NAV = (raw as unknown as { nav: { pool: number; units: number; money: number } }).nav;

export function MutualFund({ seed = 'mutual-fund' }: { seed?: number | string }) {
  const [step, setStep] = useState<Step>('learn');
  const [fundId, setFundId] = useState<string | null>(null);
  const [plan, setPlan] = useState<FundPlan>(defaultPlan('sip'));
  const [ran, setRan] = useState(false);

  const log = (choice: string, concept: string) => void logEvent({ mode: 'arcade', activity: 'mutual_fund', concept, choice, level: 2 });
  const go = (s: Step) => {
    setStep(s);
    window.scrollTo({ top: 0 });
  };

  const run = () => {
    if (!fundId) return;
    log(`run_${fundId}_${plan.method}`, plan.method === 'sip' ? 'sip_concept' : 'pooled_funds');
    setRan(true);
    go('result');
  };

  return (
    <InvestShell wide>
      <Link to="/learn/invest" className="inline-flex items-center gap-1 text-sm font-bold text-ink-soft hover:text-brand">
        <ChevronIcon dir="left" />
        {t('mutualfund.back')}
      </Link>
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">{t('mutualfund.title')}</h1>
        <p className="max-w-3xl text-ink-soft">{t('mutualfund.subtitle')}</p>
      </header>

      <ol className="flex flex-wrap gap-2 text-sm font-bold" aria-label={t('mutualfund.title')}>
        {STEPS.map((s) => (
          <li key={s} aria-current={s === step ? 'step' : undefined} className={`rounded-md px-3 py-1 ${s === step ? 'bg-brand text-brand-ink' : 'bg-surface-3 text-ink-soft'}`}>
            {t(`mutualfund.step.${s}`)}
          </li>
        ))}
      </ol>

      {step === 'learn' && <LearnStep nav={NAV} onNext={() => go('pick')} />}

      {step === 'pick' && (
        <PickStep
          fundId={fundId}
          onPick={(id) => {
            setFundId(id);
            log(`pick_${id}`, 'pooled_funds');
          }}
          onBack={() => go('learn')}
          onNext={() => go('plan')}
        />
      )}

      {step === 'plan' && fundId && assumptions.funds[fundId] && <PlanStep fundId={fundId} plan={plan} onChange={setPlan} onRun={run} onBack={() => go('pick')} ran={ran} />}

      {step === 'result' && fundId && <Results fundId={fundId} plan={plan} seed={seed} onAgain={() => go('pick')} />}
    </InvestShell>
  );
}
