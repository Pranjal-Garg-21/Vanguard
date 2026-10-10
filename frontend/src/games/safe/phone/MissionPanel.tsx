/**
 * The "room" side panel, modelled on TryHackMe: a title with a difficulty tag,
 * a progress bar, numbered tasks that tick off as you go, and a terminal-style
 * activity log.
 */
import { t } from '@/platform';
import { Badge, ProgressBar, SectionLabel } from '@/ui';
import { objectiveDone, surfaceOf } from './logic/runner';
import type { HistoryEntry, RunState } from './logic/types';
import { Icon } from './Icon';
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

  return (
    <div className="space-y-5">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="info">{t('safe.ui.room')}</Badge>
          <Badge tone={level.tone}>{level.label}</Badge>
          <Badge>{script.mode === 'judge' ? 'Judge' : 'Act'}</Badge>
        </div>
        <h1 className="mt-2 text-2xl font-bold text-ink">{t(script.titleKey)}</h1>
        <p className="mt-1 text-sm text-ink-soft">{t(script.briefKey)}</p>
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <SectionLabel>{t('safe.ui.tasks')}</SectionLabel>
          <span className="font-mono text-xs text-muted">{done}/{script.objectives.length}</span>
        </div>
        <ProgressBar value={script.objectives.length ? done / script.objectives.length : 0} />
        <ol className="mt-3 space-y-2">
          {script.objectives.map((o, i) => {
            const ok = objectiveDone(state, o.when);
            return (
              <li key={o.id} className={`flex items-start gap-3 rounded-lg border p-3 text-sm ${ok ? 'border-brand/50 bg-brand/10 text-ink' : 'border-line bg-surface text-ink-soft'}`}>
                <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${ok ? 'bg-brand text-brand-ink' : 'bg-surface-3 text-muted'}`} aria-hidden>
                  {ok ? <Icon name="check" className="h-3 w-3" /> : i + 1}
                </span>
                <span>{t(o.textKey)}<span className="sr-only">{ok ? ' (done)' : ''}</span></span>
              </li>
            );
          })}
        </ol>
      </div>

      {needing.length > 0 && (
        <div className="rounded-xl border border-line bg-surface p-4">
          <div className="mb-1.5 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted">
            <span>{t('safe.ui.progressInbox')}</span>
            <span className="font-mono">{answered}/{needing.length}</span>
          </div>
          <ProgressBar value={answered / needing.length} />
          <p className="mt-2 text-xs text-muted">{t('safe.ui.where')}</p>
        </div>
      )}

      <div>
        <SectionLabel>{t('safe.ui.log')}</SectionLabel>
        <div className="mt-2 h-44 overflow-y-auto rounded-lg border border-line bg-black/40 p-3 font-mono text-xs leading-relaxed" role="log" aria-live="polite">
          {lines.length === 0 && <p className="text-muted">$ …</p>}
          {lines.map(({ e, line }, i) => (
            <p key={i} className={line?.tone}>
              <span className="text-muted">[{stamp(e.t)}]</span> <span className="text-brand">›</span> {line?.text}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
