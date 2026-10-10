/**
 * Investing section page: every lesson as a card (the next one is marked), one suggested game, then the games.
 * Route: /learn/invest. Owner: P4.
 *
 * Games that need a lesson first show what to learn (and a way to
 * play anyway), so the order of things is taught by the screen itself.
 */
import { Link } from 'react-router';
import { t } from '@/platform';
import { Badge, Button, Card, ChevronIcon, LockedTile } from '@/ui';
import section from '@/content/scenarios/invest/section.json';
import { useGamesDone } from '../shared/gameSave';
import { InvestShell } from './InvestShell';
import { LessonGrid, lessonTitle as title } from './LessonGrid';
import { games as gameRooms, lessonById, rooms } from './logic/content';
import { gameStates, type GameState, type SectionGame } from './logic/section';
import { useRoomSummaries } from './useSavedProgress';

const SECTION_GAMES = section.games as SectionGame[];
const PAGE_GAME_IDS = SECTION_GAMES.filter((g) => g.kind === 'page').map((g) => g.id);


export function LessonList() {
  const summaries = useRoomSummaries(rooms);
  const gameSummaries = useRoomSummaries(gameRooms);
  const pagesPlayed = useGamesDone(PAGE_GAME_IDS);

  // The first room that is not finished is the one to do next.
  const upNext = summaries ? rooms.find((r) => summaries[r.id]?.status !== 'done') : rooms[0];

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

      {recommended && (
        <Card className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Badge variant="info">{t('investui.game.recommended')}</Badge>
            <p className="mt-1 font-bold text-ink">{t(recommended.game.titleKey)}</p>
            <p className="text-sm text-ink-soft">{t(recommended.game.hintKey)}</p>
          </div>
          <Link to={recommended.game.route}>
            <Button variant="secondary">{t('investui.list.open')}</Button>
          </Link>
        </Card>
      )}

      <LessonGrid lessons={rooms} summaries={summaries ?? undefined} upNextId={upNext?.id} />

      <div className="space-y-3">
        <details className="rounded-xl border border-line bg-surface" open>
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
      {recommended && <Badge variant="info">{t('investui.game.recommended')}</Badge>}
      {played && <Badge variant="good">{t('investui.game.played')}</Badge>}
      <ChevronIcon dir="right" className="h-4 w-4 text-muted" />
    </Link>
  );
}
