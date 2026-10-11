/**
 * Saving for the investing games (Stock Market, Time Machine, Mutual Fund, Invest-or-Scam), through the platform
 * storage API. Saved per player. With no player set up (for example while developing), nothing is saved.
 *
 * What is saved is validated on the way back in by each game's own parser, so a damaged or old save can never
 * break a screen: it is simply ignored.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { getActiveProfile, loadGame, saveGame } from '@/platform';

export const gameSlot = (id: string) => `invest-game:${id}`;

export interface GameSave<T> {
  /** The student has finished the game at least once. Stays true after a replay. */
  done: boolean;
  /** Where they are, so the game can pick up. Null when there is nothing to resume. */
  state: T | null;
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Reads a stored value into a GameSave, using the game's parser for `state`. Never throws. */
export function parseGameSave<T>(raw: unknown, parseState: (state: unknown) => T | null): GameSave<T> {
  if (!isRecord(raw)) return { done: false, state: null };
  return { done: raw.done === true, state: raw.state === null || raw.state === undefined ? null : parseState(raw.state) };
}

export function useGameSave<T>(gameId: string, parseState: (state: unknown) => T | null) {
  const [loaded, setLoaded] = useState(false);
  const [pid, setPid] = useState<string | null>(null);
  const [saved, setSaved] = useState<GameSave<T>>({ done: false, state: null });
  const latest = useRef<GameSave<T>>(saved);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const profile = await getActiveProfile();
      const raw = profile ? await loadGame(profile.pid, gameSlot(gameId)) : null;
      if (!alive) return;
      setPid(profile?.pid ?? null);
      latest.current = parseGameSave(raw, parseState);
      setSaved(latest.current);
      setLoaded(true);
    })();
    return () => {
      alive = false;
    };
  }, [gameId, parseState]);

  const save = useCallback(
    (state: T | null, done?: boolean) => {
      const next: GameSave<T> = { done: done ?? latest.current.done, state };
      latest.current = next;
      setSaved(next);
      if (pid) void saveGame(pid, gameSlot(gameId), next);
    },
    [pid, gameId],
  );

  return { loaded, saved, save };
}

/** Which games the active player has finished, for the Investing page. `null` until loaded. */
export function useGamesDone(ids: string[]): Record<string, boolean> | null {
  const [done, setDone] = useState<Record<string, boolean> | null>(null);
  const key = ids.join(',');
  useEffect(() => {
    let alive = true;
    void (async () => {
      const profile = await getActiveProfile();
      const entries = await Promise.all(
        key.split(',').map(async (id) => {
          const raw = profile ? await loadGame(profile.pid, gameSlot(id)) : null;
          return [id, isRecord(raw) && raw.done === true] as const;
        }),
      );
      if (alive) setDone(Object.fromEntries(entries));
    })();
    return () => {
      alive = false;
    };
  }, [key]);
  return done;
}
