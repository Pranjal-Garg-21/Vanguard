/**
 * Jar Split (S2): the first monthly budget.
 * Use case: UC-PB-02 · Owner: P3
 */
import content from '@/content/scenarios/plan/jar-split.json';
import { defineGame } from '../shared/game';
import { JarSplit } from './JarSplit';

export { JarSplit } from './JarSplit';
export {
  buildStatement,
  settleBills,
  HEAVY_NEEDS_SHARE,
  type MonthEndStatement,
} from './logic/statement';

export const jarSplit = defineGame({
  id: content.id,
  useCase: 'UC-PB-02',
  verbs: ['allocate'],
  concepts: content.concepts,
  levels: [1, 2, 3],
  Component: JarSplit,
});
