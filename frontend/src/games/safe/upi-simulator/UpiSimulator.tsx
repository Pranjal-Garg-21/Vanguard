/**
 * UPI Simulator (UC-SAFE-01, Stage S1). Students set up Pay, pay a canteen by
 * QR, then meet two tricks: a collect request and a "scan to receive" QR.
 * The chapters run on a state machine (logic/flow); the two scams are phone
 * scripts played by the shared phone. Owner: P5.
 */
import { useMemo, useReducer } from 'react';
import { t } from '@/platform';
import type { MiniGameResult, PlayMode } from '@/core/types';
import { Button, Card, ProgressBar } from '@/ui';
import { Confetti } from '../phone/Confetti';
import { Icon } from '../phone/Icon';
import { PhoneRoom } from '../phone/PhoneRoom';
import { PhoneShell } from '../phone/PhoneShell';
import { RoomLayout } from '../phone/RoomLayout';
import { rupees } from '../phone/apps/PayApp';
import collectTemplate from '../../../content/scenarios/safe/templates/collect_request.json';
import qrTemplate from '../../../content/scenarios/safe/templates/qr_receive.json';
import checkPool from '../../../content/scenarios/safe/pools/upi_check.json';
import type { Scenario } from '../phone/logic/types';
import { shuffleChoices } from '../phone/logic/shuffle';
import type { RunMeta } from '../phone/logic/scoring';
import { InfoCard } from './components/InfoCard';
import { LinkAccountScreen, PaidScreen, PayPinScreen, PayScanScreen, SetPinScreen } from './components/PayScreens';
import { Quiz, type QuizQuestion } from './components/Quiz';
import { UpiPanel } from './components/UpiPanel';
import { CANTEEN_AMOUNT, createFlow, reduce, START_BALANCE, TASKS, taskIndex, toResult } from './logic/flow';
import { collectRequestVariant, qrReceiveVariant } from './logic/variants';

const QUESTIONS = checkPool as QuizQuestion[];

export type UpiSimulatorProps = {
  /** Same seed, same names, item and amount. */
  seed?: number;
  mode?: PlayMode;
  timersOff?: boolean;
  onComplete: (result: MiniGameResult, meta: RunMeta) => void;
};

function TaskBar({ chapter }: { chapter: Parameters<typeof taskIndex>[0] }) {
  const i = taskIndex(chapter);
  return (
    <div className="border-b border-line bg-surface px-4 py-3 lg:px-6">
      <p className="font-mono text-xs text-muted">{t('safe.upi.step', { n: i + 1, total: TASKS.length })} · {t(TASKS[i]?.titleKey ?? '')}</p>
      <ProgressBar className="mt-2" value={(i + 1) / TASKS.length} />
    </div>
  );
}

export function UpiSimulator({ seed = 1, mode = 'arcade', timersOff = false, onComplete }: UpiSimulatorProps) {
  const [flow, dispatch] = useReducer(reduce, undefined, createFlow);
  const { chapter } = flow;

  const collect = useMemo(() => shuffleChoices(collectRequestVariant(collectTemplate as unknown as Scenario, seed, START_BALANCE - CANTEEN_AMOUNT), seed), [seed]);
  const qrBalance = flow.balance;
  const qr = useMemo(() => shuffleChoices(qrReceiveVariant(qrTemplate as unknown as Scenario, seed, qrBalance), seed), [seed, qrBalance]);

  if (chapter === 'intro') {
    return (
      <div className="mx-auto max-w-xl space-y-4 p-6 pt-12 text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/15 text-brand"><Icon name="wallet" className="h-8 w-8" /></span>
        <h1 className="text-3xl font-bold text-ink">{t('safe.upi.title')}</h1>
        <p className="text-ink-soft">{t('safe.upi.brief')}</p>
        <p className="font-mono text-xs text-muted">{t('safe.ui.simulated')}</p>
        <Button size="lg" onClick={() => dispatch({ type: 'next' })}>{t('safe.upi.cta')}</Button>
      </div>
    );
  }

  if (chapter === 'collect') {
    return (
      <PhoneRoom key="collect" embedded top={<TaskBar chapter={chapter} />} mode="lifepath" timersOff={timersOff} script={collect} onComplete={(result, meta) => dispatch({ type: 'script', chapter: 'collect', result, meta })} />
    );
  }
  if (chapter === 'qr') {
    return (
      <PhoneRoom key="qr" embedded top={<TaskBar chapter={chapter} />} mode="lifepath" timersOff={timersOff} script={qr} onComplete={(result, meta) => dispatch({ type: 'script', chapter: 'qr', result, meta })} />
    );
  }
  if (chapter === 'rule') {
    return <InfoCard title={t('safe.upi.rule.title')} rule={t('safe.upi.rule.rule')} body={t('safe.upi.rule.body')} cta={t('safe.upi.rule.cta')} onNext={() => dispatch({ type: 'next' })} />;
  }
  if (chapter === 'refund') {
    return (
      <InfoCard
        title={t('safe.upi.refund.title')}
        body={t('safe.upi.refund.body')}
        points={[t('safe.upi.refund.p1'), t('safe.upi.refund.p2'), t('safe.upi.refund.p3')]}
        cta={t('safe.upi.refund.cta')}
        onNext={() => dispatch({ type: 'next' })}
      />
    );
  }
  if (chapter === 'check') {
    return <Quiz questions={QUESTIONS} onFinish={(answers) => dispatch({ type: 'check', answers })} />;
  }
  if (chapter === 'done') {
    const lost = -(flow.effects['money.bank'] ?? 0);
    const result = toResult(flow, mode);
    const scored = Object.values(flow.tally).reduce<[number, number]>(([g, n], [good, total]) => [g + good, n + total], [0, 0]);
    return (
      <div className="mx-auto max-w-2xl space-y-6 p-4 pt-10 text-center">
        <Confetti trigger={1} count={70} />
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/15 text-brand"><Icon name="shield" className="h-8 w-8" /></span>
        <h1 className="text-3xl font-bold text-ink">{t('safe.upi.done.title')}</h1>
        <p className="mx-auto max-w-md text-ink-soft">{t('safe.upi.done.body')}</p>
        <div className="grid gap-3 text-start sm:grid-cols-3">
          <Card className="p-4"><p className="text-xs font-bold uppercase tracking-wider text-muted">{t('safe.upi.done.moneyLost')}</p><p className={`mt-1 text-2xl font-bold tabular-nums ${lost > 0 ? 'text-bad' : 'text-brand'}`}>{rupees(lost)}</p></Card>
          <Card className="p-4"><p className="text-xs font-bold uppercase tracking-wider text-muted">{t('safe.upi.done.check')}</p><p className="mt-1 text-2xl font-bold tabular-nums text-info">{scored[0]}/{scored[1]}</p></Card>
          <Card className="p-4"><p className="text-xs font-bold uppercase tracking-wider text-muted">{t('safe.upi.done.pinHabit')}</p><p className="mt-1 text-lg font-bold text-ink">{result.misconceptions.includes('pin_uncovered') ? t('safe.upi.done.notCovered') : t('safe.upi.done.covered')}</p></Card>
        </div>
        <Button size="lg" onClick={() => onComplete(result, { kinds: flow.kinds, fooled: flow.fooled, falseAlarms: 0 })}>{t('safe.ui.continue')}</Button>
      </div>
    );
  }

  // link, setPin, payScan, payPin, paid: the Pay app on a compact phone.
  let screen: React.ReactNode = null;
  if (chapter === 'link') screen = <LinkAccountScreen onLink={() => dispatch({ type: 'link' })} />;
  if (chapter === 'setPin') screen = <SetPinScreen message={flow.message} onSubmit={(pin, covered) => dispatch({ type: 'setPin', pin, covered })} />;
  if (chapter === 'payScan') screen = <PayScanScreen message={flow.message} onProceed={() => dispatch({ type: 'scan' })} />;
  if (chapter === 'payPin') screen = <PayPinScreen message={flow.message} tries={flow.tries} onSubmit={(pin, covered) => dispatch({ type: 'pay', pin, covered })} />;
  if (chapter === 'paid') screen = <PaidScreen balance={flow.balance} onNext={() => dispatch({ type: 'next' })} />;

  return (
    <RoomLayout panel={<UpiPanel chapter={chapter} balance={flow.balance} />} drawerLabel={t('safe.ui.tasks')}>
      <PhoneShell clock="17:05" lensOn={false} onToggleLens={() => {}} bare>
        {screen}
      </PhoneShell>
    </RoomLayout>
  );
}
