/**
 * Everyday money formulas for the Plan, Save, Borrow and Bank lessons: shares of income, months to reach a goal,
 * months of cover, loan EMIs (reducing balance and flat), the real yearly rate behind a flat rate, and card balances.
 * Pure functions with plain numbers. Rates are fractions (0.12 = 12% a year).
 */

/** `part` as a fraction of `whole` (0.3 = 30%). */
export function percentOf(part: number, whole: number): number {
  if (whole === 0) throw new Error('whole must not be 0');
  return part / whole;
}

/** Months to reach `target` by putting aside `monthly` each month, rounded up to a whole month. */
export function monthsToGoal(target: number, monthly: number): number {
  if (monthly <= 0) throw new Error('monthly must be above 0');
  return Math.ceil(target / monthly);
}

/** How many months of spending a pile of money would cover. */
export function coverMonths(savings: number, monthlyExpense: number): number {
  if (monthlyExpense <= 0) throw new Error('monthlyExpense must be above 0');
  return savings / monthlyExpense;
}

/** Monthly instalment (EMI) on a reducing-balance loan: interest is charged only on what is still owed. */
export function emi(principal: number, annualRate: number, months: number): number {
  if (months <= 0) throw new Error('months must be above 0');
  const r = annualRate / 12;
  if (r === 0) return principal / months;
  const growth = Math.pow(1 + r, months);
  return (principal * r * growth) / (growth - 1);
}

/** Everything paid back on a reducing-balance loan. */
export function loanTotalPaid(principal: number, annualRate: number, months: number): number {
  return emi(principal, annualRate, months) * months;
}

/** The cost of borrowing: what you pay back above what you got. */
export function loanInterest(principal: number, annualRate: number, months: number): number {
  return loanTotalPaid(principal, annualRate, months) - principal;
}

/** Monthly instalment on a flat-rate loan: interest is charged on the full amount for the whole time. */
export function flatEmi(principal: number, flatRate: number, years: number): number {
  return (principal + principal * flatRate * years) / (years * 12);
}

/** The yearly rate that a reducing-balance loan would need to charge to give this same monthly instalment. */
export function rateFromEmi(principal: number, monthlyEmi: number, months: number): number {
  if (monthlyEmi * months <= principal) return 0;
  let lo = 0;
  let hi = 5;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (emi(principal, mid, months) < monthlyEmi) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** The real yearly rate behind a flat rate. It is always higher than the flat rate. */
export function flatToReal(principal: number, flatRate: number, years: number): number {
  return rateFromEmi(principal, flatEmi(principal, flatRate, years), years * 12);
}

/** Months to clear a card or loan balance paying a fixed `payment` each month. Throws when the payment never beats the interest. */
export function monthsToClear(balance: number, annualRate: number, payment: number): number {
  const r = annualRate / 12;
  if (payment <= balance * r) throw new Error('payment does not cover the interest');
  let owed = balance;
  let months = 0;
  while (owed > 0.005 && months < 1200) {
    owed = owed * (1 + r) - payment;
    months++;
  }
  return months;
}

/** Interest paid while clearing a balance with a fixed monthly payment. */
export function interestToClear(balance: number, annualRate: number, payment: number): number {
  const r = annualRate / 12;
  if (payment <= balance * r) throw new Error('payment does not cover the interest');
  let owed = balance;
  let paid = 0;
  let months = 0;
  while (owed > 0.005 && months < 1200) {
    const interest = owed * r;
    const pay = Math.min(payment, owed + interest);
    paid += interest;
    owed = owed + interest - pay;
    months++;
  }
  return paid;
}
