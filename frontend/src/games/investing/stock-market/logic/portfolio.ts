import { round2, tradeFee } from '@/core/market';
import { assumptions } from '@/core/market';
import type { MarketConfig, Portfolio, Trade } from './types';

export const feeRate = () => assumptions.costs.tradeFee;

export const newPortfolio = (cash: number): Portfolio => ({ cash, shares: {}, fees: 0, dividends: 0, trades: [] });

export type TradeError = 'qty' | 'cash' | 'holding';

/** Money a purchase would take: shares at the price, plus the fee. */
export function buyCost(qty: number, price: number): { value: number; fee: number; total: number } {
  const value = round2(qty * price);
  const fee = round2(tradeFee(value, feeRate()));
  return { value, fee, total: round2(value + fee) };
}

/** Buy whole shares. Returns the new portfolio, or why it was refused. */
export function buy(p: Portfolio, round: number, id: string, qty: number, price: number): Portfolio | TradeError {
  if (!Number.isInteger(qty) || qty < 1) return 'qty';
  const { fee, total } = buyCost(qty, price);
  if (total > p.cash + 1e-9) return 'cash';
  const trade: Trade = { round, id, side: 'buy', qty, price, fee };
  return {
    ...p,
    cash: round2(p.cash - total),
    shares: { ...p.shares, [id]: (p.shares[id] ?? 0) + qty },
    fees: round2(p.fees + fee),
    trades: [...p.trades, trade],
  };
}

/** Sell whole shares you hold. The fee comes out of the proceeds. */
export function sell(p: Portfolio, round: number, id: string, qty: number, price: number): Portfolio | TradeError {
  if (!Number.isInteger(qty) || qty < 1) return 'qty';
  const held = p.shares[id] ?? 0;
  if (qty > held) return 'holding';
  const value = round2(qty * price);
  const fee = round2(tradeFee(value, feeRate()));
  const shares = { ...p.shares, [id]: held - qty };
  if (shares[id] === 0) delete shares[id];
  return {
    ...p,
    cash: round2(p.cash + value - fee),
    shares,
    fees: round2(p.fees + fee),
    trades: [...p.trades, { round, id, side: 'sell', qty, price, fee }],
  };
}

export const isError = (x: Portfolio | TradeError): x is TradeError => typeof x === 'string';

/** Pay each company's dividend on the shares you hold, if this is a dividend round. */
export function payDividends(p: Portfolio, config: MarketConfig, round: number): Portfolio {
  if (!config.dividendRounds.includes(round)) return p;
  const paid = round2(config.companies.reduce((sum, c) => sum + (p.shares[c.id] ?? 0) * c.dividend, 0));
  return paid === 0 ? p : { ...p, cash: round2(p.cash + paid), dividends: round2(p.dividends + paid) };
}

/** Cash plus shares at the given prices. */
export function totalValue(p: Portfolio, prices: Record<string, number>): number {
  return round2(p.cash + Object.entries(p.shares).reduce((sum, [id, n]) => sum + n * (prices[id] ?? 0), 0));
}

export const holdingsValue = (p: Portfolio, prices: Record<string, number>) => round2(totalValue(p, prices) - p.cash);

/** Average price you paid per share still held, replaying your trades (fees left out). 0 if you hold none. */
export function avgCost(trades: Trade[], id: string): number {
  let qty = 0;
  let cost = 0;
  for (const t of trades) {
    if (t.id !== id) continue;
    if (t.side === 'buy') {
      qty += t.qty;
      cost += t.qty * t.price;
    } else if (qty > 0) {
      cost -= (cost / qty) * t.qty;
      qty -= t.qty;
    }
  }
  return qty > 0 ? cost / qty : 0;
}

export interface Position {
  shares: number;
  avgCost: number;
  value: number;
  /** Value now minus what you paid for the shares you still hold. Not locked in until you sell. */
  paper: number;
}

export function positionOf(p: Portfolio, id: string, price: number): Position {
  const shares = p.shares[id] ?? 0;
  const avg = avgCost(p.trades, id);
  return { shares, avgCost: avg, value: round2(shares * price), paper: round2(shares * (price - avg)) };
}
