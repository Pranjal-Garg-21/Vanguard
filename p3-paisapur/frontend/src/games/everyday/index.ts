/**
 * Everyday Money games. Owner: P3.
 *
 * Nine mini-games covering the Get Banked, Plan & Budget, Save & Manage and
 * Borrowing pillars. The Arcade's Everyday Money section renders this list;
 * `games/registry.ts` registers the same games for the runtime to find by ID.
 */
export { documentHunt } from './document-hunt';
export { bankCounter } from './bank-counter';
export { swipeSort } from './swipe-sort';
export { jarSplit } from './jar-split';
export { goalBuilder } from './goal-builder';
export { spendingDetective } from './spending-detective';
export { surpriseMonth } from './surprise-month';
export { debtLadder } from './debt-ladder';
export { rescueMission } from './rescue-mission';

export { everydayGames } from './registry';
export type { UiMiniGame, GameProps } from './shared/game';

/** Shared with P5's UPI history. */
export { TransactionList, type TransactionRow } from './spending-detective';
