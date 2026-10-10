/** Formatting and dialogue variables. Pure, so the story text stays testable. */
import { emergencyFund, goalFunds, incomeFor, needsCost, netWorth, type LifeState } from '@/core/engine';

/** ₹1,23,456 (Indian digit grouping). */
export function rupees(n: number): string {
  const sign = n < 0 ? '−' : '';
  return `${sign}₹${Math.abs(Math.round(n)).toLocaleString('en-IN')}`;
}

/** Plain number with Indian grouping, for {placeholders} that already sit after a ₹ sign. */
export function amount(n: number): string {
  return Math.round(n).toLocaleString('en-IN');
}

export function percent(x: number, digits = 1): string {
  const v = (x * 100).toFixed(digits);
  return `${x > 0 ? '+' : ''}${v}%`;
}

/** Values every dialogue line can use, e.g. "A {goalName} for ₹{target}". */
export function storyVars(life: LifeState, name: string, goalName: string): Record<string, string | number> {
  const save = suggestedSaving(life);
  return {
    save: amount(save),
    goalMonths: Math.max(1, Math.ceil((life.goal.target - life.pot) / save)),
    goalGap: amount(Math.max(0, life.goal.target - goalFunds(life))),
    name,
    goalName,
    target: amount(life.goal.target),
    pot: amount(life.pot),
    cash: amount(life.cash),
    bank: amount(life.bank.balance),
    income: amount(incomeFor(life, life.month + 1)),
    needs: amount(needsCost(life)),
    savings: amount(emergencyFund(life)),
    worth: amount(netWorth(life)),
    month: life.month,
    autosave: amount(life.bank.autoSave),
  };
}

/** A sensible monthly saving: half of what's left after needs, in steps of ₹50 (at least ₹100). */
export function suggestedSaving(life: LifeState): number {
  const spare = incomeFor(life, life.month + 1) - needsCost(life);
  return Math.max(100, Math.floor((spare * 0.5) / 50) * 50);
}
