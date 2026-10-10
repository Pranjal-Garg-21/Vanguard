/**
 * The simulator's playable village: walk with the arrow keys (or the
 * on-screen pad on phones), step through a door to go into a building, and
 * walk into the counter to talk. All movement rules live in logic/world.ts.
 */
import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router';
import { loadActiveProfile, loadGame, saveGame, t, useActiveProfile } from '@/platform';
import {
  INTERIOR_LEGEND,
  PLAYER_TILE,
  PixelButton,
  PixelPanel,
  Spinner,
  Tile,
  TileMap,
  VILLAGE_LEGEND,
} from '@/ui';
import { BUILDINGS, START, buildingOf, isValidPosition, rowsFor, step, type Dir, type Position } from './logic/world';

const KEYS: Record<string, Dir> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  w: 'up',
  s: 'down',
  a: 'left',
  d: 'right',
};

const SAVE_SLOT = 'village';

export function VillageGame() {
  const { profile, loaded } = useActiveProfile();
  const [pos, setPos] = useState<Position>(START);
  const [ready, setReady] = useState(false);
  /** The building whose counter the player is talking to. */
  const [talking, setTalking] = useState<string | null>(null);

  const pid = profile?.pid;

  useEffect(() => {
    if (!loaded) void loadActiveProfile();
  }, [loaded]);

  // Resume where the player left off.
  useEffect(() => {
    if (!pid) return;
    let live = true;
    void loadGame<Position>(pid, SAVE_SLOT).then((saved) => {
      if (!live) return;
      if (isValidPosition(saved)) setPos(saved);
      setReady(true);
    });
    return () => {
      live = false;
    };
  }, [pid]);

  function move(dir: Dir) {
    if (talking || !pid) return;
    const result = step(pos, dir);
    setPos(result.pos);
    if (result.event.type === 'talk') setTalking(result.event.building);
    if (result.pos.x !== pos.x || result.pos.y !== pos.y || result.pos.scene !== pos.scene) {
      void saveGame(pid, SAVE_SLOT, result.pos);
    }
  }

  // Keyboard. Re-bound after each move so it always sees the latest position.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const dir = KEYS[e.key];
      if (!dir) return;
      e.preventDefault();
      move(dir);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!loaded || (profile && !ready)) return <Spinner />;
  if (!profile) return <Navigate to="/" replace />;

  const rows = rowsFor(pos.scene) ?? rowsFor('village')!;
  const columns = rows[0]!.length;
  const inside = buildingOf(pos.scene);
  const talkingTo = talking ? BUILDINGS.find((b) => b.id === talking) : null;

  return (
    // --reserve is the height taken by everything except the map (header, hint,
    // and on phones the pad). The map grows to the largest size that fits.
    <div className="min-h-dvh bg-grass text-ink [--reserve:18rem] md:[--reserve:9rem]">
      <main className="mx-auto flex w-full flex-col items-center gap-3 px-3 py-3">
        <header className="flex w-full max-w-3xl items-center justify-between gap-2">
          <Link className="pixel-frame bg-parchment px-3 py-1 text-sm font-bold" to="/">
            ← {t('village.menu')}
          </Link>
          <h1 className="pixel-frame bg-parchment px-3 py-1 text-sm font-bold">
            {inside ? t(`village.buildings.${inside.id}.name`) : t('village.title')}
          </h1>
        </header>

        {/* The world. Positions are percentages of the map, so it scales with the screen. */}
        <div
          className="pixel-raised relative bg-ink"
          style={{
            aspectRatio: `${columns} / ${rows.length}`,
            width: `min(100%, calc((100dvh - var(--reserve)) * ${columns / rows.length}))`,
          }}
        >
          <TileMap rows={rows} legend={inside ? INTERIOR_LEGEND : VILLAGE_LEGEND} />

          {!inside &&
            BUILDINGS.map((b) => (
              <span
                key={b.id}
                className="pointer-events-none absolute bg-parchment/90 text-center text-[9px] leading-none font-bold sm:text-xs"
                style={{
                  left: `${((b.door.x - 1) / columns) * 100}%`,
                  top: `${((b.door.y - 1) / rows.length) * 100}%`,
                  width: `${(3 / columns) * 100}%`,
                  padding: '2px 0',
                }}
              >
                {t(`village.buildings.${b.id}.label`)}
              </span>
            ))}

          <span
            className="absolute block transition-[left,top] duration-100 motion-reduce:transition-none"
            style={{
              left: `${(pos.x / columns) * 100}%`,
              top: `${(pos.y / rows.length) * 100}%`,
              width: `${100 / columns}%`,
            }}
          >
            <Tile sheet={PLAYER_TILE.sheet} index={PLAYER_TILE.index} label={profile.displayName} />
          </span>
        </div>

        <p className="w-full max-w-3xl bg-parchment px-3 py-2 text-sm md:text-base">{t('village.hint')}</p>

        <Pad onMove={move} />
      </main>

      {talkingTo && (
        <div
          className="fixed inset-0 z-20 flex items-end justify-center bg-ink/60 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label={t(`village.buildings.${talkingTo.id}.name`)}
        >
          <PixelPanel className="w-full max-w-md">
            <h2 className="text-2xl font-bold">{t(`village.buildings.${talkingTo.id}.name`)}</h2>
            <p className="mt-2 text-lg">{t(`village.buildings.${talkingTo.id}.blurb`)}</p>
            <p className="mt-4 bg-white p-3">
              <span className="text-sm font-bold">{t('village.activityLabel')}</span>
              <br />
              {t(`village.buildings.${talkingTo.id}.activity`)}{' '}
              <span className="bg-ink px-2 text-xs text-parchment">{t('village.comingSoon')}</span>
            </p>
            <PixelButton autoFocus tone="grass" className="mt-5 w-full" onClick={() => setTalking(null)}>
              {t('village.close')}
            </PixelButton>
          </PixelPanel>
        </div>
      )}
    </div>
  );
}

/** On-screen direction pad for phones. Hidden on wide screens with a keyboard. */
function Pad({ onMove }: { onMove: (dir: Dir) => void }) {
  const button = (dir: Dir, glyph: string, cell: string) => (
    <PixelButton
      tone="wood"
      className={`min-h-14 ${cell}`}
      aria-label={t(`village.pad.${dir}`)}
      onClick={() => onMove(dir)}
    >
      {glyph}
    </PixelButton>
  );
  return (
    <div className="mx-auto grid w-48 grid-cols-3 gap-2 md:hidden">
      {button('up', '▲', 'col-start-2')}
      {button('left', '◀', 'col-start-1 row-start-2')}
      {button('down', '▼', 'col-start-2 row-start-2')}
      {button('right', '▶', 'col-start-3 row-start-2')}
    </div>
  );
}
