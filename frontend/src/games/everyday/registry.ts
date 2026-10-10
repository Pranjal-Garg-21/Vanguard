/**
 * The built Everyday Money games, in the order a student meets them in
 * LifePath. Kept in its own module so the Arcade can import the list without a
 * circular import through index.ts.
 */

import { bankCounter } from './bank-counter';
import { debtLadder } from './debt-ladder';
import { documentHunt } from './document-hunt';
import { goalBuilder } from './goal-builder';
import { jarSplit } from './jar-split';
import { rescueMission } from './rescue-mission';
import { spendingDetective } from './spending-detective';
import { surpriseMonth } from './surprise-month';
import { swipeSort } from './swipe-sort';
import type { UiMiniGame } from './shared/game';

export const everydayGames: UiMiniGame[] = [
  documentHunt,       // S0 · which documents a bank needs
  bankCounter,        // S0 · open the account
  swipeSort,          // S2 · needs and wants
  jarSplit,           // S2 · the first monthly budget
  goalBuilder,        // S2 · the goal gets a date
  spendingDetective,  // S3 · where the small payments went
  surpriseMonth,      // S3 · why a buffer exists
  debtLadder,         // S4 · what borrowing really costs
  rescueMission,      // S6 · what to do when money is lost
];
