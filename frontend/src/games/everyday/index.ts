/**
 * Everyday Money games. Owner: P3.
 *
 * In the order a student meets them in LifePath. The Arcade's Everyday Money
 * section renders this list; `games/registry.ts` registers the same games for
 * the runtime to find by ID.
 */
export { documentHunt } from './document-hunt';
export { swipeSort } from './swipe-sort';
export { debtLadder } from './debt-ladder';
export { rescueMission } from './rescue-mission';
export type { UiMiniGame, GameProps } from './shared/game';

import { debtLadder } from './debt-ladder';
import { documentHunt } from './document-hunt';
import { rescueMission } from './rescue-mission';
import { swipeSort } from './swipe-sort';
import type { UiMiniGame } from './shared/game';

export const everydayGames: UiMiniGame[] = [
  documentHunt,   // S0
  swipeSort,      // S2
  debtLadder,     // S4
  rescueMission,  // S6
];
