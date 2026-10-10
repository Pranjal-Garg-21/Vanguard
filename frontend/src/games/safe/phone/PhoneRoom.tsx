/**
 * One full play-through of a script: brief → play → (replay) → summary.
 * Both verbs (Judge, Act in-situ) are thin wrappers over this.
 */
import { useState } from 'react';
import { t } from '@/platform';
import type { MiniGameResult, PlayMode } from '@/core/types';
import { Button } from '@/ui';
import { Icon } from './Icon';
import { runMeta, scoreRun, type RunMeta } from './logic/scoring';
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
  onComplete: (result: MiniGameResult, meta: RunMeta) => void;
  /** Part of a longer game: no brief or summary screen, goes straight to play and ends after the replay. */
  embedded?: boolean;
  /** A strip shown above the room (the UPI simulator's task bar). */
  top?: React.ReactNode;
  /** Red-flag cards the student already owns from earlier rooms. */
  collected?: string[];
};

type Phase = 'brief' | 'play' | 'replay' | 'summary';

export function PhoneRoom({ script, mode = 'arcade', timersOff = false, embedded = false, top, collected, onComplete }: PhoneRoomProps) {
  const [attempt, setAttempt] = useState(0);
  return <Attempt key={`${script.id}:${attempt}`} script={script} mode={mode} timersOff={timersOff} embedded={embedded} top={top} collected={collected} onComplete={onComplete} onRetry={() => setAttempt((n) => n + 1)} />;
}

function Attempt({ script, mode, timersOff, embedded, top, collected, onComplete, onRetry }: Omit<Required<PhoneRoomProps>, 'top' | 'collected'> & { top?: React.ReactNode; collected?: string[]; onRetry: () => void }) {
  const [phase, setPhase] = useState<Phase>(embedded ? 'play' : 'brief');
  const [lensOn, setLensOn] = useState(false);
  const { state, dispatch } = usePhoneRun(script, { timersOff, paused: phase !== 'play' });


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
  if (phase === 'replay') return <PostMortem state={state} onDone={() => (embedded ? onComplete(scoreRun(state, mode), runMeta(state)) : setPhase('summary'))} />;
  if (phase === 'summary') {
    return <RoomComplete state={state} collected={collected} onReplay={() => setPhase('replay')} onRetry={onRetry} onContinue={() => onComplete(scoreRun(state, mode), runMeta(state))} />;
  }

  return (
    <RoomLayout top={top} panel={<MissionPanel state={state} />} drawerLabel={t('safe.ui.tasks')}>
      <PhoneScreen state={state} dispatch={dispatch} lensOn={lensOn} onToggleLens={() => setLensOn((v) => !v)} onFinish={() => setPhase(script.mode === 'act' ? 'replay' : 'summary')} />
    </RoomLayout>
  );
}
