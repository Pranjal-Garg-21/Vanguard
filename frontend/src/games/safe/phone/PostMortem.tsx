/**
 * Slow-motion replay of the student's own run. Steps through the moments that
 * mattered (what they opened, inspected and chose), shows each screen with the
 * red flags now highlighted, and says which ones they found or missed.
 */
import { useEffect, useMemo, useState } from 'react';
import { t } from '@/platform';
import { Button, Card, Notice, ProgressBar } from '@/ui';
import { FeedbackCard } from './FeedbackCard';
import { judgeFeedback, responseFeedback } from './logic/feedback';
import { surfaceOf } from './logic/runner';
import type { RunState } from './logic/types';
import { formatClock, PhoneShell } from './PhoneShell';
import { RoomLayout } from './RoomLayout';
import { SurfaceBody, surfaceTitle } from './SurfaceView';
import { TellList } from './TellList';

export function PostMortem({ state, onDone }: { state: RunState; onDone: () => void }) {
  // Each screen once when first opened, plus every choice. Re-opening a message adds nothing.
  const frames = useMemo(() => {
    const seen = new Set<string>();
    return state.history.filter((e) => {
      if (e.kind === 'opened') {
        if (seen.has(e.surface)) return false;
        seen.add(e.surface);
        return true;
      }
      return e.kind === 'acted' || e.kind === 'judged';
    });
  }, [state.history]);
  const [i, setI] = useState(0);
  const frame = frames[i];
  const surface = frame ? surfaceOf(state.script, frame.surface) : undefined;
  const empty = !frame || !surface;
  useEffect(() => {
    if (empty) onDone();
  }, [empty, onDone]);
  if (!frame || !surface) return null;

  const action = frame.kind === 'acted' ? surface.actions?.find((a) => a.id === frame.action) : undefined;
  const view = {
    lensOn: false,
    debrief: true,
    inspected: state.inspected.filter((k) => k.startsWith(`${frame.surface}:`)).map((k) => k.slice(frame.surface.length + 1)),
    onInspect: () => {},
    onAct: () => {},
    resolved: 'done',
    timersOff: true,
    vars: state.script.vars,
  };

  return (
    <RoomLayout
      drawerLabel={t('safe.ui.debrief')}
      panel={
        <div className="space-y-4">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-widest text-brand">{t('safe.ui.replay')}</p>
            <h1 className="mt-1 text-2xl font-bold text-ink">{t('safe.ui.debrief')}</h1>
            <p className="mt-1 font-mono text-xs text-muted">{t('safe.ui.step', { n: i + 1, total: frames.length })}</p>
            <ProgressBar className="mt-2" value={(i + 1) / frames.length} />
          </div>

          <Card>
            {frame.kind === 'opened' && <p className="font-semibold text-ink">{t('safe.ui.youOpened', { what: surfaceTitle(surface) })}</p>}
            {frame.kind === 'acted' && (
              <>
                <p className="font-semibold text-ink">{t('safe.ui.youDid', { what: action ? t(action.labelKey) : frame.action })}</p>
                {action?.risk === 'risky' && !surface.respond && <div className="mt-2"><Notice tone="bad">{t('safe.summary.fooled')}</Notice></div>}
                {surface.respond && (() => {
                  const fb = responseFeedback(surface, frame.action);
                  const better = fb?.best ? surface.actions?.find((a) => a.id === fb.best) : undefined;
                  return fb && action ? <div className="mt-3"><FeedbackCard tone="dark" feedback={fb} yours={t(action.labelKey)} bestLabel={better ? t(better.labelKey) : undefined} vars={state.script.vars} /></div> : null;
                })()}
                {frame.auto && <p className="mt-2 text-sm text-muted">{t('safe.ui.auto')}</p>}
              </>
            )}
            {frame.kind === 'judged' && surface.verdict && (() => {
              const fb = judgeFeedback(surface, frame.verdict);
              return <FeedbackCard tone="dark" feedback={fb} yours={t(`safe.verdict.${frame.verdict}`)} bestLabel={fb.best ? t(`safe.verdict.${fb.best}`) : undefined} vars={state.script.vars} />;
            })()}
          </Card>

          <TellList state={state} surfaceId={frame.surface} />

          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" disabled={i === 0} onClick={() => setI(i - 1)}>{t('safe.ui.prev')}</Button>
            {i < frames.length - 1 ? <Button onClick={() => setI(i + 1)}>{t('safe.ui.next')}</Button> : <Button onClick={onDone}>{t('safe.ui.continue')}</Button>}
            <Button variant="ghost" onClick={onDone}>{t('safe.ui.skipReplay')}</Button>
          </div>
        </div>
      }
    >
      <PhoneShell clock={formatClock(state.script.phone.startTime, frame.t, state.script.phone.clockRate)} lensOn={false} onToggleLens={() => {}} bare>
        <SurfaceBody surface={surface} view={view} />
      </PhoneShell>
    </RoomLayout>
  );
}
