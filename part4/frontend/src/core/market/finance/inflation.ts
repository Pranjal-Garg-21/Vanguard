/** What a price becomes after `years` of inflation. */
export function inflate(amount: number, inflation: number, years: number): number {
  return amount * Math.pow(1 + inflation, years);
}

/** What future rupees are worth in today's buying power. */
export function realValue(amount: number, inflation: number, years: number): number {
  return amount / Math.pow(1 + inflation, years);
}

/** Exact real return: (1 + nominal) / (1 + inflation) - 1. Negative means buying power shrank. */
export function realReturn(nominal: number, inflation: number): number {
  return (1 + nominal) / (1 + inflation) - 1;
}

/** Simple teaching version: nominal - inflation (L1/L2 lessons). */
export function realReturnApprox(nominal: number, inflation: number): number {
  return nominal - inflation;
}

/** How many units of something priced `price` can `money` buy (whole units). */
export function unitsAffordable(money: number, price: number): number {
  return Math.floor(money / price);
}
