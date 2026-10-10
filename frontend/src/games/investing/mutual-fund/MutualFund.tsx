/**
 * Mutual Fund Challenge: pick one of four made-up funds, invest a lump sum or a monthly SIP, and watch made-up years.
 * Use case UC-INV-08 · Owner: P4 · Route: /learn/invest/mutual-fund
 *
 * Setup is three short steps (how a fund works, pick a fund, choose how to invest); the result is six short pages.
 * It never shows a "best" fund: the debrief says which one suits you depends on time, amounts and cost.
 * Seeded, so the same choices in the same class give the same market.
 */
import { useState } from 'react';
import { Link } from 'react-router';
import { assumptions, type FundPlan } from '@/core/market';
import { InvestShell } from '@/games/investing/lessons/InvestShell';
import { logEvent, t } from '@/platform';
import { ChevronIcon, Pager, type PagerPage } from '@/ui';
import raw from '@/content/scenarios/invest/mutual_fund.json';
import { LearnStep } from './LearnStep';
import { PickStep } from './PickStep';
import { defaultPlan, PlanStep } from './PlanStep';
import { Results } from './Results';

const NAV = (raw as unknown as { nav: { pool: number; units: number; money: number } }).nav;

export function MutualFund({ seed = 'mutual-fund' }: { seed?: number | string }) {
  const [fundId, setFundId] = useState<string | null>(null);
  const [plan, setPlan] = useState<FundPlan>(defaultPlan('sip'));
  const [page, setPage] = useState(0);
  const [running, setRunning] = useState(false);

  const log = (choice: string, concept: string) => void logEvent({ mode: 'arcade', activity: 'mutual_fund', concept, choice, level: 2 });

  const run = () => {
    if (!fundId) return;
    log(`run_${fundId}_${plan.method}`, plan.method === 'sip' ? 'sip_concept' : 'pooled_funds');
    setRunning(true);
    window.scrollTo({ top: 0 });
  };

  const pages: PagerPage[] = [
    { id: 'learn', title: t('mutualfund.step.learn'), hint: t('mutualfund.p1.hint'), content: <LearnStep nav={NAV} />, nextLabel: t('mutualfund.learn.next') },
    {
      id: 'pick',
      title: t('mutualfund.step.pick'),
      hint: t('mutualfund.pick.intro'),
      content: (
        <PickStep
          fundId={fundId}
          onPick={(id) => {
            setFundId(id);
            log(`pick_${id}`, 'pooled_funds');
          }}
        />
      ),
      nextDisabled: !fundId,
      nextLabel: t('mutualfund.pick.next'),
    },
    {
      id: 'plan',
      title: t('mutualfund.step.plan'),
      hint: t('mutualfund.p3.hint'),
      content: fundId && assumptions.funds[fundId] ? <PlanStep fundId={fundId} plan={plan} onChange={setPlan} /> : null,
      nextLabel: t('mutualfund.plan.run', { years: plan.years }),
      onNext: run,
    },
  ];

  return (
    <InvestShell>
      <Link to="/learn/invest" className="inline-flex items-center gap-1 text-sm font-bold text-ink-soft hover:text-brand">
        <ChevronIcon dir="left" />
        {t('mutualfund.back')}
      </Link>
      <header className="space-y-1">
        <h1 className="text-xl font-bold text-ink-soft">{t('mutualfund.title')}</h1>
      </header>

      {running && fundId ? (
        <Results
          fundId={fundId}
          plan={plan}
          seed={seed}
          onAgain={() => {
            setRunning(false);
            setPage(1);
          }}
        />
      ) : (
        <Pager pages={pages} index={page} onIndex={setPage} />
      )}
    </InvestShell>
  );
}
