/**
 * Risk helpers. A "typical year" is growth after fees, plus or minus one swing (volatility).
 * About 2 years in 3 land inside it; the rest fall outside. All rates are fractions (0.1 = 10%).
 */

/** Low end of a typical year for `amount`. */
export function typicalLow(amount: number, meanAnnual: number, fee: number, volAnnual: number): number {
  return amount * (1 + meanAnnual - fee - volAnnual);
}

/** High end of a typical year for `amount`. */
export function typicalHigh(amount: number, meanAnnual: number, fee: number, volAnnual: number): number {
  return amount * (1 + meanAnnual - fee + volAnnual);
}

/**
 * Loss on a spread of `total` rupees in equal slices over `count` businesses when a fraction `fall`
 * hits one business (scope 'one') or every business at once (scope 'market').
 */
export function spreadLoss(total: number, fall: number, count: number, scope: 'one' | 'market'): number {
  if (count < 1) throw new Error('count must be at least 1');
  return scope === 'market' ? total * fall : (total * fall) / count;
}
