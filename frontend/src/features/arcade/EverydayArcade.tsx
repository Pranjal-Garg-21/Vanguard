/**
 * Everyday Money — the Arcade section (P3).
 *
 * The Arcade is the second door onto the same games LifePath schedules
 * (Implementation.md §3.1, §3.2): one library of mini-games, reached either
 * through the 12-month story or directly. P4 owns the overall Arcade shell and
 * its styling; this is the Everyday Money section that plugs into it, and it
 * stays self-contained so it runs standalone until that shell exists.
 *
 * The rule that makes the Arcade safe is 6.4: in `arcade` mode `effects` are
 * NOT applied to the LifePath character — only mastery is shared. This
 * component surfaces that to the student rather than leaving it implicit, so
 * nobody is afraid to experiment with their real character's money.
 */

import { useEffect, useState } from 'react';

import { getSetting, setSetting, useActiveProfile, useT } from '@/platform';
import type { Level, MiniGameContext, MiniGameResult, Persona } from '@/core/types';
import { everydayGames, type UiMiniGame } from '@/games/everyday';
import { Icon, type IconName } from '@/ui';

export type EverydayArcadeProps = {
  persona: Persona;
  /** World seed, so a replayed round deals identically. */
  seed?: number;
  games?: UiMiniGame[];
  onExit?: () => void;
};

type Playing = { game: UiMiniGame; level: Level };

/** One icon per game, so the list can be scanned by shape as well as by name. */
const GAME_ICON: Record<string, IconName> = {
  'document-hunt': 'search',
  'bank-counter': 'wallet',
  'swipe-sort': 'target',
  'jar-split': 'rupee',
  'goal-builder': 'flag',
  'spending-detective': 'search',
  'surprise-month': 'zap',
  'debt-ladder': 'flame',
  'rescue-mission': 'shield',
};

const LEVEL_TONE: Record<number, string> = {
  1: 'bg-brand/15 text-brand',
  2: 'bg-warn/15 text-warn',
  3: 'bg-bad/15 text-bad',
};

function LevelTag({ level, label }: { level: number; label: string }) {
  return <span className={`rounded-md px-2 py-0.5 text-xs font-bold tracking-wide uppercase ${LEVEL_TONE[level] ?? ''}`}>{label}</span>;
}

export function EverydayArcade({
  persona,
  seed = 1,
  games = everydayGames,
  onExit,
}: EverydayArcadeProps) {
  const t = useT();

  const [playing, setPlaying] = useState<Playing | null>(null);
  const [result, setResult] = useState<{ game: UiMiniGame; result: MiniGameResult } | null>(
    null,
  );
  const [level, setLevel] = useState<Level>(1);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | 'todo' | 'done'>('all');

  // Which games the player has finished, per difficulty, kept on this device.
  const { profile } = useActiveProfile();
  const pid = profile?.pid;
  const [done, setDone] = useState<string[]>([]);
  useEffect(() => {
    if (pid) void getSetting<string[]>(pid, 'everydayDone').then((saved) => setDone(saved ?? []));
  }, [pid]);
  const markDone = (id: string, lvl: number) => {
    const key = `${id}:${lvl}`;
    if (done.includes(key)) return;
    const next = [...done, key];
    setDone(next);
    if (pid) void setSetting(pid, 'everydayDone', next);
  };

  // -- a game is running ---------------------------------------------------
  if (playing) {
    const ctx: MiniGameContext = {
      persona,
      level: playing.level,
      seed,
      stateSlice: {},
      mode: 'arcade',
    };
    const { Component } = playing.game;

    return (
      <section className="arcade arcade--playing">
        <header className="arcade__bar">
          <button type="button" onClick={() => setPlaying(null)}>
            <Icon name="arrowLeft" className="me-1 inline h-4 w-4" />
            {t('arcade.quit')}
          </button>
          <span className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand/15 text-brand">
              <Icon name={GAME_ICON[playing.game.id] ?? 'zap'} className="h-5 w-5" />
            </span>
            <span className="truncate text-xl font-extrabold">{t(`arcade.game.${playing.game.id}.title`)}</span>
          </span>
          <LevelTag level={playing.level} label={t(`arcade.level.${playing.level}`)} />
        </header>

        <div className="arcade__room">
          <div className="arcade__stage">
            <Component
              // Replaying a game starts it over, rather than resuming the round
              // the student just finished.
              key={`${playing.game.id}:${playing.level}:${seed}`}
              ctx={ctx}
              onComplete={(r) => {
                markDone(playing.game.id, playing.level);
                setResult({ game: playing.game, result: r });
                setPlaying(null);
              }}
            />
          </div>

          <aside className="arcade__rail">
            <section>
              <h3 className="arcade__rail-title">{t('arcade.objective')}</h3>
              <p className="text-sm text-ink-soft">{t(`arcade.game.${playing.game.id}.blurb`)}</p>
            </section>
            <section>
              <h3 className="arcade__rail-title">{t('arcade.youPractise')}</h3>
              <ul className="arcade__concepts">
                {playing.game.concepts.map((c) => (
                  <li key={c}>{t(`concepts.${c}.title`)}</li>
                ))}
              </ul>
            </section>
            <p className="arcade__rail-note">{t('arcade.safeNote')}</p>
          </aside>
        </div>
      </section>
    );
  }

  // -- a game has just finished --------------------------------------------
  if (result) {
    const concepts = Object.entries(result.result.conceptDeltas);

    return (
      <section className="arcade arcade--result">
        <h2>{t(`arcade.game.${result.game.id}.title`)}</h2>
        <p>{t(result.result.summaryKey)}</p>

        {concepts.length > 0 && (
          <>
            <h3>{t('arcade.what_you_practised')}</h3>
            <ul>
              {concepts.map(([concept, target]) => (
                <li key={concept}>
                  {t(`concepts.${concept}.title`)}
                  <span
                    className="arcade__dot"
                    data-status={target >= 0.7 ? 'green' : target >= 0.4 ? 'amber' : 'red'}
                  />
                </li>
              ))}
            </ul>
          </>
        )}

        {result.result.misconceptions.length > 0 && (
          <>
            <h3>{t('arcade.worth_another_look')}</h3>
            <ul>
              {result.result.misconceptions.map((m) => (
                <li key={m}>{t(`misconception.${m}`)}</li>
              ))}
            </ul>
          </>
        )}

        {/* 6.4: the Arcade never touches the LifePath character's money. */}
        <p className="arcade__sandbox-note">{t('arcade.no_effects')}</p>

        <button type="button" onClick={() => setResult(null)}>
          {t('arcade.back_to_games')}
        </button>
      </section>
    );
  }

  // -- the game list -------------------------------------------------------
  const total = games.length * 3;
  const doneAt = (l: number) => games.filter((g) => done.includes(`${g.id}:${l}`)).length;
  const visible = games.filter((g) => {
    const text = `${t(`arcade.game.${g.id}.title`)} ${t(`arcade.game.${g.id}.blurb`)}`.toLowerCase();
    const isDone = done.includes(`${g.id}:${level}`);
    return text.includes(query.trim().toLowerCase()) && (status === 'all' || (status === 'done') === isDone);
  });

  return (
    <section className="arcade">
      <header className="arcade__hero">
        <div className="relative z-10 flex-1 space-y-4">
          {onExit && (
            <button type="button" onClick={onExit}>
              {t('common.back')}
            </button>
          )}
          <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl">{t('arcade.everyday.title')}</h1>
          <p className="max-w-xl text-ink-soft">{t('arcade.everyday.intro')}</p>

          <div className="flex items-center gap-4">
            <div className="flex h-5 flex-1 gap-[3px]" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done.length} aria-label={t('arcade.progress')}>
              {Array.from({ length: total }, (_, i) => (
                <span key={i} className={`flex-1 rounded-[2px] ${i < done.length ? 'bg-brand' : 'bg-white/10'}`} />
              ))}
            </div>
            <p className="shrink-0 text-2xl font-extrabold tabular-nums">
              {done.length}
              <span className="text-base font-bold text-muted"> / {total}</span>
            </p>
          </div>

          <dl className="flex flex-wrap gap-x-8 gap-y-2">
            {([1, 2, 3] as Level[]).map((l) => (
              <div key={l} className="flex items-baseline gap-2">
                <dd className="text-2xl font-extrabold tabular-nums">
                  {doneAt(l)}
                  <span className="text-sm font-bold text-muted"> / {games.length}</span>
                </dd>
                <dt className="text-sm font-bold text-ink-soft">{t(`arcade.level.${l}`)}</dt>
              </div>
            ))}
          </dl>
        </div>
        <CoinArt />
      </header>

      <div className="arcade__filters">
        <label className="relative min-w-0 flex-1">
          <Icon name="search" className="pointer-events-none absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
          <span className="sr-only">{t('arcade.search')}</span>
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('arcade.search')} />
        </label>
        <fieldset className="arcade__levels">
          <legend className="sr-only">{t('arcade.difficulty')}</legend>
          {([1, 2, 3] as Level[]).map((l) => (
            <button key={l} type="button" aria-pressed={level === l} onClick={() => setLevel(l)}>
              {t(`arcade.level.${l}`)}
            </button>
          ))}
        </fieldset>
        <fieldset className="arcade__levels">
          <legend className="sr-only">{t('arcade.status')}</legend>
          {(['all', 'todo', 'done'] as const).map((k) => (
            <button key={k} type="button" aria-pressed={status === k} onClick={() => setStatus(k)}>
              {t(`arcade.status_${k}`)}
            </button>
          ))}
        </fieldset>
      </div>

      <h2 className="text-2xl font-extrabold">{t('arcade.allGames')}</h2>
      {visible.length === 0 && <p className="text-ink-soft">{t('arcade.noMatch')}</p>}

      <ul className="arcade__games">
        {visible.map((game) => {
          const available = game.levels.includes(level);
          const isDone = done.includes(`${game.id}:${level}`);
          return (
            <li key={game.id} className="arcade__card" data-available={available}>
              <div className="flex items-center justify-between gap-2">
                <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand/15 text-brand">
                  <Icon name={GAME_ICON[game.id] ?? 'zap'} className="h-6 w-6" />
                </span>
                <span className="flex items-center gap-2">
                  {isDone && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-brand">
                      <Icon name="check" className="h-4 w-4" />
                      {t('arcade.status_done')}
                    </span>
                  )}
                  <LevelTag level={level} label={t(`arcade.level.${level}`)} />
                </span>
              </div>
              <h3>{t(`arcade.game.${game.id}.title`)}</h3>
              <p className="text-sm text-ink-soft">{t(`arcade.game.${game.id}.blurb`)}</p>
              <ul className="arcade__concepts">
                {game.concepts.map((c) => (
                  <li key={c}>{t(`concepts.${c}.title`)}</li>
                ))}
              </ul>
              <button type="button" className="arcade__play" disabled={!available} onClick={() => setPlaying({ game, level })}>
                {available ? t(isDone ? 'arcade.playAgain' : 'arcade.play') : t('arcade.notAtLevel')}
                {available && <Icon name="arrowRight" className="ms-1 inline h-4 w-4" />}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** A stack of coins on a glowing pad: money, and nothing else, as the picture on the page. */
function CoinArt() {
  const t = useT();
  const coin = (x: number, y: number, key: string) => (
    <g key={key}>
      <ellipse cx={x} cy={y + 9} rx="34" ry="12" fill="#6fa80f" />
      <rect x={x - 34} y={y} width="68" height="9" fill="#6fa80f" />
      <ellipse cx={x} cy={y} rx="34" ry="12" fill="#a3ea2a" />
      <ellipse cx={x} cy={y} rx="22" ry="7" fill="none" stroke="#6fa80f" strokeWidth="2" />
    </g>
  );
  return (
    <svg viewBox="0 0 320 220" className="relative z-10 hidden h-48 w-72 shrink-0 md:block" role="img" aria-label={t('arcade.coinsLabel')}>
      <defs>
        <radialGradient id="pad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#a3ea2a" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#a3ea2a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="160" cy="176" rx="150" ry="36" fill="url(#pad)" />
      <ellipse cx="160" cy="176" rx="104" ry="22" fill="none" stroke="#a3ea2a" strokeOpacity="0.5" strokeWidth="2" />
      {[0, 1, 2, 3].map((i) => coin(112, 150 - i * 14, `a${i}`))}
      {[0, 1, 2, 3, 4, 5].map((i) => coin(190, 160 - i * 14, `b${i}`))}
      {[0, 1].map((i) => coin(244, 164 - i * 14, `c${i}`))}
    </svg>
  );
}
