/**
 * Pure maths behind the lesson "explore" widgets and the list of what the lesson format allows.
 * No React here, so it can be tested and reused by the games later.
 */
import {
  bondPrice,
  breakevenGain,
  compoundAmount,
  couponPayment,
  couponSchedule,
  futureValueMonthly,
  inflate,
  positionProfit,
  simpleAmount,
  tradeFee,
  unitsAffordable,
} from '@/core/market/finance';

/** Widgets a lesson may name in an `explore` block. Add the id here when you build the component. */
export const EXPLORE_WIDGETS = [
  'fall_rise',
  'simple_vs_compound',
  'start_early',
  'inflation_cups',
  'lender_outcomes',
  'bond_schedule',
  'bond_price',
  'position_lab',
] as const;
export type ExploreWidgetId = (typeof EXPLORE_WIDGETS)[number];

/** Pictures a lesson may name in a `visual` field. Illustrations are not drawn yet; the ids keep the content ready. */
export const VISUALS = [
  'samosa_stall',
  'tea_stall',
  'piggy_bank',
  'mango_trees',
  'chai_prices',
  'neighbour_loan',
  'bond_certificate',
  'stall_shares',
] as const;
export type VisualId = (typeof VISUALS)[number];

/** fall_rise: what you hold after a fall, and the rise needed to get back. `fall` is a fraction (0.5 = 50%). */
export function fallAndRise(start: number, fall: number) {
  const f = Math.min(Math.max(fall, 0), 0.95);
  return {
    afterFall: start * (1 - f),
    needGain: breakevenGain(f),
    /** What a rise equal to the fall would give (the common mistake). */
    afterSameRise: start * (1 - f) * (1 + f),
  };
}

export interface GrowthPoint {
  year: number;
  simple: number;
  compound: number;
}

/** simple_vs_compound: value at the end of each year, from year 0 to `years`. */
export function growthSeries(principal: number, rate: number, years: number): GrowthPoint[] {
  return Array.from({ length: years + 1 }, (_, year) => ({
    year,
    simple: simpleAmount(principal, rate, year),
    compound: compoundAmount(principal, rate, year),
  }));
}

/** start_early: a monthly saver who starts at `startAge` and stops at `stopAge`. */
export function startEarlyResult(monthly: number, annualRate: number, startAge: number, stopAge: number) {
  const months = Math.max(0, (stopAge - startAge) * 12);
  const finalAmount = futureValueMonthly(monthly, annualRate, months);
  const putIn = monthly * months;
  return { months, putIn, finalAmount, earned: finalAmount - putIn };
}

/** inflation_cups: what a price becomes, and how many whole items a fixed sum buys now and then. */
export function inflationCups(price: number, inflation: number, years: number, money: number) {
  const futurePrice = inflate(price, inflation, years);
  return {
    futurePrice,
    cupsNow: unitsAffordable(money, price),
    cupsThen: unitsAffordable(money, futurePrice),
  };
}

/**
 * lender_outcomes: one lender lends `amount` at a promised `rate`. If the borrower pays, the lender
 * earns the interest. If the borrower fails and only `recovery` (0 to 1) of the money comes back,
 * the lender's net result is what came back minus what was lent.
 */
export function lenderOutcomes(amount: number, rate: number, recovery: number) {
  const rec = Math.min(Math.max(recovery, 0), 1);
  return {
    gainIfPaid: amount * rate,
    backIfPaid: amount * (1 + rate),
    backIfFails: amount * rec,
    netIfFails: amount * rec - amount,
  };
}

/** bond_schedule: every payment a bond holder receives, in order, and the total. */
export function bondSchedule(face: number, couponRate: number, years: number) {
  const payments = couponSchedule(face, couponRate, years);
  return {
    payments,
    yearlyInterest: couponPayment(face, couponRate),
    total: payments.reduce((a, b) => a + b, 0),
  };
}

/** bond_price: what the bond is worth today when new bonds pay `marketRate`. */
export function bondPriceAt(face: number, couponRate: number, marketRate: number, yearsLeft: number) {
  const price = bondPrice(face, couponRate, marketRate, yearsLeft);
  return { price, difference: price - face };
}

/**
 * position_lab: a share position after the price changes by `change` (0.12 = +12%) and a dividend is paid.
 * The buying fee is `feeRate` of the money spent.
 */
export function positionOutcome(shares: number, buyPrice: number, change: number, dividendPerShare: number, feeRate: number) {
  const nowPrice = buyPrice * (1 + change);
  const spent = shares * buyPrice;
  const fee = tradeFee(spent, feeRate);
  return {
    nowPrice,
    spent,
    fee,
    valueNow: shares * nowPrice,
    dividend: shares * dividendPerShare,
    profit: positionProfit(shares, buyPrice, nowPrice, dividendPerShare, fee),
  };
}
