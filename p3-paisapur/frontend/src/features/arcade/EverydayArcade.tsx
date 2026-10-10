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

import { useState } from 'react';

import { useT } from '@/platform';
import type { Level, MiniGameContext, MiniGameResult, Persona } from '@/core/types';
import { everydayGames, type UiMiniGame } from '@/games/everyday';

export type EverydayArcadeProps = {
  persona: Persona;
  /** World seed, so a replayed round deals identically. */
  seed?: number;
  games?: UiMiniGame[];
  onExit?: () => void;
};

type Playing = { game: UiMiniGame; level: Level };

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
            {t('arcade.quit')}
          </button>
          <span>{t(`arcade.game.${playing.game.id}.title`)}</span>
          <span>{t('arcade.level_n', { count: playing.level })}</span>
        </header>

        <Component
          // Replaying a game starts it over, rather than resuming the round
          // the student just finished.
          key={`${playing.game.id}:${playing.level}:${seed}`}
          ctx={ctx}
          onComplete={(r) => {
            setResult({ game: playing.game, result: r });
            setPlaying(null);
          }}
        />
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
  return (
    <section className="arcade">
      <header>
        {onExit && (
          <button type="button" onClick={onExit}>
            {t('common.back')}
          </button>
        )}
        <h1>{t('arcade.everyday.title')}</h1>
        <p>{t('arcade.everyday.blurb')}</p>
      </header>

      <fieldset className="arcade__levels">
        <legend>{t('arcade.difficulty')}</legend>
        {([1, 2, 3] as Level[]).map((l) => (
          <button
            key={l}
            type="button"
            aria-pressed={level === l}
            onClick={() => setLevel(l)}
          >
            {t(`arcade.level.${l}`)}
          </button>
        ))}
      </fieldset>

      <ul className="arcade__games">
        {games.map((game) => {
          const available = game.levels.includes(level);
          return (
            <li key={game.id} className="arcade__card">
              <h3>{t(`arcade.game.${game.id}.title`)}</h3>
              <p>{t(`arcade.game.${game.id}.blurb`)}</p>
              <ul className="arcade__concepts">
                {game.concepts.map((c) => (
                  <li key={c}>{t(`concepts.${c}.title`)}</li>
                ))}
              </ul>
              <button
                type="button"
                disabled={!available}
                onClick={() => setPlaying({ game, level })}
              >
                {t('arcade.play')}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
