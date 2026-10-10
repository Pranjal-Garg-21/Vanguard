/**
 * The list of every mini-game. The runtime and screens find games here by ID,
 * so games never import each other. Owner: P2 (add your game with a PR).
 */
import type { MiniGame } from '@/core/types';
import { exampleGame } from './example';
import { everydayGames } from './everyday';

const games: MiniGame[] = [exampleGame, ...everydayGames];

const byId = new Map(games.map((g) => [g.id, g]));

export function getGame(id: string): MiniGame | undefined {
  return byId.get(id);
}

export function listGames(): MiniGame[] {
  return games;
}
