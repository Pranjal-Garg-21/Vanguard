import { round2 } from './basics';

/** One coupon payment per period, rounded to paise like a real payment. `freq` payments per year (1 = yearly). */
export function couponPayment(face: number, couponRate: number, freq = 1): number {
  return round2((face * couponRate) / freq);
}

/** Every payment the holder receives, in order. The last one includes the face value. */
export function couponSchedule(face: number, couponRate: number, years: number, freq = 1): number[] {
  const n = Math.round(years * freq);
  const c = couponPayment(face, couponRate, freq);
  return Array.from({ length: n }, (_, i) => (i === n - 1 ? c + face : c));
}

/** Total rupees received if held to maturity (all coupons plus face value). */
export function bondValueAtMaturity(face: number, couponRate: number, years: number, freq = 1): number {
  return couponSchedule(face, couponRate, years, freq).reduce((a, b) => a + b, 0);
}

/**
 * Market price of a bond with `yearsLeft` to go, when new bonds pay `marketRate`.
 * Price = present value of remaining payments at the market rate (yearly coupons).
 * When marketRate > couponRate the price is below face value, and vice versa.
 */
export function bondPrice(face: number, couponRate: number, marketRate: number, yearsLeft: number): number {
  const c = face * couponRate;
  let price = 0;
  for (let t = 1; t <= yearsLeft; t++) {
    price += c / Math.pow(1 + marketRate, t);
  }
  price += face / Math.pow(1 + marketRate, yearsLeft);
  return price;
}

/** Share of the face value you get back if the issuer fails and recovers only `recoveryRate` of it. */
export function defaultLoss(face: number, recoveryRate: number): number {
  return face * (1 - recoveryRate);
}
