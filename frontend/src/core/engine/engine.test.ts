import { describe, expect, it } from 'vitest';
import { priceAt } from '@/core/market';
import { check, emi, monthsAtMinimum, needsCost, netWorth, newLife, reduce, totalCost, type Action, type LifeState } from './index';

const apply = (s: LifeState, ...actions: Action[]) => actions.reduce(reduce, s);
const banked = () => apply(newLife(7), { type: 'gain', amount: 1000, reason: 'gift' }, { type: 'openAccount' }, { type: 'enableUpi' }, { type: 'deposit', amount: 1000 });

describe('engine', () => {
  it('EMI matches the formula used in the lessons', () => {
    expect(emi(30000, 0.01, 12)).toBe(2665);
    expect(emi(30000, 0.01, 24)).toBe(1412);
    expect(totalCost('bank', 30000, 12).total).toBe(31980);
  });

  it('loan apps take a fee upfront', () => {
    const c = totalCost('loanapp', 5000, 3);
    expect(c.received).toBe(4000);
    expect(c.interest).toBeGreaterThan(1000);
  });

  it('paying only the card minimum takes over a year on ₹1,200', () => {
    expect(monthsAtMinimum(1200).months).toBeGreaterThan(12);
  });

  it('refuses what you cannot afford, with a reason', () => {
    const s = newLife(1);
    expect(check(s, { type: 'deposit', amount: 100 })).toBe('errors.no_account');
    expect(reduce(s, { type: 'spend', amount: 5000, reason: 'x' })).toBe(s);
  });

  it('a month pays income, pays yourself first and adds interest', () => {
    let s = apply(banked(), { type: 'setAutoSave', amount: 200 });
    const bankBefore = s.bank.balance;
    s = reduce(s, { type: 'advanceMonth' });
    expect(s.month).toBe(1);
    expect(s.pot).toBe(200);
    expect(s.bank.balance).toBeGreaterThan(bankBefore + 1200 - 200);
    expect(s.flags.missed_needs).toBe(true);
  });

  it('prices rise with inflation', () => {
    const s = newLife(1);
    expect(needsCost({ ...s, month: 12 })).toBeGreaterThan(needsCost(s));
  });

  it('missed EMIs cost a fee, peace of mind and credit score', () => {
    let s = apply(banked(), { type: 'takeLoan', kind: 'bank', amount: 20000, months: 6 });
    s = apply(s, { type: 'withdraw', amount: s.bank.balance }, { type: 'spend', amount: s.cash + s.bank.balance, reason: 'party' });
    s = { ...s, source: 'allowance', cash: 0, bank: { ...s.bank, balance: 0 } };
    const scoreBefore = s.creditScore!;
    s = reduce(s, { type: 'advanceMonth' });
    expect(s.loans[0]!.missed).toBe(1);
    expect(s.creditScore!).toBeLessThan(scoreBefore);
  });

  it('a SIP buys index units every month', () => {
    let s = apply(banked(), { type: 'setSip', amount: 200 });
    s = reduce(s, { type: 'advanceMonth' });
    expect(s.holdings.index?.invested).toBe(200);
  });

  it('net worth counts what you own minus what you owe', () => {
    const s = apply(banked(), { type: 'takeLoan', kind: 'bank', amount: 10000, months: 12 });
    expect(netWorth(s)).toBeLessThan(netWorth(banked()));
  });

  it('the market is the same for the same seed, different for another', () => {
    expect(priceAt(5, 'tiffin', 10)).toBe(priceAt(5, 'tiffin', 10));
    expect(priceAt(5, 'tiffin', 10)).not.toBe(priceAt(6, 'tiffin', 10));
  });

  it('every market year has a dip in month 9', () => {
    for (const seed of [1, 2, 3, 4, 5]) expect(priceAt(seed, 'index', 9)).toBeLessThan(priceAt(seed, 'index', 8));
  });
});
