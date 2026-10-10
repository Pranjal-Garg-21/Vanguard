/**
 * Weekly share prices for the Stock Market Simulator. Seeded, so a class sharing a code sees the same market
 * and a replay keeps the same luck. Pure: no React, no storage.
 *
 * Each week: drift + volatility x a random draw + any scripted news effect. A company that "fails" drops to
 * 2% of its price and stays there (a share can go to almost zero).
 */
import { createRng, hashSeed, quantile } from '@/core/market';
import type { Company, Effect, Market, MarketConfig, NewsCard } from './types';

const MAX_WEEKLY_MOVE = 0.6;
const FAILURE_KEEPS = 0.02;
const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

export const weeklyDrift = (annual: number) => Math.pow(1 + annual, 1 / 52) - 1;
export const weeklyVol = (annual: number) => annual / Math.sqrt(52);

/** Total scripted effect on one company in a round (company-specific plus market-wide). */
export function effectFor(news: NewsCard | undefined, companyId: string): number {
  if (!news) return 0;
  return news.effects.reduce((sum, e: Effect) => sum + (e.target === companyId || e.target === 'market' ? e.pct : 0), 0);
}

export function newsForRound(config: MarketConfig, round: number): NewsCard | undefined {
  return config.news.find((n) => n.round === round);
}

export function buildMarket(config: MarketConfig, seed: number | string): Market {
  const prices: Record<string, number[]> = {};
  for (const c of config.companies) {
    const rng = createRng(hashSeed(seed, 'stock', c.id));
    const vol = weeklyVol(config.volClasses[c.vol]);
    const drift = weeklyDrift(config.driftAnnual);
    const path = [c.startPrice];
    let failed = false;
    for (let round = 2; round <= config.rounds; round++) {
      const z = rng.normal(); // always drawn, so editing news never reshuffles the luck
      const news = newsForRound(config, round);
      const last = path[path.length - 1]!;
      if (failed) {
        path.push(last);
      } else if (news?.fail === c.id) {
        failed = true;
        path.push(last * FAILURE_KEEPS);
      } else {
        const r = clamp(drift + vol * z + effectFor(news, c.id), -MAX_WEEKLY_MOVE, MAX_WEEKLY_MOVE);
        path.push(last * (1 + r));
      }
    }
    prices[c.id] = path;
  }
  return { prices };
}

export const priceAt = (market: Market, id: string, round: number): number => market.prices[id]?.[round - 1] ?? 0;

/** Price change since the week before, as a fraction. Round 1 has nothing to compare with. */
export function changeAt(market: Market, id: string, round: number): number {
  if (round <= 1) return 0;
  const prev = priceAt(market, id, round - 1);
  return prev === 0 ? 0 : priceAt(market, id, round) / prev - 1;
}

/**
 * 300 possible next `weeks` for a set of holdings with no news: where the value of cash + shares might land.
 * Dividends are left out, which is stated on screen.
 */
export function nextWeeksRange(
  config: MarketConfig,
  held: Record<string, number>,
  lastPrices: Record<string, number>,
  cash: number,
  weeks: number,
  seed: number | string,
  runs = 300,
) {
  const companies = config.companies.filter((c: Company) => (held[c.id] ?? 0) > 0);
  const finals: number[] = [];
  for (let run = 0; run < runs; run++) {
    let value = cash;
    for (const c of companies) {
      const rng = createRng(hashSeed(seed, 'next', c.id, run));
      const vol = weeklyVol(config.volClasses[c.vol]);
      const drift = weeklyDrift(config.driftAnnual);
      // A company that already failed stays near zero.
      const dead = (lastPrices[c.id] ?? 0) < c.startPrice * 0.05;
      let price = lastPrices[c.id] ?? 0;
      for (let w = 0; w < weeks && !dead; w++) price *= 1 + clamp(drift + vol * rng.normal(), -MAX_WEEKLY_MOVE, MAX_WEEKLY_MOVE);
      value += (held[c.id] ?? 0) * price;
    }
    finals.push(value);
  }
  finals.sort((a, b) => a - b);
  return { low: quantile(finals, 0.05), median: quantile(finals, 0.5), high: quantile(finals, 0.95) };
}

