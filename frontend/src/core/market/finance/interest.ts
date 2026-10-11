/** Simple interest earned: I = P * r * t. `rate` is a fraction per year. */
export function simpleInterest(principal: number, rate: number, years: number): number {
  return principal * rate * years;
}

/** Final amount with simple interest: A = P(1 + r*t). */
export function simpleAmount(principal: number, rate: number, years: number): number {
  return principal + simpleInterest(principal, rate, years);
}

/** Final amount with compound interest added `perYear` times a year: A = P(1 + r/n)^(n*t). */
export function compoundAmount(principal: number, rate: number, years: number, perYear = 1): number {
  return principal * Math.pow(1 + rate / perYear, perYear * years);
}

/** Interest earned on interest only: compound minus simple. */
export function interestOnInterest(principal: number, rate: number, years: number, perYear = 1): number {
  return compoundAmount(principal, rate, years, perYear) - simpleAmount(principal, rate, years);
}

/**
 * Value after investing `monthly` at the end of every month for `months` months,
 * with the annual rate converted to a monthly rate (rate / 12). Used for SIPs and recurring deposits.
 */
export function futureValueMonthly(monthly: number, annualRate: number, months: number): number {
  const r = annualRate / 12;
  if (r === 0) return monthly * months;
  return monthly * ((Math.pow(1 + r, months) - 1) / r);
}

/** Total put in by a monthly plan. */
export function totalContributed(monthly: number, months: number): number {
  return monthly * months;
}

/** Rule of 72: approximate years to double. `ratePercent` is in percent (8 = 8%). */
export function ruleOf72(ratePercent: number): number {
  if (ratePercent <= 0) throw new Error('rate must be > 0');
  return 72 / ratePercent;
}

/** Exact years to double with yearly compounding. */
export function doublingYears(rate: number): number {
  if (rate <= 0) throw new Error('rate must be > 0');
  return Math.log(2) / Math.log(1 + rate);
}

/** Effective yearly rate when a nominal rate is compounded `perYear` times. */
export function effectiveRate(nominalRate: number, perYear: number): number {
  return Math.pow(1 + nominalRate / perYear, perYear) - 1;
}
