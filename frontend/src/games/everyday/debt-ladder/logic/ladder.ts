/**
 * The debt ladder's numbers, computed from the same lending rules the rest of
 * Paisapur uses (core/engine RULES), so the Sahukar in the story and the
 * moneylender in this game charge the same 5% a month. Pure. Owner: P3.
 *
 * "value" is what you pay back in total to end up with the principal in hand:
 * a lender that keeps a fee upfront makes you borrow more to get the same
 * money. Buy-now-pay-later is the one fixed-plan option and keeps its content
 * terms: the smallest instalment, stretched over six months.
 */
import { emi, RULES } from '@/core/engine';
import content from '@/content/scenarios/borrow/debt-ladder.json';

/** One lender as content describes it (JSON infers a union that is awkward to extend, so it is spelled out). */
type ContentOption = {
  id: string;
  textKey: string;
  revealKey: string;
  missedPaymentKey: string;
  concepts: Record<string, number>;
  misconception?: string;
  chooseEffects?: Record<string, number>;
  missedEffects?: Record<string, number>;
  flags?: Record<string, boolean>;
  /** Only the fixed plan states these. */
  monthlyPayment?: number;
  months?: number;
};

const OPTIONS = content.options as unknown as ContentOption[];

export type LadderOption = ContentOption & {
  /** Paid back in total to have the principal in hand. */
  value: number;
  monthlyPayment: number;
  months: number;
  /** Monthly interest, in percent (0 for family and the fixed BNPL plan). */
  ratePercent: number;
  /** Upfront fee, in percent of what is borrowed. */
  feePercent: number;
  /** What actually has to be borrowed to receive the principal. */
  borrowed: number;
};

const LENDER_RULE = {
  family: RULES.loan.family,
  bank: RULES.loan.bank,
  moneylender: RULES.loan.moneylender,
  loan_app: RULES.loan.loanapp,
} as const;

export function ladderOptions(principal: number = content.principal, months: number = content.months): LadderOption[] {
  return OPTIONS.map((option) => {
    const rule = LENDER_RULE[option.id as keyof typeof LENDER_RULE];
    if (!rule) {
      // The fixed plan (buy now, pay later) keeps its stated terms.
      const monthly = option.monthlyPayment ?? principal;
      const term = option.months ?? 1;
      return {
        ...option,
        monthlyPayment: monthly,
        months: term,
        value: monthly * term,
        ratePercent: 0,
        feePercent: 0,
        borrowed: principal,
      };
    }
    const borrowed = Math.ceil(principal / (1 - rule.feeRate));
    const monthly = rule.monthlyRate === 0 ? Math.ceil(principal / months) : emi(borrowed, rule.monthlyRate, months);
    const value = rule.monthlyRate === 0 ? principal : monthly * months;
    return {
      ...option,
      monthlyPayment: monthly,
      months,
      value,
      ratePercent: Math.round(rule.monthlyRate * 1000) / 10,
      feePercent: Math.round(rule.feeRate * 100),
      borrowed,
    };
  });
}
