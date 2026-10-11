import { describe, it, expect } from 'vitest';
import raw from '@/content/scenarios/invest/section.json';
import { t } from '@/platform';
import { games as gameRooms, rooms } from './content';
import { gameStates, type SectionGame } from './section';

const games = raw.games as SectionGame[];

describe('the Investing page games', () => {
  it('lists every game once, and every required room exists', () => {
    expect(new Set(games.map((g) => g.id)).size).toBe(games.length);
    const roomIds = new Set(rooms.map((r) => r.id));
    for (const g of games) for (const r of g.requires) expect(roomIds.has(r), `${g.id} requires unknown room ${r}`).toBe(true);
  });

  it('every room-style game exists as a script, and every title and hint is written', () => {
    for (const g of games) {
      expect(t(g.titleKey), g.id).not.toBe(g.titleKey);
      expect(t(g.hintKey), g.id).not.toBe(g.hintKey);
      if (g.kind === 'room') expect(gameRooms.some((r) => r.id === g.id), `${g.id} has no script`).toBe(true);
    }
  });

  it('puts the right lessons first, as the plan says', () => {
    const need = (id: string) => games.find((g) => g.id === id)!.requires;
    expect(need('game_chai_price')).toContain('lesson_inflation');
    expect(need('game_garden')).toContain('lesson_interest');
    expect(need('stock-market')).toEqual(expect.arrayContaining(['lesson_lending', 'lesson_bonds', 'lesson_stocks']));
    expect(need('time-machine')).toEqual(expect.arrayContaining(['lesson_risk', 'lesson_diversification']));
    expect(need('mutual-fund')).toContain('lesson_funds');
    expect(need('invest-or-scam')).toEqual([]);
  });
});

describe('gameStates', () => {
  it('with nothing done, only games with no requirements are ready, and that one is recommended', () => {
    const s = gameStates(games, {}, {});
    expect(s.filter((x) => x.ready).map((x) => x.game.id)).toEqual(['invest-or-scam']);
    expect(s.find((x) => x.recommended)?.game.id).toBe('invest-or-scam');
  });

  it('lists what is missing, in order, and unlocks a game once its rooms are done', () => {
    const stock = gameStates(games, { lesson_lending: true }, {}).find((x) => x.game.id === 'stock-market')!;
    expect(stock.ready).toBe(false);
    expect(stock.missing).toEqual(['lesson_bonds', 'lesson_stocks']);
    const open = gameStates(games, { lesson_lending: true, lesson_bonds: true, lesson_stocks: true }, {}).find((x) => x.game.id === 'stock-market')!;
    expect(open.ready).toBe(true);
    expect(open.missing).toEqual([]);
  });

  it('recommends the first ready game that has not been played, and moves on once it is played', () => {
    const done = { lesson_inflation: true, lesson_interest: true };
    expect(gameStates(games, done, {}).find((x) => x.recommended)?.game.id).toBe('game_chai_price');
    expect(gameStates(games, done, { game_chai_price: true }).find((x) => x.recommended)?.game.id).toBe('game_garden');
    const all = Object.fromEntries(games.map((g) => [g.id, true]));
    expect(gameStates(games, Object.fromEntries(rooms.map((r) => [r.id, true])), all).some((x) => x.recommended)).toBe(false);
  });

  it('marks at most one game as recommended', () => {
    const everything = Object.fromEntries(rooms.map((r) => [r.id, true]));
    expect(gameStates(games, everything, {}).filter((x) => x.recommended)).toHaveLength(1);
  });
});
