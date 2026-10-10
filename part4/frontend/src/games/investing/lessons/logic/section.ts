/** Which games are ready, which need a lesson first, and which one to suggest. Pure: no React, no storage. */

export interface SectionGame {
  id: string;
  route: string;
  kind: 'room' | 'page';
  titleKey: string;
  hintKey: string;
  /** Room (lesson) ids to do first. */
  requires: string[];
}

export interface GameState {
  game: SectionGame;
  ready: boolean;
  /** The required rooms not finished yet, in the order listed. */
  missing: string[];
  played: boolean;
  /** The one game to suggest: the first ready game that has not been played. */
  recommended: boolean;
}

/**
 * `roomDone` says which rooms are finished; `played` says which games have been finished at least once.
 * A room that is not listed counts as not finished.
 */
export function gameStates(games: SectionGame[], roomDone: Record<string, boolean>, played: Record<string, boolean>): GameState[] {
  const states = games.map((game) => {
    const missing = game.requires.filter((r) => !roomDone[r]);
    return { game, ready: missing.length === 0, missing, played: !!played[game.id], recommended: false };
  });
  const pick = states.find((s) => s.ready && !s.played);
  if (pick) pick.recommended = true;
  return states;
}
