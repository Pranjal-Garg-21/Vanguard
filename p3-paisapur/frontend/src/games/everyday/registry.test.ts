import { describe, expect, it } from 'vitest';

import { getGame, listGames } from '@/games/registry';
import { everydayGames } from '@/games/everyday';
import { t } from '@/platform';
import { CONCEPTS, SCRIPTS } from '@/core/story/content';
import { walkSteps } from '@/core/story';

describe('Everyday Money games are wired into the app', () => {
  it('registers every game so the runtime can find it by id', () => {
    for (const game of everydayGames) {
      expect(getGame(game.id), game.id).toBeDefined();
    }
    expect(listGames().length).toBeGreaterThanOrEqual(everydayGames.length);
  });

  it('gives every game a unique id', () => {
    const ids = listGames().map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has a title and blurb for every game, so the Arcade shows no raw ids', () => {
    for (const game of everydayGames) {
      for (const field of ['title', 'blurb'] as const) {
        const key = `arcade.game.${game.id}.${field}`;
        expect(t(key), key).not.toBe(key);
      }
    }
  });

  it('teaches concepts that exist in the shared list, with a card', () => {
    // One vocabulary: a game may only claim concepts Paisapur also knows
    // about, so the Journal and the Arcade never disagree about what a
    // concept is called.
    const known = new Set(CONCEPTS.map((c) => c.id));
    for (const game of everydayGames) {
      expect(game.concepts.length, game.id).toBeGreaterThan(0);
      for (const concept of game.concepts) {
        expect(known.has(concept), `${game.id} teaches unknown concept ${concept}`).toBe(true);
        const key = `concepts.${concept}.title`;
        expect(t(key), key).not.toBe(key);
      }
    }
  });

  it('is reachable from the story: every game id appears in a script', () => {
    // A built game nothing calls is invisible to a student playing Paisapur.
    const called = new Set<string>();
    for (const steps of Object.values(SCRIPTS)) {
      walkSteps(steps, (s) => 'minigame' in s && called.add(s.minigame));
    }
    for (const game of everydayGames) {
      expect(called.has(game.id), `${game.id} is never called by a script`).toBe(true);
    }
  });

  it('carries a Component, since these cannot be played headlessly', async () => {
    for (const game of everydayGames) {
      expect(game.Component, game.id).toBeTypeOf('function');
      // play() exists to satisfy the MiniGame contract but must say so loudly
      // rather than silently resolving nothing.
      await expect(game.play({
        persona: {}, level: 1, seed: 1, stateSlice: {}, mode: 'arcade',
      })).rejects.toThrow(/Component/);
    }
  });
});
