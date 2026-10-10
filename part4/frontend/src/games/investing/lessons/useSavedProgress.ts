/**
 * Loads and saves a room's progress for the active player, through the platform storage API.
 * With no player set up (for example while developing), nothing is saved and rooms work in memory.
 */
import { useCallback, useEffect, useState } from 'react';
import { getActiveProfile, loadGame, saveGame } from '@/platform';
import { parseProgress, progressSlot, serializeProgress, summariseProgress, type ProgressMap, type RoomSummary } from './logic/room';
import type { Room } from './logic/types';

export function useSavedProgress(room: Room) {
  const [state, setState] = useState<{ loaded: boolean; pid: string | null; initial: ProgressMap }>({
    loaded: false,
    pid: null,
    initial: {},
  });

  useEffect(() => {
    let alive = true;
    void (async () => {
      const profile = await getActiveProfile();
      const raw = profile ? await loadGame(profile.pid, progressSlot(room.id)) : null;
      if (alive) setState({ loaded: true, pid: profile?.pid ?? null, initial: parseProgress(raw, room) });
    })();
    return () => {
      alive = false;
    };
  }, [room]);

  const { pid } = state;
  const save = useCallback(
    (answers: ProgressMap) => {
      if (pid) void saveGame(pid, progressSlot(room.id), serializeProgress(answers, room));
    },
    [pid, room],
  );

  return { loaded: state.loaded, initial: state.initial, save };
}

/** A summary for each room, for the lesson list. `null` until loaded. */
export function useRoomSummaries(rooms: Room[]): Record<string, RoomSummary> | null {
  const [summaries, setSummaries] = useState<Record<string, RoomSummary> | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const profile = await getActiveProfile();
      const entries = await Promise.all(
        rooms.map(async (room) => {
          const raw = profile ? await loadGame(profile.pid, progressSlot(room.id)) : null;
          return [room.id, summariseProgress(room, parseProgress(raw, room))] as const;
        }),
      );
      if (alive) setSummaries(Object.fromEntries(entries));
    })();
    return () => {
      alive = false;
    };
  }, [rooms]);

  return summaries;
}
