/** Round to 2 decimals (paise). Use at the display edge, not between steps. */
export const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

/** Profit in rupees. `extras` = fees paid (positive) and income received such as dividends (pass as negative). */
export function profit(buy: number, now: number, extras = 0): number {
  return round2(now - buy - extras);
}

/** Return as a fraction (0.15 = 15%). */
export function returnPct(buy: number, now: number): number {
  if (buy <= 0) throw new Error('buy must be > 0');
  return (now - buy) / buy;
}

/** The gain needed to get back to even after a loss. A 50% loss (0.5) needs a 100% gain (1). */
export function breakevenGain(lossFraction: number): number {
  if (lossFraction < 0 || lossFraction >= 1) throw new Error('lossFraction must be in [0, 1)');
  return lossFraction / (1 - lossFraction);
}

/** Largest peak-to-trough fall in a value series, as a fraction (0.25 = fell 25%). */
export function maxDrawdown(series: number[]): number {
  let peak = -Infinity;
  let worst = 0;
  for (const v of series) {
    if (v > peak) peak = v;
    if (peak > 0) worst = Math.max(worst, (peak - v) / peak);
  }
  return worst;
}
