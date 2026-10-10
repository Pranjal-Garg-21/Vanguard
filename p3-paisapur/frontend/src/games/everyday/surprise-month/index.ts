/**
 * Surprise Month (S3): why an emergency fund exists.
 * Use case: UC-SM-03 · Owner: P3
 */
import content from '@/content/scenarios/save/surprise-month.json';
import { defineGame } from '../shared/game';
import { SurpriseMonth } from './SurpriseMonth';

export { SurpriseMonth } from './SurpriseMonth';
export { pickShock, bufferFromContext, emergencyTargets, type Shock } from './logic/shock';

export const surpriseMonth = defineGame({
  id: content.id,
  useCase: 'UC-SM-03',
  verbs: ['choose'],
  concepts: content.concepts,
  levels: [1, 2, 3],
  checkpoint: content.checkpoint,
  Component: SurpriseMonth,
});
