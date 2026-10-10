/**
 * Investing ABC: what to do next, then the rooms in small groups. Route: /learn/invest. Owner: P4.
 * One big "up next" card says what to do now; the groups and the games stay folded until you open them.
 */
import { Link } from 'react-router';
import { t } from '@/platform';
import { Badge, Button, Card, ChevronIcon, ProgressBar } from '@/ui';
import { InvestShell } from './InvestShell';
import { fillTemplate, runCalcs } from './logic/calc';
import { games, rooms } from './logic/content';
import { roomPoints, type RoomSummary } from './logic/room';
import type { Room } from './logic/types';
import { useRoomSummaries } from './useSavedProgress';

/** Rooms are grouped by their order number, so a new room lands in the right group on its own. */
const GROUPS = [
  { id: 'basics', from: 1, to: 3 },
  { id: 'owning', from: 4, to: 6 },
  { id: 'risk', from: 7, to: 8 },
  { id: 'funds', from: 9, to: 12 },
  { id: 'time', from: 13, to: 14 },
];

const title = (r: Room) => fillTemplate(t(r.titleKey), runCalcs(r.vars, r.calcs));
const blurb = (r: Room) => fillTemplate(t(r.blurbKey), runCalcs(r.vars, r.calcs));

export function LessonList() {
  const summaries = useRoomSummaries(rooms);
  // The first room that is not finished is the one to do next.
  const upNext = summaries ? rooms.find((r) => summaries[r.id]?.status !== 'done') : rooms[0];
  const upSummary: RoomSummary | undefined = upNext ? summaries?.[upNext.id] : undefined;

  return (
    <InvestShell wide>
      <header className="space-y-1 pb-1">
        <h1 className="text-2xl font-bold">{t('investui.list.title')}</h1>
        <p className="max-w-3xl text-ink-soft">{t('investui.list.subtitle')}</p>
      </header>

      {upNext && (
        <Card className="space-y-3 border-brand">
          <Badge tone="good">{t('investui.list.upnext')}</Badge>
          <h2 className="text-2xl font-bold">{title(upNext)}</h2>
          <p className="max-w-2xl text-lg text-ink-soft">{blurb(upNext)}</p>
          {upSummary && upSummary.status !== 'new' && (
            <div className="max-w-md">
              <ProgressBar value={upSummary.tasksDone / upSummary.tasksTotal} />
              <p className="mt-1 text-xs font-bold text-muted">{t('investui.list.tasks', { done: upSummary.tasksDone, total: upSummary.tasksTotal })}</p>
            </div>
          )}
          <Link to={`/learn/invest/${upNext.id}`} className="inline-block">
            <Button size="lg">{upSummary?.status === 'started' ? t('investui.list.continue') : t('investui.list.start')}</Button>
          </Link>
        </Card>
      )}

      <div className="space-y-3">
        {GROUPS.map((g) => {
          const inGroup = rooms.filter((r) => r.order >= g.from && r.order <= g.to);
          if (inGroup.length === 0) return null;
          const done = inGroup.filter((r) => summaries?.[r.id]?.status === 'done').length;
          const open = upNext ? inGroup.some((r) => r.id === upNext.id) : false;
          return (
            <details key={g.id} open={open} className="rounded-xl border border-line bg-surface">
              <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3">
                <span className="font-bold text-ink">{t(`investui.group.${g.id}`)}</span>
                <span className="text-sm text-muted">{t('investui.group.count', { done, total: inGroup.length })}</span>
              </summary>
              <ul className="divide-y divide-line border-t border-line">
                {inGroup.map((r) => {
                  const s = summaries?.[r.id];
                  return (
                    <li key={r.id}>
                      <Link to={`/learn/invest/${r.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-brand">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-surface-3 text-sm font-bold text-ink-soft" aria-hidden="true">
                          {r.order}
                        </span>
                        <span className="flex-1">
                          <span className="block font-bold text-ink">{title(r)}</span>
                          <span className="block text-xs text-muted">
                            {t('investui.list.minutes', { n: r.estMinutes })} · {t('investui.list.points', { n: roomPoints(r) })}
                          </span>
                        </span>
                        {s?.status === 'done' && <Badge tone="good">{t('investui.list.status.done')}</Badge>}
                        {s?.status === 'started' && <Badge tone="info">{t('investui.list.status.started')}</Badge>}
                        <ChevronIcon dir="right" className="h-4 w-4 text-muted" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </details>
          );
        })}

        <details className="rounded-xl border border-line bg-surface">
          <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3">
            <span className="font-bold text-ink">{t('investui.list.games')}</span>
            <span className="text-sm text-muted">{t('investui.group.games', { n: games.length + 3 })}</span>
          </summary>
          <ul className="divide-y divide-line border-t border-line">
            {games.map((game) => (
              <GameRow key={game.id} to={`/learn/invest/${game.id}`} title={title(game)} hint={blurb(game)} />
            ))}
            <GameRow to="/learn/invest/stock-market" title={t('stockmarket.title')} hint={t('stockmarket.open.hint')} />
            <GameRow to="/learn/invest/mutual-fund" title={t('mutualfund.title')} hint={t('mutualfund.open.hint')} />
            <GameRow to="/learn/invest/time-machine" title={t('timemachine.title')} hint={t('timemachine.open.hint')} />
          </ul>
        </details>
      </div>
    </InvestShell>
  );
}

function GameRow({ to, title: name, hint }: { to: string; title: string; hint: string }) {
  return (
    <li>
      <Link to={to} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-brand">
        <span className="flex-1">
          <span className="block font-bold text-ink">{name}</span>
          <span className="block text-sm text-ink-soft">{hint}</span>
        </span>
        <ChevronIcon dir="right" className="h-4 w-4 text-muted" />
      </Link>
    </li>
  );
}
