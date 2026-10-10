/**
 * Account choice and PIN rules. Pure. Owner: P3.
 */

import type { Persona } from '@/core/types';
import { characterIncome } from '../../shared/economics';

export type Account = {
  id: string;
  textKey: string;
  blurbKey: string;
  minimumBalance: number;
  monthlyCharge: number;
  interest: boolean;
  requiresMinor?: boolean;
};

export const ADULT_AGE = 18;

export function isMinor(persona: Persona): boolean {
  const { age, lifeStage } = persona as { age?: number; lifeStage?: string };
  if (typeof age === 'number') return age < ADULT_AGE;
  return lifeStage === 'school_student';
}

/** The minor account is only offered to under-18s, as §12.6 requires. */
export function accountsFor(accounts: readonly Account[], persona: Persona): Account[] {
  const minor = isMinor(persona);
  return accounts.filter((a) => (a.requiresMinor ? minor : true));
}

/**
 * Whether a minimum balance is realistic for this character.
 *
 * Not a rule about whether they may choose it — §12.6 lets them pick an
 * account they cannot maintain and meet the charge in Month 2. This only
 * decides whether to say something first.
 */
export function canMaintain(account: Account, persona: Persona): boolean {
  if (account.minimumBalance === 0) return true;
  // Money that has to sit untouched is money they do not have to live on. A
  // minimum above a third of monthly income will bite a student sooner or later.
  return account.minimumBalance <= characterIncome(persona).amount / 3;
}

/**
 * PINs anyone would guess first. Rejected with an explanation rather than a
 * score — the lesson is that obvious PINs are the ones that get tried.
 */
export function isWeakPin(pin: string): boolean {
  if (pin.length < 4) return false;
  const digits = [...pin].map(Number);
  if (digits.some(Number.isNaN)) return false;

  // All the same digit: 0000, 1111.
  if (new Set(digits).size === 1) return true;

  // Runs in either direction: 1234, 4321.
  const ascending = digits.every((d, i) => i === 0 || d === (digits[i - 1] ?? 0) + 1);
  const descending = digits.every((d, i) => i === 0 || d === (digits[i - 1] ?? 0) - 1);
  if (ascending || descending) return true;

  // Repeated pairs: 1212, 6767.
  if (digits.length === 4 && digits[0] === digits[2] && digits[1] === digits[3]) return true;

  return ['1004', '2580'].includes(pin);
}
