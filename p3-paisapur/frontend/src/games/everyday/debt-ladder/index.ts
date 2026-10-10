/**
 * Debt Cost Ladder (S4): compare borrowing options by the total paid back.
 * Use case: UC-BR-01 · Owner: P3
 */
import content from '@/content/scenarios/borrow/debt-ladder.json';
import { defineGame } from '../shared/game';
import { DebtLadder } from './DebtLadder';

export { DebtLadder } from './DebtLadder';

export const debtLadder = defineGame({
  id: content.id,
  useCase: 'UC-BR-01',
  verbs: ['rank', 'choose'],
  concepts: content.concepts,
  levels: [1, 2, 3],
  checkpoint: content.checkpoint,
  Component: DebtLadder,
});
