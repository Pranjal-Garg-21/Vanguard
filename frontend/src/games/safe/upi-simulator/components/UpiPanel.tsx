import { t } from '@/platform';
import { Badge, ProgressBar, SectionLabel } from '@/ui';
import { Icon } from '../../phone/Icon';
import { rupees } from '../../phone/apps/PayApp';
import { TASKS, taskIndex, type Chapter } from '../logic/flow';

/** Side panel in the same style as the phone rooms: title, tasks that tick off, balance. */
export function UpiPanel({ chapter, balance }: { chapter: Chapter; balance: number }) {
  const current = taskIndex(chapter);
  return (
    <div className="space-y-5">
      <div>
        <div className="flex flex-wrap gap-2">
          <Badge tone="info">{t('safe.ui.room')}</Badge>
          <Badge tone="good">Easy</Badge>
          <Badge>Act</Badge>
        </div>
        <h1 className="mt-2 text-2xl font-bold text-ink">{t('safe.upi.title')}</h1>
        <p className="mt-1 text-sm text-ink-soft">{t('safe.upi.brief')}</p>
      </div>
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <SectionLabel>{t('safe.ui.tasks')}</SectionLabel>
          <span className="font-mono text-xs text-muted">{Math.max(0, current)}/{TASKS.length}</span>
        </div>
        <ProgressBar value={Math.max(0, current) / TASKS.length} />
        <ol className="mt-3 space-y-2">
          {TASKS.map((task, i) => {
            const done = i < current;
            const active = i === current;
            return (
              <li key={task.id} className={`flex items-center gap-3 rounded-lg border p-3 text-sm ${done ? 'border-brand/50 bg-brand/10 text-ink' : active ? 'border-line-strong bg-surface-2 text-ink' : 'border-line bg-surface text-muted'}`}>
                <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${done ? 'bg-brand text-brand-ink' : 'bg-surface-3 text-muted'}`}>
                  {done ? <Icon name="check" className="h-3 w-3" /> : i + 1}
                </span>
                {t(task.titleKey)}
              </li>
            );
          })}
        </ol>
      </div>
      <div className="rounded-xl border border-line bg-surface p-4">
        <p className="text-xs font-bold uppercase tracking-wider text-muted">{t('safe.upi.balance')}</p>
        <p className="mt-1 text-2xl font-bold tabular-nums text-ink">{rupees(balance)}</p>
      </div>
    </div>
  );
}
