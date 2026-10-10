/** Investing ABC: the path of rooms, with progress. Route: /learn/invest. Owner: P4. */
import { Link } from 'react-router';
import { t } from '@/platform';
import { Badge, Card, ChevronIcon, ProgressBar } from '@/ui';
import { InvestShell } from './InvestShell';
import { fillTemplate, runCalcs } from './logic/calc';
import { allLessons, rooms } from './logic/content';
import { roomPoints, type RoomSummary } from './logic/room';
import { useRoomSummaries } from './useSavedProgress';

export function LessonList() {
  const summaries = useRoomSummaries(rooms);
  // The first room that is not finished is the one to do next.
  const upNextId = summaries ? rooms.find((r) => summaries[r.id]?.status !== 'done')?.id : undefined;

  return (
    <InvestShell wide>
      <header className="space-y-2 pb-2">
        <h1 className="text-2xl font-bold">{t('investui.list.title')}</h1>
        <p className="max-w-3xl text-ink-soft">{t('investui.list.subtitle')}</p>
        <p className="max-w-3xl text-sm text-muted">{t('investui.list.how')}</p>
      </header>

      <ol className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {allLessons.map((lesson) => {
          const ctx = runCalcs(lesson.vars, lesson.calcs);
          const summary: RoomSummary | undefined = lesson.kind === 'room' ? summaries?.[lesson.id] : undefined;
          const isUpNext = lesson.id === upNextId;
          const action =
            summary?.status === 'done' ? t('investui.list.review') : summary?.status === 'started' ? t('investui.list.continue') : t('investui.list.start');

          return (
            <li key={lesson.id}>
              <Link
                to={`/learn/invest/${lesson.id}`}
                className="block h-full rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                <Card className={`flex h-full flex-col gap-3 transition-colors hover:border-brand ${isUpNext ? 'border-brand' : ''}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-md bg-brand text-base font-bold text-brand-ink" aria-hidden="true">
                      {lesson.order}
                    </span>
                    <span className="flex flex-wrap justify-end gap-2">
                      {isUpNext && <Badge tone="good">{t('investui.list.upnext')}</Badge>}
                      {summary?.status === 'done' && <Badge tone="good">{t('investui.list.status.done')}</Badge>}
                      {summary?.status === 'started' && <Badge tone="info">{t('investui.list.status.started')}</Badge>}
                    </span>
                  </div>

                  <div className="flex-1">
                    <h2 className="text-lg font-bold">{fillTemplate(t(lesson.titleKey), ctx)}</h2>
                    <p className="mt-1 text-sm text-ink-soft">{fillTemplate(t(lesson.blurbKey), ctx)}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Badge>{t('investui.list.minutes', { n: lesson.estMinutes })}</Badge>
                    {lesson.kind === 'room' && <Badge>{t('investui.list.points', { n: roomPoints(lesson) })}</Badge>}
                    {lesson.kind === 'room' && <Badge>{t(`investui.room.difficulty.${lesson.difficulty}`)}</Badge>}
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
    </InvestShell>
  );
}
