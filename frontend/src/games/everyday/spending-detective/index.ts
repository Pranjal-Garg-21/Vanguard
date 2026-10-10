/**
 * Spending Detective (S3): find where the small payments went.
 * Use case: UC-SM-02 · Owner: P3
 */
import content from '@/content/scenarios/save/spending-detective.json';
import { defineGame } from '../shared/game';
import { SpendingDetective } from './SpendingDetective';

export { SpendingDetective } from './SpendingDetective';
/** Shared with P5's UPI history. */
export { TransactionList, type TransactionRow } from './components/TransactionList';
export { SpendChart } from './components/SpendChart';
export {
  historyFor,
  synthesiseHistory,
  categoryTotals,
  leaks,
  annualise,
  projectHalving,
  lineTotal,
  totalOf,
  scaleToBudget,
  type Txn,
  type CategoryTotal,
} from './logic/history';

export const spendingDetective = defineGame({
  id: content.id,
  useCase: 'UC-SM-02',
  verbs: ['triage', 'rank'],
  concepts: content.concepts,
  levels: [1, 2, 3],
  Component: SpendingDetective,
});
