import { describe, expect, it } from 'vitest';

import { getGame, listGames } from '@/games/registry';
import { everydayGames } from '@/games/everyday';
import { t } from '@/platform';

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

  it('labels every concept a game teaches', () => {
    for (const game of everydayGames) {
      expect(game.concepts.length, game.id).toBeGreaterThan(0);
      for (const concept of game.concepts) {
        const key = `concept.${concept}`;
        expect(t(key), key).not.toBe(key);
      }
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
