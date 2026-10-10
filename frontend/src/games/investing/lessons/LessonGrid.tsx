/**
 * The lessons of one topic section as a grid of cards, the next one to do marked "Up next".
 * Shared by the Investing page and the Banking, Planning, Saving and Borrowing pages. Owner: P4.
 */
import { Link } from 'react-router';
import { t } from '@/platform';
import { Badge, Card, ChevronIcon, ProgressBar } from '@/ui';
import { fillTemplate, runCalcs } from './logic/calc';
import { roomPoints, type RoomSummary } from './logic/room';
import type { Room } from './logic/types';

export const lessonTitle = (r: Room) => fillTemplate(t(r.titleKey), runCalcs(r.vars, r.calcs));
const blurb = (r: Room) => fillTemplate(t(r.blurbKey), runCalcs(r.vars, r.calcs));

export function LessonGrid({ lessons, summaries, upNextId }: { lessons: Room[]; summaries: Record<string, RoomSummary> | undefined; upNextId?: string }) {
  return (
    <ol className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {lessons.map((lesson) => {
        const summary: RoomSummary | undefined = summaries?.[lesson.id];
        const isUpNext = lesson.id === upNextId;
        const action = summary?.status === 'done' ? t('investui.list.review') : summary?.status === 'started' ? t('investui.list.continue') : t('investui.list.start');
        return (
          <li key={lesson.id}>
            <Link to={`/learn/${lesson.pillar}/${lesson.id}`} className="block h-full rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
              <Card className={`flex h-full flex-col gap-3 transition-colors hover:border-brand ${isUpNext ? 'border-brand' : ''}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-md bg-brand text-base font-bold text-brand-ink" aria-hidden="true">
                    {lesson.order}
                  </span>
                  <span className="flex flex-wrap justify-end gap-2">
                    {isUpNext && <Badge variant="good">{t('investui.list.upnext')}</Badge>}
                    {summary?.status === 'done' && <Badge variant="good">{t('investui.list.status.done')}</Badge>}
                    {summary?.status === 'started' && <Badge variant="info">{t('investui.list.status.started')}</Badge>}
                  </span>
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-bold">{lessonTitle(lesson)}</h2>
                  <p className="mt-1 text-sm text-ink-soft">{blurb(lesson)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge>{t('investui.list.minutes', { n: lesson.estMinutes })}</Badge>
                  <Badge>{t('investui.list.points', { n: roomPoints(lesson) })}</Badge>
                  <Badge>{t(`investui.room.difficulty.${lesson.difficulty}`)}</Badge>
                </div>
                {summary && summary.status !== 'new' && (
                  <div>
                    <ProgressBar value={summary.tasksDone / summary.tasksTotal} />
                    <div className="mt-1.5 flex justify-between text-xs font-bold text-muted">
                      <span>{t('investui.list.tasks', { done: summary.tasksDone, total: summary.tasksTotal })}</span>
                      <span>{t('investui.list.earned', { earned: summary.earned, total: summary.total })}</span>
                    </div>
                  </div>
                )}
                <span className="inline-flex items-center gap-1 text-sm font-bold text-brand">
                  {action}
                  <ChevronIcon dir="right" />
                </span>
              </Card>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
