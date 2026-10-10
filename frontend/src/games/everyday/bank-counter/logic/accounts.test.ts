import { describe, expect, it } from 'vitest';

import { accountsFor, canMaintain, isMinor, isWeakPin, type Account } from './accounts';
import content from '@/content/scenarios/bank/bank-counter.json';

const accounts = content.accounts as Account[];

describe('which accounts are offered', () => {
  it('offers the minor account only to under-18s', () => {
    const forSchool = accountsFor(accounts, { lifeStage: 'school_student', age: 17 });
    const forCollege = accountsFor(accounts, { lifeStage: 'college_student', age: 19 });
    expect(forSchool.map((a) => a.id)).toContain('minor');
    expect(forCollege.map((a) => a.id)).not.toContain('minor');
  });

  it('falls back to life stage when no age is given', () => {
    expect(isMinor({ lifeStage: 'school_student' })).toBe(true);
    expect(isMinor({ lifeStage: 'first_earner' })).toBe(false);
  });

  it('always leaves at least one account to choose', () => {
    for (const persona of [{ age: 17 }, { age: 19 }, { age: 21 }, {}]) {
      expect(accountsFor(accounts, persona).length).toBeGreaterThan(0);
    }
  });
});

describe('whether a minimum balance is realistic', () => {
  it('warns a school student off a ₹1,000 minimum', () => {
    // ₹1,000 locked away out of ₹800 a month is not a savings account, it is
    // a trap — the student may still choose it, but we say something first.
    const savings = accounts.find((a) => a.id === 'savings')!;
    expect(canMaintain(savings, { lifeStage: 'school_student' })).toBe(false);
  });

  it('is fine with the same account on a salary', () => {
    const savings = accounts.find((a) => a.id === 'savings')!;
    expect(canMaintain(savings, { lifeStage: 'first_earner' })).toBe(true);
  });

  it('never warns about a zero-balance account', () => {
    const zero = accounts.find((a) => a.id === 'zero_balance')!;
    expect(canMaintain(zero, { lifeStage: 'school_student' })).toBe(true);
  });
});

describe('weak PINs', () => {
  it('rejects the ones anyone would try first', () => {
    for (const pin of ['0000', '1111', '1234', '4321', '1212', '6767', '2580']) {
      expect(isWeakPin(pin), pin).toBe(true);
    }
  });

  it('accepts an ordinary PIN', () => {
    for (const pin of ['3719', '8042', '5160']) {
      expect(isWeakPin(pin), pin).toBe(false);
    }
  });

  it('says nothing about a half-typed PIN', () => {
    expect(isWeakPin('12')).toBe(false);
    expect(isWeakPin('')).toBe(false);
  });
});
