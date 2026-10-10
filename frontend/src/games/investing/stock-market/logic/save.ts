/** What the Stock Market saves, and a strict reader for it. Anything that does not check out is ignored. */
import raw from '@/content/scenarios/invest/stock_market.json';
import type { MarketConfig, Portfolio, Trade } from './types';

const config = raw as unknown as MarketConfig;

export interface StockSave {
  phase: 'play' | 'debrief';
  /** The week you are in (1 to the last week). */
  round: number;
  portfolio: Portfolio;
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const int = (v: unknown, min: number, max: number): v is number => num(v) && Number.isInteger(v) && v >= min && v <= max;

export function parseStockSave(value: unknown): StockSave | null {
  if (!isRecord(value) || !isRecord(value.portfolio)) return null;
  const { phase, round } = value;
  if ((phase !== 'play' && phase !== 'debrief') || !int(round, 1, config.rounds)) return null;
  const p = value.portfolio;
  if (!num(p.cash) || p.cash < 0 || !num(p.fees) || p.fees < 0 || !num(p.dividends) || p.dividends < 0) return null;
  if (!isRecord(p.shares) || !Array.isArray(p.trades)) return null;

  const known = new Set(config.companies.map((c) => c.id));
  const shares: Record<string, number> = {};
  for (const [id, n] of Object.entries(p.shares)) {
    if (!known.has(id) || !int(n, 1, 1_000_000)) return null;
    shares[id] = n;
  }
  const trades: Trade[] = [];
  for (const t of p.trades) {
    if (!isRecord(t) || !known.has(String(t.id)) || (t.side !== 'buy' && t.side !== 'sell')) return null;
    if (!int(t.round, 1, round) || !int(t.qty, 1, 1_000_000) || !num(t.price) || t.price <= 0 || !num(t.fee) || t.fee < 0) return null;
    trades.push({ round: t.round, id: String(t.id), side: t.side, qty: t.qty, price: t.price, fee: t.fee });
  }
  return { phase, round, portfolio: { cash: p.cash, shares, fees: p.fees, dividends: p.dividends, trades } };
}
