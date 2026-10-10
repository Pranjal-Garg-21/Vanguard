/** Making charge in rupees on a jewellery purchase priced at `price`. */
export function makingChargeAmount(price: number, chargeFraction: number): number {
  return price * chargeFraction;
}

/**
 * Rise in the gold price (as a fraction) needed just to get your purchase price back
 * if the making charge is not returned on resale. 12% charge on the total price
 * means gold content is 88% of what you paid, so gold must rise by 0.12 / 0.88 = ~13.6%.
 */
export function makingChargeBreakeven(chargeFraction: number): number {
  if (chargeFraction < 0 || chargeFraction >= 1) throw new Error('chargeFraction must be in [0, 1)');
  return chargeFraction / (1 - chargeFraction);
}

/** Resale value of jewellery after a resale deduction (fraction of the gold value). */
export function resaleValue(goldValue: number, deductionFraction: number): number {
  return goldValue * (1 - deductionFraction);
}

/** Gold purity as a fraction from carats (24K = pure). */
export function purity(carats: number): number {
  return carats / 24;
}
