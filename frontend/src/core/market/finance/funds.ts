import { futureValueMonthly } from './interest';

/** NAV: the price of one unit = total value of the fund / units issued. */
export function navPerUnit(totalValue: number, totalUnits: number): number {
  return totalValue / totalUnits;
}

/** Units you get for `amount` at a given NAV (fractional units allowed in funds). */
export function unitsBought(amount: number, nav: number): number {
  return amount / nav;
}

/**
 * Rupee cost averaging: invest `amountPerMonth` at each NAV in `navs`.
 * Returns units bought each month, total units, and the average price paid per unit.
 */
export function rupeeCostAveraging(navs: number[], amountPerMonth: number) {
  const unitsPerMonth = navs.map((nav) => unitsBought(amountPerMonth, nav));
  const totalUnits = unitsPerMonth.reduce((a, b) => a + b, 0);
  const totalInvested = amountPerMonth * navs.length;
  return {
    unitsPerMonth,
    totalUnits,
    totalInvested,
    averageCostPerUnit: totalInvested / totalUnits,
    averageNav: navs.reduce((a, b) => a + b, 0) / navs.length,
  };
}

/**
 * Lump sum grown at (grossRate - feeRate) a year. The fee is taken from the return every year,
 * so it compounds against you.
 */
export function feeDragLumpSum(principal: number, grossRate: number, feeRate: number, years: number) {
  const net = principal * Math.pow(1 + grossRate - feeRate, years);
  const noFee = principal * Math.pow(1 + grossRate, years);
  return { net, noFee, feeCost: noFee - net };
}

/** Same idea for a monthly plan (SIP). */
export function feeDragMonthly(monthly: number, grossRate: number, feeRate: number, months: number) {
  const net = futureValueMonthly(monthly, grossRate - feeRate, months);
  const noFee = futureValueMonthly(monthly, grossRate, months);
  return { net, noFee, feeCost: noFee - net };
}
