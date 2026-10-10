/**
 * Bank Counter (S0): open the character's first account.
 * Use case: UC-BANK-02 · Owner: P3
 */
import content from '@/content/scenarios/bank/bank-counter.json';
import { defineGame } from '../shared/game';
import { BankCounter } from './BankCounter';

export { BankCounter } from './BankCounter';
export { accountsFor, canMaintain, isWeakPin, isMinor, type Account } from './logic/accounts';

export const bankCounter = defineGame({
  id: content.id,
  useCase: 'UC-BANK-02',
  verbs: ['choose', 'allocate'],
  concepts: content.concepts,
  levels: [1, 2, 3],
  Component: BankCounter,
});
