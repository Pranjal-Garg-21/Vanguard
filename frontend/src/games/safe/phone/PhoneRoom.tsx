/**
 * One full play-through of a script: brief → play → (replay) → summary.
 * Both verbs (Judge, Act in-situ) are thin wrappers over this.
 */
import { useEffect, useState } from 'react';
import { t } from '@/platform';
import type { MiniGameResult, PlayMode } from '@/core/types';
import { Button } from '@/ui';
import { Icon } from './Icon';
import { scoreRun } from './logic/scoring';
import type { Scenario } from './logic/types';
import { MissionPanel } from './MissionPanel';
import { PhoneScreen } from './PhoneScreen';
import { PostMortem } from './PostMortem';
import { RoomComplete } from './RoomComplete';
import { RoomLayout } from './RoomLayout';
import { usePhoneRun } from './usePhoneRun';

export type PhoneRoomProps = {
  script: Scenario;
  mode?: PlayMode;
  /** When true the countdown is shown but never runs out. */
  timersOff?: boolean;
  onComplete: (result: MiniGameResult) => void;
  /** Part of a longer game: no brief or summary screen, goes straight to play and ends after the replay. */
  embedded?: boolean;
};

type Phase = 'brief' | 'play' | 'replay' | 'summary';

export function PhoneRoom({ script, mode = 'arcade', timersOff = false, embedded = false, onComplete }: PhoneRoomProps) {
  const [attempt, setAttempt] = useState(0);
  return <Attempt key={`${script.id}:${attempt}`} script={script} mode={mode} timersOff={timersOff} embedded={embedded} onComplete={onComplete} onRetry={() => setAttempt((n) => n + 1)} />;
}

function Attempt({ script, mode, timersOff, embedded, onComplete, onRetry }: Required<PhoneRoomProps> & { onRetry: () => void }) {
  const [phase, setPhase] = useState<Phase>(embedded ? 'play' : 'brief');
  const [lensOn, setLensOn] = useState(false);
  const { state, dispatch } = usePhoneRun(script, { timersOff, paused: phase !== 'play' });

  // Let the student see the money move before the debrief.
  useEffect(() => {
    if (phase !== 'play' || !state.ended) return;
    const delay = script.mode === 'act' && state.outcome === 'fooled' ? 1600 : 900;
    const id = window.setTimeout(() => setPhase(script.mode === 'act' ? 'replay' : 'summary'), delay);
    return () => window.clearTimeout(id);
  }, [phase, state.ended, state.outcome, script.mode]);

  if (phase === 'brief') {
    return (
      <div className="mx-auto max-w-xl space-y-4 p-6 pt-12 text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/15 text-brand"><Icon name="phone" className="h-8 w-8" /></span>
        <h1 className="text-3xl font-bold text-ink">{t(script.titleKey)}</h1>
        <p className="text-ink-soft">{t(script.briefKey)}</p>
        <p className="font-mono text-xs text-muted">{t('safe.ui.simulated')}</p>
        <Button size="lg" onClick={() => setPhase('play')}>{t('safe.ui.start')}</Button>
      </div>
    );
  }
  if (phase === 'replay') return <PostMortem state={state} onDone={() => (embedded ? onComplete(scoreRun(state, mode)) : setPhase('summary'))} />;
  if (phase === 'summary') {
    return <RoomComplete state={state} onReplay={() => setPhase('replay')} onRetry={onRetry} onContinue={() => onComplete(scoreRun(state, mode))} />;
  }

  return (
    <RoomLayout panel={<MissionPanel state={state} />} drawerLabel={t('safe.ui.tasks')}>
      <PhoneScreen state={state} dispatch={dispatch} lensOn={lensOn} onToggleLens={() => setLensOn((v) => !v)} />
    </RoomLayout>
  );
}
