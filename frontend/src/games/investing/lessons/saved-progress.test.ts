import { beforeEach, describe, expect, it } from 'vitest';
import { getActiveProfile, loadGame, saveGame } from '@/platform';
import { createTestProfile, resetDb } from '@/test/fixtures';
import { rooms } from './logic/content';
import { emptyQuestionState, parseProgress, progressSlot, roomQuestions, serializeProgress, summariseProgress, type ProgressMap } from './logic/room';

/** Saves and loads a room through the real storage layer (in-memory IndexedDB), the same calls the screens make. */
describe('room progress in real storage', () => {
  const room = rooms[0]!;
  const qs = roomQuestions(room);

  beforeEach(resetDb);

  it('saves for the active player and restores exactly what was saved', async () => {
    await createTestProfile();
    const profile = (await getActiveProfile())!;
    const answers: ProgressMap = {
      [qs[0]!.id]: { ...emptyQuestionState(), solved: true, hintShown: true },
      [qs[1]!.id]: { ...emptyQuestionState(), wrong: 2, wrongOptions: ['b'] },
    };

    await saveGame(profile.pid, progressSlot(room.id), serializeProgress(answers, room));
    const back = parseProgress(await loadGame(profile.pid, progressSlot(room.id)), room);

    expect(back[qs[0]!.id]).toMatchObject({ solved: true, hintShown: true });
    expect(back[qs[1]!.id]).toMatchObject({ wrong: 2, wrongOptions: ['b'] });
    expect(summariseProgress(room, back).status).toBe('started');
    expect(summariseProgress(room, back).earned).toBe(qs[0]!.points);
  });

  it('a room with nothing saved reads as new', async () => {
    await createTestProfile();
    const profile = (await getActiveProfile())!;
    const back = parseProgress(await loadGame(profile.pid, progressSlot(room.id)), room);
    expect(summariseProgress(room, back).status).toBe('new');
  });

  it("one player's progress is never visible to another on the same phone", async () => {
    await createTestProfile({ displayName: 'First' });
    const first = (await getActiveProfile())!;
    await saveGame(first.pid, progressSlot(room.id), serializeProgress({ [qs[0]!.id]: { ...emptyQuestionState(), solved: true } }, room));

    await createTestProfile({ displayName: 'Second' });
    const second = (await getActiveProfile())!;
    expect(second.pid).not.toBe(first.pid);
    expect(await loadGame(second.pid, progressSlot(room.id))).toBeNull();
    expect(await loadGame(first.pid, progressSlot(room.id))).not.toBeNull();
  });

  it('each room has its own slot, so rooms do not overwrite each other', async () => {
    await createTestProfile();
    const profile = (await getActiveProfile())!;
    const [a, b] = [rooms[0]!, rooms[1]!];
    await saveGame(profile.pid, progressSlot(a.id), { marker: 'a' });
    await saveGame(profile.pid, progressSlot(b.id), { marker: 'b' });
    expect(await loadGame(profile.pid, progressSlot(a.id))).toEqual({ marker: 'a' });
    expect(await loadGame(profile.pid, progressSlot(b.id))).toEqual({ marker: 'b' });
  });
});
