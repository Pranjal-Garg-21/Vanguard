/**
 * Rescue Mission (S6): the order to act in when money is lost to fraud.
 * Use case: UC-SAFE-10 · Owner: P3
 *
 * Built here rather than in games/safe/ because it runs on the Rank verb
 * (work_division §P3.6).
 */
import content from '@/content/scenarios/safe/rescue-mission.json';
import { defineGame } from '../shared/game';
import { RescueMission } from './RescueMission';

export { RescueMission } from './RescueMission';
export { recoveryChance, type RecoveryModel } from './logic/recovery';

export const rescueMission = defineGame({
  id: content.id,
  useCase: 'UC-SAFE-10',
  verbs: ['rank'],
  concepts: content.concepts,
  levels: [1, 2, 3],
  Component: RescueMission,
});
