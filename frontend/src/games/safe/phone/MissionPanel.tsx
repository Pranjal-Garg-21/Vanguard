/**
 * The "room" side panel, modelled on TryHackMe: a title with a difficulty tag,
 * a progress bar, numbered tasks that tick off as you go, and a terminal-style
 * activity log.
 */
import { t } from '@/platform';
import { useEffect, useRef, useState } from 'react';
import { ProgressBar, SectionLabel } from '@/ui';
import { Icon } from './Icon';
import { objectiveDone, surfaceOf } from './logic/runner';
import type { HistoryEntry, RunState } from './logic/types';
import { RoomHeader, TaskList } from './RoomParts';
import { surfaceTitle } from './SurfaceView';

const LEVEL = { 1: { label: 'Easy', tone: 'good' }, 2: { label: 'Medium', tone: 'warn' }, 3: { label: 'Hard', tone: 'bad' } } as const;

function stamp(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function logLine(state: RunState, e: HistoryEntry): { text: string; tone: string } | null {
  const s = surfaceOf(state.script, e.surface);
  const who = s ? surfaceTitle(s) : e.surface;
  switch (e.kind) {
    case 'delivered':
      return { text: `${t(s?.type === 'page' ? 'safe.ui.logPage' : 'safe.ui.logDelivered')} · ${who}`, tone: 'text-info' };
    case 'opened':
      return { text: `${t('safe.ui.logOpened')} · ${who}`, tone: 'text-ink-soft' };
    case 'inspected': {
      const flagged = s?.lens?.find((l) => l.id === e.lens)?.tell;
      return { text: `${t('safe.ui.logLens')} · ${e.lens}${flagged ? ` (${t('safe.ui.logFlag')})` : ''}`, tone: flagged ? 'text-bad' : 'text-muted' };
    }
    case 'acted': {
      const a = s?.actions?.find((x) => x.id === e.action);
      return { text: `${t('safe.ui.logAction')} · ${a ? t(a.labelKey) : e.action}`, tone: 'text-warn' };
    }
    case 'judged':
      return { text: `${t('safe.ui.logVerdict')} · ${t(`safe.verdict.${e.verdict}`)} (${who})`, tone: 'text-xp' };
  }
}

export function MissionPanel({ state }: { state: RunState }) {
  const { script } = state;
  const done = script.objectives.filter((o) => objectiveDone(state, o.when)).length;
  const level = LEVEL[script.level];
  const needing = script.steps.filter((s) => s.surface.respond);
  const answered = needing.filter((s) => state.acted[s.id]).length;
  const lines = state.history.map((e) => ({ e, line: logLine(state, e) })).filter((x) => x.line).slice(-12);

  // A short "task complete" banner whenever a new task is ticked off.
  const doneIds = script.objectives.filter((o) => objectiveDone(state, o.when)).map((o) => o.id);
  const seen = useRef<string[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const doneKey = doneIds.join(',');
  useEffect(() => {
    const fresh = doneIds.filter((id) => !seen.current.includes(id));
    seen.current = doneIds;
    if (fresh.length === 0) return;
    const task = script.objectives.find((o) => o.id === fresh[0]);
    setToast(task ? t(task.textKey) : null);
    const id = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doneKey]);

  return (
    <div className="space-y-6">
      {toast && (
        <div role="status" className="flex animate-banner-in items-center gap-3 rounded-lg border border-brand bg-brand/15 p-3 text-sm">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand text-brand-ink"><Icon name="check" className="h-4 w-4" /></span>
          <span>
            <span className="block text-xs font-bold uppercase tracking-wider text-brand">{t('safe.ui.taskComplete')}</span>
            <span className="text-ink">{toast}</span>
          </span>
        </div>
      )}
      <RoomHeader
        title={t(script.titleKey)}
        brief={t(script.briefKey)}
        progress={script.objectives.length ? done / script.objectives.length : 0}
        tags={[{ label: t('safe.ui.room'), tone: 'info' }, { label: level.label, tone: level.tone }, { label: script.mode === 'judge' ? 'Judge' : 'Act' }]}
      />

      <TaskList
        tasks={script.objectives.map((o) => ({
          id: o.id,
          title: t(o.textKey),
          hint: t(`safe.hint.${o.when.split(':')[0]}`),
          done: objectiveDone(state, o.when),
        }))}
      />

      {needing.length > 0 && (
        <div className="rounded-xl border border-line bg-surface p-4">
          <div className="mb-1.5 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted">
            <span>{t('safe.ui.progressInbox')}</span>
            <span className="font-mono">{answered}/{needing.length}</span>
          </div>
          <ProgressBar value={answered / needing.length} />
          {script.simulator === 'inbox' && <p className="mt-2 text-xs text-muted">{t('safe.ui.where')}</p>}
        </div>
      )}

      <div>
        <SectionLabel>{t('safe.ui.log')}</SectionLabel>
        <div className="mt-2 h-44 overflow-y-auto rounded-lg border border-line bg-black/40 p-3 font-mono text-xs leading-relaxed" role="log" aria-live="polite">
          {lines.length === 0 && <p className="text-muted">$ ...</p>}
          {lines.map(({ e, line }, i) => (
            <p key={i} className={line?.tone}>
              <span className="text-muted">[{stamp(e.t)}]</span> <span className="text-brand">&rsaquo;</span> {line?.text}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
