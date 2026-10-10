/** Investing ABC: the path of rooms, with progress. Route: /learn/invest. Owner: P4. */
import { Link } from 'react-router';
import { t } from '@/platform';
import { Badge, Card, ChevronIcon, ProgressBar } from '@/ui';
import { InvestShell } from './InvestShell';
import { fillTemplate, runCalcs } from './logic/calc';
import { games, rooms } from './logic/content';
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
        {rooms.map((lesson) => {
          const ctx = runCalcs(lesson.vars, lesson.calcs);
          const summary: RoomSummary | undefined = summaries?.[lesson.id];
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

      <h2 className="pt-4 text-xs font-bold tracking-[0.15em] text-muted uppercase">{t('investui.list.games')}</h2>
      <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {games.map((game) => {
          const ctx = runCalcs(game.vars, game.calcs);
          return (
            <li key={game.id}>
              <GameCard to={`/learn/invest/${game.id}`} title={fillTemplate(t(game.titleKey), ctx)} hint={fillTemplate(t(game.blurbKey), ctx)} open={t('investui.list.open')} />
            </li>
          );
        })}
        <li>
          <GameCard to="/learn/invest/stock-market" title={t('stockmarket.title')} hint={t('stockmarket.open.hint')} open={t('stockmarket.open')} />
        </li>
        <li>
          <GameCard to="/learn/invest/mutual-fund" title={t('mutualfund.title')} hint={t('mutualfund.open.hint')} open={t('mutualfund.open')} />
        </li>
        <li>
          <GameCard to="/learn/invest/time-machine" title={t('timemachine.title')} hint={t('timemachine.open.hint')} open={t('timemachine.open')} />
        </li>
      </ul>
    </InvestShell>
  );
}

function GameCard({ to, title, hint, open }: { to: string; title: string; hint: string; open: string }) {
  return (
    <Link to={to} className="block h-full rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
      <Card className="flex h-full flex-col gap-2 transition-colors hover:border-brand">
        <h3 className="text-lg font-bold">{title}</h3>
        <p className="flex-1 text-sm text-ink-soft">{hint}</p>
        <span className="inline-flex items-center gap-1 text-sm font-bold text-brand">
          {open}
          <ChevronIcon dir="right" />
        </span>
      </Card>
    </Link>
  );
}
