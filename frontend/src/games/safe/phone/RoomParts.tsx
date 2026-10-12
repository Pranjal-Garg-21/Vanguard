/**
 * Left-half building blocks shared by every room: a header with a room
 * progress bar and task cards that open and close, as on TryHackMe.
 */
import type { ReactNode } from 'react';
import { t } from '@/platform';
import { AudioButton, Badge, Icon } from '@/ui';

export function RoomHeader({ title, brief, tags, progress, speak }: { title: string; brief: string; tags: { label: string; tone?: 'neutral' | 'good' | 'warn' | 'bad' | 'info' }[]; progress: number; /** Keys for the title and brief, so they can be read aloud. */ speak?: string[] }) {
  const pct = Math.round(Math.min(1, Math.max(0, progress)) * 100);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {tags.map((tag) => (
          <Badge key={tag.label} tone={tag.tone} className="px-2.5 py-1 text-sm">{tag.label}</Badge>
        ))}
      </div>
      <div className="flex items-start gap-2">
        <h1 className="flex-1 text-3xl font-bold text-ink">{title}</h1>
        {speak && <AudioButton keys={speak} className="-my-1 text-ink-soft" />}
      </div>
      <p className="text-lg leading-relaxed text-ink-soft">{brief}</p>
      <div>
        <p className="mb-1.5 text-sm font-bold text-ink-soft">{t('safe.ui.roomProgress', { pct })}</p>
        <div className="h-2.5 overflow-hidden rounded-full bg-surface-3" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-brand transition-[width]" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}

export type TaskItem = { id: string; title: string; hint?: string; done: boolean; /** Keys for the task and its hint, so they can be read aloud. */ speak?: string[] };

/** Numbered task cards. The first unfinished task starts open. */
export function TaskList({ tasks }: { tasks: TaskItem[] }) {
  const current = tasks.findIndex((x) => !x.done);
  return (
    <ol className="space-y-2">
      {tasks.map((task, i) => (
        <li key={task.id}>
          <details open={i === current} className="group rounded-lg border border-line bg-surface open:border-line-strong">
            <summary className="flex cursor-pointer list-none items-center gap-3 p-4">
              <span className="text-base font-bold text-brand">{t('safe.ui.taskN', { n: i + 1 })}</span>
              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${task.done ? 'border-brand bg-brand text-brand-ink' : 'border-line-strong'}`}>
                {task.done && <Icon name="check" className="h-3.5 w-3.5" />}
              </span>
              <span className={`flex-1 text-lg font-semibold ${task.done ? 'text-ink' : 'text-ink-soft'}`}>{task.title}<span className="sr-only">{task.done ? ' (done)' : ''}</span></span>
              <Icon name="chevronDown" className="h-5 w-5 text-muted transition group-open:rotate-180" />
            </summary>
            {task.hint && (
              <div className="border-t border-line px-4 py-3.5 text-base leading-relaxed text-ink-soft">
                <p className="mb-1.5 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted">
                  {t('safe.ui.hintLabel')}
                  {task.speak && <AudioButton keys={task.speak} className="-my-2 ms-auto h-9 w-9" />}
                </p>
                {task.hint}
              </div>
            )}
          </details>
        </li>
      ))}
    </ol>
  );
}

export const Block = ({ children }: { children: ReactNode }) => <div className="space-y-6">{children}</div>;
