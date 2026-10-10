/**
 * Investing section page: what to do next, one suggested game, then the rooms in small groups and the games.
 * Route: /learn/invest. Owner: P4.
 *
 * One big "up next" card says what to do now. Games that need a lesson first show what to learn (and a way to
 * play anyway), so the order of things is taught by the screen itself. The groups and games stay folded.
 */
import { Link } from 'react-router';
import { t } from '@/platform';
import { Badge, Button, Card, ChevronIcon, LockedTile, ProgressBar } from '@/ui';
import section from '@/content/scenarios/invest/section.json';
import { useGamesDone } from '../shared/gameSave';
import { InvestShell } from './InvestShell';
import { fillTemplate, runCalcs } from './logic/calc';
import { games as gameRooms, lessonById, rooms } from './logic/content';
import { roomPoints, type RoomSummary } from './logic/room';
import { gameStates, type GameState, type SectionGame } from './logic/section';
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

const SECTION_GAMES = section.games as SectionGame[];
const PAGE_GAME_IDS = SECTION_GAMES.filter((g) => g.kind === 'page').map((g) => g.id);

const title = (r: Room) => fillTemplate(t(r.titleKey), runCalcs(r.vars, r.calcs));
const blurb = (r: Room) => fillTemplate(t(r.blurbKey), runCalcs(r.vars, r.calcs));

export function LessonList() {
  const summaries = useRoomSummaries(rooms);
  const gameSummaries = useRoomSummaries(gameRooms);
  const pagesPlayed = useGamesDone(PAGE_GAME_IDS);

  // The first room that is not finished is the one to do next.
  const upNext = summaries ? rooms.find((r) => summaries[r.id]?.status !== 'done') : rooms[0];
  const upSummary: RoomSummary | undefined = upNext ? summaries?.[upNext.id] : undefined;

  const loaded = !!(summaries && gameSummaries && pagesPlayed);
  const states = loaded
    ? gameStates(
        SECTION_GAMES,
        Object.fromEntries(rooms.map((r) => [r.id, summaries[r.id]?.status === 'done'])),
        Object.fromEntries(SECTION_GAMES.map((g) => [g.id, g.kind === 'room' ? gameSummaries[g.id]?.status === 'done' : !!pagesPlayed[g.id]])),
      )
    : [];
  const recommended = states.find((s) => s.recommended);

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

      {recommended && (
        <Card className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Badge tone="info">{t('investui.game.recommended')}</Badge>
            <p className="mt-1 font-bold text-ink">{t(recommended.game.titleKey)}</p>
            <p className="text-sm text-ink-soft">{t(recommended.game.hintKey)}</p>
          </div>
          <Link to={recommended.game.route}>
            <Button variant="secondary">{t('investui.list.open')}</Button>
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

        <details className="rounded-xl border border-line bg-surface" open={!!recommended && !upNext}>
          <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3">
            <span className="font-bold text-ink">{t('investui.list.games')}</span>
            <span className="text-sm text-muted">{t('investui.group.games', { n: SECTION_GAMES.length })}</span>
          </summary>
          <ul className="space-y-3 border-t border-line p-3">
            {(loaded ? states : SECTION_GAMES.map((game) => ({ game, ready: true, missing: [], played: false, recommended: false }))).map((s) => (
              <li key={s.game.id}>
                <GameTile state={s} />
              </li>
            ))}
          </ul>
        </details>
      </div>
    </InvestShell>
  );
}

function GameTile({ state }: { state: GameState }) {
  const { game, ready, missing, played, recommended } = state;
  const name = t(game.titleKey);
  if (!ready) {
    const names = missing.map((id) => title(lessonById.get(id)!)).join(', ');
    const first = lessonById.get(missing[0]!)!;
    return (
      <LockedTile
        title={name}
        reason={t('investui.game.learnFirst', { rooms: names })}
        action={
          <span className="flex flex-wrap gap-2">
            <Link to={`/learn/invest/${first.id}`}>
              <Button variant="secondary">{t('investui.game.goLearn', { room: title(first) })}</Button>
            </Link>
            <Link to={game.route}>
              <Button variant="ghost">{t('investui.game.playAnyway')}</Button>
            </Link>
          </span>
        }
      />
    );
  }
  return (
    <Link to={game.route} className="flex items-center gap-3 rounded-xl border border-line px-4 py-3 hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-brand">
      <span className="flex-1">
        <span className="block font-bold text-ink">{name}</span>
        <span className="block text-sm text-ink-soft">{t(game.hintKey)}</span>
      </span>
      {recommended && <Badge tone="info">{t('investui.game.recommended')}</Badge>}
      {played && <Badge tone="good">{t('investui.game.played')}</Badge>}
      <ChevronIcon dir="right" className="h-4 w-4 text-muted" />
    </Link>
  );
}
