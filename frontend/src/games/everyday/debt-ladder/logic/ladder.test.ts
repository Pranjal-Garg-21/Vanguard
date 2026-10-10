import { describe, expect, it } from 'vitest';
import { bestOrder, type RankItem } from '@/runtime/verbs/rank';
import { RULES, totalCost } from '@/core/engine';
import debt from '@/content/scenarios/borrow/debt-ladder.json';
import { ladderOptions } from './ladder';

const options = ladderOptions();
const items: RankItem[] = options.map((o) => ({ id: o.id, textKey: o.textKey, value: o.value }));
const byId = (id: string) => options.find((o) => o.id === id)!;

describe('the debt ladder', () => {
  it('ranks cheapest to dearest: family, bank, moneylender, pay later, loan app', () => {
    expect(bestOrder(items, 'asc')).toEqual(['family', 'bank', 'moneylender', 'bnpl', 'loan_app']);
  });

  it('charges what the story charges: the same rates as the bank, Sahukar and loan app', () => {
    expect(byId('moneylender').ratePercent).toBe(RULES.loan.moneylender.monthlyRate * 100);
    expect(byId('bank').ratePercent).toBe(RULES.loan.bank.monthlyRate * 100);
    expect(byId('loan_app').feePercent).toBe(RULES.loan.loanapp.feeRate * 100);
    // Same EMI as the story's loan calculator for the same loan.
    expect(byId('moneylender').monthlyPayment).toBe(totalCost('moneylender', debt.principal, debt.months).emi);
  });

  it('makes you borrow more from a lender that keeps a fee, to end up with the same money', () => {
    expect(byId('loan_app').borrowed).toBeGreaterThan(debt.principal);
    expect(byId('loan_app').borrowed * (1 - RULES.loan.loanapp.feeRate)).toBeGreaterThanOrEqual(debt.principal);
    expect(byId('family').value).toBe(debt.principal);
  });

  it('contains the compare_emi_not_total trap it is built to catch', () => {
    // The misconception only exists if a smaller instalment really does hide a
    // larger total; if ordering by instalment matched ordering by total, a
    // student could rank correctly by reading the monthly figure.
    const byMonthly = [...options].sort((a, b) => a.monthlyPayment - b.monthlyPayment);
    const byTotal = [...options].sort((a, b) => a.value - b.value);
    expect(byMonthly.map((o) => o.id)).not.toEqual(byTotal.map((o) => o.id));
    expect(byMonthly[0]?.id).toBe('bnpl');
    expect(byTotal[0]?.id).not.toBe('bnpl');
    expect(byId('bnpl').months).toBeGreaterThan(debt.months);
  });

  it('gives every option a reveal and a missed-payment consequence', () => {
    for (const option of options) {
      expect(option.revealKey, option.id).toBeTruthy();
      expect(option.missedPaymentKey, option.id).toBeTruthy();
      expect(option.value, option.id).toBeGreaterThanOrEqual(debt.principal);
    }
  });

  it('keeps each total consistent with its instalment and term', () => {
    for (const option of options) {
      expect(Math.abs(option.monthlyPayment * option.months - option.value), option.id).toBeLessThanOrEqual(option.months);
    }
  });
});
