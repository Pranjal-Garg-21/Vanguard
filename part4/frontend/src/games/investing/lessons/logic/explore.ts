/**
 * Pure maths behind the lesson "explore" widgets and the list of what the lesson format allows.
 * No React here, so it can be tested and reused by the games later.
 */
import { assumptions, runFutures } from '@/core/market';
import {
  bondPrice,
  breakevenGain,
  compoundAmount,
  couponPayment,
  couponSchedule,
  feeDragMonthly,
  futureValueMonthly,
  inflate,
  makingChargeBreakeven,
  membersAtLevel,
  membersTotal,
  positionProfit,
  rupeeCostAveraging,
  simpleAmount,
  spreadLoss,
  tradeFee,
  typicalHigh,
  typicalLow,
  unitsAffordable,
  unitsBought,
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
  'path_range',
  'basket_split',
  'sip_units',
  'fee_drag',
  'etf_buy',
  'making_charge',
  'cash_speed',
  'horizon_range',
  'pyramid_growth',
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
  'road_ride',
  'egg_basket',
  'thali',
  'wheat_farmer',
  'cash_and_house',
  'long_road',
  'phone_offer',
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

/** path_range: where `amount` could end after one typical year on a path from assumptions.json. */
export function pathRange(amount: number, assetId: string) {
  const a = assumptions.assets[assetId];
  if (!a) throw new Error(`Unknown path: ${assetId}`);
  const low = typicalLow(amount, a.meanAnnual, a.fee, a.volAnnual);
  const high = typicalHigh(amount, a.meanAnnual, a.fee, a.volAnnual);
  return { low, high, width: high - low };
}

/** basket_split: loss, slice size and what is left when `fall` hits one business or the whole market. */
export function basketSplit(total: number, fall: number, count: number, scope: 'one' | 'market') {
  const loss = spreadLoss(total, fall, count, scope);
  return { eachSlice: total / count, loss, left: total - loss };
}

/** sip_units: units bought by putting the same `amount` in at each NAV in `navs`. */
export function sipUnits(amount: number, navs: number[]) {
  const r = rupeeCostAveraging(navs, amount);
  return { units: r.unitsPerMonth, totalUnits: r.totalUnits, invested: r.totalInvested, averageCost: r.averageCostPerUnit, averageNav: r.averageNav };
}

/** fee_drag: the same monthly plan under two yearly fees. `gross` and fees are fractions. */
export function feeCompare(monthly: number, gross: number, years: number, feeA: number, feeB: number) {
  const months = years * 12;
  const a = feeDragMonthly(monthly, gross, feeA, months);
  const b = feeDragMonthly(monthly, gross, feeB, months);
  return { putIn: monthly * months, a: a.net, b: b.net, gap: a.net - b.net };
}

/**
 * etf_buy: the same `amount` bought as a mutual fund (one end-of-day NAV, no trading cost) or as an ETF
 * (a market price you pick during the day, with a small trading cost of `tradingCost` of the amount).
 */
export function etfBuy(amount: number, fundNav: number, etfPrice: number, tradingCost: number) {
  return {
    fundUnits: unitsBought(amount, fundNav),
    etfUnits: unitsBought(amount, etfPrice),
    etfCost: tradeFee(amount, tradingCost),
  };
}

/** making_charge: jewellery bought at `price` with a making charge, sold after the gold price moves by `change` (0.1 = +10%). */
export function goldOutcome(price: number, charge: number, change: number) {
  const chargePaid = price * charge;
  const goldContent = price - chargePaid;
  const sellValue = goldContent * (1 + change);
  return { chargePaid, goldContent, sellValue, result: sellValue - price, breakeven: makingChargeBreakeven(charge) };
}

/** cash_speed: days to cash, the cost of selling, and what lands in your hands, for an asset in assumptions.json. */
export function cashSpeed(amount: number, assetId: string) {
  const l = assumptions.liquidity[assetId];
  if (!l) throw new Error(`Unknown asset: ${assetId}`);
  const cost = amount * l.sellCost;
  return { days: l.days, cost, received: amount - cost };
}

/** horizon_range: 500 simulated futures for a lump sum on one path (same seed every time). */
export function horizonRange(amount: number, assetId: string, years: number) {
  const r = runFutures({ weights: { [assetId]: 1 }, months: Math.round(years * 12), seed: 'horizon-lab', initial: amount });
  return { low: r.summary.p5, median: r.summary.median, high: r.summary.p95, lossChance: r.summary.lossProbability };
}

/** pyramid_growth: if every member must recruit `recruits` new people, who must join at `level` and how many in all. */
export function pyramidGrowth(recruits: number, level: number) {
  return { atLevel: membersAtLevel(recruits, level), total: membersTotal(recruits, level) };
}
