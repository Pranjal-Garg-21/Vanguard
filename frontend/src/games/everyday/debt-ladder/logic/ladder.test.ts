import { describe, expect, it } from 'vitest';

import { bestOrder, type RankItem } from '@/runtime/verbs/rank';
import debt from '@/content/scenarios/borrow/debt-ladder.json';

const items: RankItem[] = debt.options.map((o) => ({
  id: o.id,
  textKey: o.textKey,
  value: o.value,
}));

describe('the debt ladder content', () => {
  it('ranks cheapest to dearest as the copy claims', () => {
    expect(bestOrder(items, 'asc')).toEqual(['family', 'bnpl', 'moneylender', 'loan_app']);
  });

  it('really does cost ₹1,100 more through the loan app', () => {
    // br01.result.cheapest_first states this figure to the student.
    const family = debt.options.find((o) => o.id === 'family')!;
    const app = debt.options.find((o) => o.id === 'loan_app')!;
    expect(app.value - family.value).toBe(1100);
    expect(family.value).toBe(debt.principal);
  });

  it('contains the compare_emi_not_total trap it is built to catch', () => {
    // The misconception only exists if a smaller instalment really does hide a
    // larger total. If ordering by instalment matched ordering by total, a
    // student could rank correctly by reading the monthly figure and would
    // learn the opposite of the lesson.
    const byMonthly = [...debt.options].sort((a, b) => a.monthlyPayment - b.monthlyPayment);
    const byTotal = [...debt.options].sort((a, b) => a.value - b.value);
    expect(byMonthly.map((o) => o.id)).not.toEqual(byTotal.map((o) => o.id));

    expect(byMonthly[0]?.id).toBe('bnpl'); // cheapest-looking
    expect(byTotal[0]?.id).not.toBe('bnpl'); // not actually cheapest

    // It only looks cheap because it runs longer than the money is needed for.
    const bnpl = debt.options.find((o) => o.id === 'bnpl')!;
    expect(bnpl.months).toBeGreaterThan(debt.months);
  });

  it('gives every option a reveal and a missed-payment consequence', () => {
    for (const option of debt.options) {
      expect(option.revealKey, option.id).toBeTruthy();
      expect(option.missedPaymentKey, option.id).toBeTruthy();
      expect(option.value, option.id).toBeGreaterThanOrEqual(debt.principal);
    }
  });

  it('keeps each stated total consistent with its instalment and term', () => {
    for (const option of debt.options) {
      const implied = option.monthlyPayment * option.months;
      expect(Math.abs(implied - option.value), option.id).toBeLessThanOrEqual(option.months);
    }
  });
});
