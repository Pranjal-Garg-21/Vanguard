/**
 * One scam moment inside a LifePath month (P3's KYC SMS, P2's scheduler).
 * Just a compact phone with the message already open: no mission panel, no
 * brief. The caller passes a script id and gets a MiniGameResult back.
 */
import { useEffect, useState } from 'react';
import { t, useAccessibility } from '@/platform';
import type { MiniGameResult, PlayMode } from '@/core/types';
import { Button, Icon, Notice } from '@/ui';
import { scoreRun } from './logic/scoring';
import type { Scenario } from './logic/types';
import { PhoneScreen } from './PhoneScreen';
import { usePhoneRun } from './usePhoneRun';

export function SingleMessage({ script, mode = 'lifepath', timersOff = false, onResolve }: { script: Scenario; mode?: PlayMode; timersOff?: boolean; onResolve: (result: MiniGameResult) => void }) {
  const a11y = useAccessibility();
  const { state, dispatch } = usePhoneRun(script, { timersOff: timersOff || a11y.timersOff });
  const [lensOn, setLensOn] = useState(false);

  // Open the first message as soon as it arrives.
  const first = state.inbox[0];
  useEffect(() => {
    if (first && !state.read.includes(first) && !state.ended) dispatch({ type: 'open', surface: first });
  }, [first, state.read, state.ended, dispatch]);

  return (
    <div className="mx-auto w-full max-w-sm space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-mono text-xs text-muted">{t('safe.ui.simulated')}</p>
        <Button variant={lensOn ? 'primary' : 'secondary'} className="!min-h-9 text-sm" aria-pressed={lensOn} onClick={() => setLensOn((v) => !v)}>
          <Icon name="search" className="h-4 w-4" /> {t('safe.ui.lens')}
        </Button>
      </div>
      <PhoneScreen state={state} dispatch={dispatch} lensOn={lensOn} onToggleLens={() => setLensOn((v) => !v)} compact />
      {state.ended && (
        <div className="space-y-3">
          <Notice tone={state.outcome === 'fooled' ? 'bad' : 'info'}>{t(script.mode === 'judge' ? 'safe.summary.judge' : state.outcome === 'fooled' ? 'safe.summary.fooled' : 'safe.summary.safe')}</Notice>
          <Button className="w-full" onClick={() => onResolve(scoreRun(state, mode))}>{t('safe.ui.continue')}</Button>
        </div>
      )}
    </div>
  );
}
