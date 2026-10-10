/** Dividend income: shares x dividend per share. */
export function dividendIncome(shares: number, perShare: number): number {
  return shares * perShare;
}

/** Company size: price x total shares. A cheap share can be a big company. */
export function marketCap(price: number, totalShares: number): number {
  return price * totalShares;
}

/** Cost of one trade at `feeRate` (0.005 = 0.5%) of the trade value. */
export function tradeFee(tradeValue: number, feeRate: number): number {
  return tradeValue * feeRate;
}

/** Spread between the best sell offer (ask) and the best buy offer (bid). */
export function spread(bid: number, ask: number): number {
  return ask - bid;
}

/**
 * Total profit from a share position: price change + dividends - fees paid.
 * `buyPrice`/`nowPrice` are per share.
 */
export function positionProfit(
  shares: number,
  buyPrice: number,
  nowPrice: number,
  dividendPerShare: number,
  feesPaid: number,
): number {
  return shares * (nowPrice - buyPrice) + dividendIncome(shares, dividendPerShare) - feesPaid;
}
