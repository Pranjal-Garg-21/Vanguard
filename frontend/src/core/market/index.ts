/**
 * The Deccan Exchange: fictional companies, an index fund (ETF), an actively
 * managed fund and gold. Prices are a pure function of (seed, asset, month),
 * so a replay or a What-If branch sees exactly the same market. Owner: P4.
 *
 * Model: each month = asset drift + beta × a shared market move + the asset's
 * own noise. Months 9–10 carry a market-wide dip, so every player meets
 * volatility before the year ends. All assets are invented.
 */
import { normal } from '@/core/random';

export type AssetId = 'pearl' | 'tiffin' | 'lakeview' | 'gully' | 'bonalu' | 'index' | 'active' | 'gold';

export type AssetKind = 'stock' | 'etf' | 'fund' | 'gold';

export type AssetDef = {
  id: AssetId;
  kind: AssetKind;
  /** Starting price in ₹ at month 0. */
  start: number;
  /** Expected monthly return before fees. */
  drift: number;
  /** Monthly volatility of its own (company-specific) moves. */
  vol: number;
  /** How strongly it follows the whole market. */
  beta: number;
  /** Yearly fee (expense ratio) taken out of the price, for funds. */
  feePa: number;
};

export const ASSETS: AssetDef[] = [
  { id: 'pearl', kind: 'stock', start: 120, drift: 0.006, vol: 0.03, beta: 0.6, feePa: 0 },
  { id: 'tiffin', kind: 'stock', start: 250, drift: 0.012, vol: 0.09, beta: 1.3, feePa: 0 },
  { id: 'lakeview', kind: 'stock', start: 80, drift: 0.008, vol: 0.06, beta: 1.1, feePa: 0 },
  { id: 'gully', kind: 'stock', start: 40, drift: -0.01, vol: 0.18, beta: 1.6, feePa: 0 },
  { id: 'bonalu', kind: 'stock', start: 150, drift: 0.009, vol: 0.05, beta: 0.9, feePa: 0 },
  { id: 'index', kind: 'etf', start: 100, drift: 0, vol: 0, beta: 0, feePa: 0.002 },
  { id: 'active', kind: 'fund', start: 100, drift: 0, vol: 0.02, beta: 0, feePa: 0.015 },
  { id: 'gold', kind: 'gold', start: 6000, drift: 0.006, vol: 0.025, beta: -0.2, feePa: 0 },
];

const STOCKS = ASSETS.filter((a) => a.kind === 'stock');

export function assetDef(id: AssetId): AssetDef {
  const def = ASSETS.find((a) => a.id === id);
  if (!def) throw new Error(`unknown asset ${id}`);
  return def;
}

/** The whole market's move in a month: small positive drift, a dip in months 9–10. */
export function marketMove(seed: number, month: number): number {
  const shock = month === 9 ? -0.14 : month === 10 ? -0.06 : month === 12 ? 0.05 : 0;
  return 0.004 + 0.035 * normal(seed, 'market', month) + shock;
}

/** One asset's return in one month (month ≥ 1). */
export function monthlyReturn(seed: number, id: AssetId, month: number): number {
  const def = assetDef(id);
  if (def.kind === 'etf') {
    // The index fund holds every company equally, minus a tiny fee.
    const avg = STOCKS.reduce((sum, s) => sum + monthlyReturn(seed, s.id, month), 0) / STOCKS.length;
    return avg - def.feePa / 12;
  }
  if (def.kind === 'fund') {
    // An active fund tries to beat the index; usually it lands near it, minus a bigger fee.
    const indexBeforeFee = monthlyReturn(seed, 'index', month) + assetDef('index').feePa / 12;
    return indexBeforeFee + def.vol * normal(seed, id, month) - def.feePa / 12;
  }
  return def.drift + def.beta * marketMove(seed, month) + def.vol * normal(seed, id, month);
}

const cache = new Map<string, number>();

/** Price in whole rupees at the start of a month (month 0 = the start price). */
export function priceAt(seed: number, id: AssetId, month: number): number {
  const key = `${seed}|${id}|${month}`;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  let price = assetDef(id).start;
  for (let m = 1; m <= month; m++) price = Math.max(1, price * (1 + monthlyReturn(seed, id, m)));
  const rounded = Math.round(price * 100) / 100;
  cache.set(key, rounded);
  return rounded;
}

/** Percentage change from one month to another, e.g. 0.12 for +12%. */
export function change(seed: number, id: AssetId, from: number, to: number): number {
  return priceAt(seed, id, to) / priceAt(seed, id, from) - 1;
}

/** Headline for the news board this month: which company moved most, and the market mood. */
export function headline(seed: number, month: number): { id: AssetId; move: number; mood: 'up' | 'down' | 'flat' } {
  let best: { id: AssetId; move: number } = { id: 'pearl', move: 0 };
  for (const s of STOCKS) {
    const move = month > 0 ? change(seed, s.id, month - 1, month) : 0;
    if (Math.abs(move) > Math.abs(best.move)) best = { id: s.id, move };
  }
  const m = month > 0 ? marketMove(seed, month) : 0;
  return { ...best, mood: m > 0.02 ? 'up' : m < -0.02 ? 'down' : 'flat' };
}
