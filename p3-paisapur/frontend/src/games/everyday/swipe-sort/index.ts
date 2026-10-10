/**
 * Needs vs Wants Swipe Sort (S2): sort spending, and see that context matters.
 * Use case: UC-PB-01 · Owner: P3
 */
import content from '@/content/scenarios/plan/swipe-sort.json';
import { defineGame } from '../shared/game';
import { SwipeSort } from './SwipeSort';

export { SwipeSort } from './SwipeSort';
export { detectFunIsBad, FUN_CARDS, type FunRecord } from './logic/fun';

export const swipeSort = defineGame({
  id: content.id,
  useCase: 'UC-PB-01',
  verbs: ['triage'],
  concepts: content.concepts,
  levels: [1, 2, 3],
  Component: SwipeSort,
});
