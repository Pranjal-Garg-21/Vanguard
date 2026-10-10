/**
 * Goal Builder (S2): turn the character's goal into a plan with a date.
 * Use case: UC-PB-03 · Owner: P3
 */
import content from '@/content/scenarios/plan/goal-builder.json';
import { defineGame } from '../shared/game';
import { GoalBuilder } from './GoalBuilder';

export { GoalBuilder } from './GoalBuilder';
export {
  buildPlan,
  festivalFor,
  scorePrediction,
  predictionOptions,
  FESTIVALS,
  LIFEPATH_MONTHS,
  type GoalPlan,
} from './logic/timeline';

export const goalBuilder = defineGame({
  id: content.id,
  useCase: 'UC-PB-03',
  verbs: ['commit', 'predict'],
  concepts: content.concepts,
  levels: [1, 2, 3],
  Component: GoalBuilder,
});
