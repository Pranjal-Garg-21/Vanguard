import { t } from '@/platform';
import { rupees } from '../../phone/apps/PayApp';
import { RoomHeader, TaskList } from '../../phone/RoomParts';
import { TASKS, taskIndex, type Chapter } from '../logic/flow';

const HINTS: Record<string, string> = { t1: 'setup', t2: 'pay', t3: 'collect', t4: 'qr', t5: 'check' };

/** Left half of the UPI room: header with room progress, task cards, balance. */
export function UpiPanel({ chapter, balance }: { chapter: Chapter; balance: number }) {
  const current = Math.max(0, taskIndex(chapter));
  return (
    <div className="space-y-6">
      <RoomHeader
        title={t('safe.upi.title')}
        brief={t('safe.upi.brief')}
        progress={current / TASKS.length}
        tags={[{ label: t('safe.ui.room'), tone: 'info' }, { label: 'Easy', tone: 'good' }, { label: 'Act' }]}
      />
      <TaskList tasks={TASKS.map((task, i) => ({ id: task.id, title: t(task.titleKey), hint: t(`safe.upi.hint.${HINTS[task.id]}`), done: i < current }))} />
      <div className="rounded-xl border border-line bg-surface p-4">
        <p className="text-sm font-bold uppercase tracking-wider text-muted">{t('safe.upi.balance')}</p>
        <p className="mt-1 text-3xl font-bold tabular-nums text-ink">{rupees(balance)}</p>
      </div>
    </div>
  );
}
