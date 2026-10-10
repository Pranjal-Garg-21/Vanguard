/** What the debrief says: results, what moved each price, how spread out you were, and the same-market comparison. */
import { round2 } from '@/core/market';
import { effectFor, priceAt } from './market';
import { buy, buyCost, isError, newPortfolio, payDividends, totalValue } from './portfolio';
import type { Market, MarketConfig, Portfolio } from './types';

export function pricesAt(config: MarketConfig, market: Market, round: number): Record<string, number> {
  return Object.fromEntries(config.companies.map((c) => [c.id, priceAt(market, c.id, round)]));
}

export interface Result {
  value: number;
  gain: number;
  gainPct: number;
  fees: number;
  dividends: number;
  trades: number;
}

export function summarise(config: MarketConfig, p: Portfolio, prices: Record<string, number>): Result {
  const value = totalValue(p, prices);
  return {
    value,
    gain: round2(value - config.cash),
    gainPct: (value - config.cash) / config.cash,
    fees: p.fees,
    dividends: p.dividends,
    trades: p.trades.length,
  };
}

export interface Move {
  id: string;
  start: number;
  end: number;
  changePct: number;
  /** The headlines that moved this company most (up to two), biggest first. A failure always comes first. */
  newsKeys: string[];
  failed: boolean;
}

/** For each company: where it started, where it ended, and which headlines mattered most. */
export function movesByCompany(config: MarketConfig, market: Market): Move[] {
  return config.companies.map((c) => {
    const start = priceAt(market, c.id, 1);
    const end = priceAt(market, c.id, config.rounds);
    const failed = config.news.some((n) => n.fail === c.id);
    const ranked = config.news
      .map((n) => ({ key: n.textKey, size: n.fail === c.id ? Infinity : Math.abs(effectFor(n, c.id)) }))
      .filter((x) => x.size > 0)
      .sort((a, b) => b.size - a.size)
      .slice(0, 2)
      .map((x) => x.key);
    return { id: c.id, start, end, changePct: start === 0 ? 0 : end / start - 1, failed, newsKeys: ranked };
  });
}

export type SpreadLabel = 'none' | 'one' | 'concentrated' | 'some' | 'spread';

/** How spread out the shares you hold are, in words rather than a score. */
export function diversification(p: Portfolio, prices: Record<string, number>): { label: SpreadLabel; count: number; topShare: number } {
  const values = Object.entries(p.shares)
    .map(([id, n]) => n * (prices[id] ?? 0))
    .filter((v) => v > 0);
  const total = values.reduce((a, b) => a + b, 0);
  if (values.length === 0 || total === 0) return { label: 'none', count: 0, topShare: 0 };
  const topShare = Math.max(...values) / total;
  const count = values.length;
  const label: SpreadLabel = count === 1 ? 'one' : topShare > 0.5 ? 'concentrated' : count >= 4 && topShare < 0.35 ? 'spread' : 'some';
  return { label, count, topShare };
}

/**
 * The same market, played the quiet way: split the cash evenly over every company in round 1, then hold to
 * the end. Fees and dividends are counted the same way, so the only difference is the choices made.
 */
export function spreadAndHold(config: MarketConfig, market: Market): Portfolio {
  let p = newPortfolio(config.cash);
  const slice = config.cash / config.companies.length;
  for (const c of config.companies) {
    const price = priceAt(market, c.id, 1);
    let qty = Math.floor(slice / price);
    while (qty > 0 && buyCost(qty, price).total > slice) qty--;
    if (qty < 1) continue;
    const next = buy(p, 1, c.id, qty, price);
    if (!isError(next)) p = next;
  }
  for (let round = 1; round <= config.rounds; round++) p = payDividends(p, config, round);
  return p;
}

export interface Behaviour {
  /** Bought the rumoured company in the week the rumour appeared. */
  boughtOnRumour: boolean;
  /** Sold something in the week of the market-wide drop. */
  soldInDrop: boolean;
  /** Held a company when it failed. */
  heldFailed: boolean;
}

export function behaviour(config: MarketConfig, p: Portfolio): Behaviour {
  return {
    boughtOnRumour: p.trades.some((t) => t.side === 'buy' && t.round === config.rumour.round && t.id === config.rumour.company),
    soldInDrop: p.trades.some((t) => t.side === 'sell' && t.round === config.drop.round),
    heldFailed: heldWhenFailed(config, p),
  };
}

/** Did the player hold this company in the week it failed? Replays the trades. */
export function heldWhenFailed(config: MarketConfig, p: Portfolio): boolean {
  const failNews = config.news.find((n) => n.fail);
  if (!failNews?.fail) return false;
  let held = 0;
  for (const t of p.trades) {
    if (t.id !== failNews.fail || t.round >= failNews.round) continue; // trades in the failure week come after the collapse
    held += t.side === 'buy' ? t.qty : -t.qty;
  }
  return held > 0;
}

