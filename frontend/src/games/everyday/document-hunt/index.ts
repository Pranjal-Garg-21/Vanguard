/**
 * Document Hunt (S0): find the right documents to open a bank account.
 * Use case: UC-BANK-01 · Owner: P3
 */
import content from '@/content/scenarios/bank/document-hunt.json';
import { defineGame } from '../shared/game';
import { DocumentHunt } from './DocumentHunt';

export { DocumentHunt } from './DocumentHunt';
export { characterAge, deckForAge, ADULT_AGE, type DocCard } from './logic/deck';

export const documentHunt = defineGame({
  id: content.id,
  useCase: 'UC-BANK-01',
  verbs: ['triage'],
  concepts: content.concepts,
  levels: [1, 2, 3],
  Component: DocumentHunt,
});
