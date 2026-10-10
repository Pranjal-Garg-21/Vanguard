import { describe, it, expect } from 'vitest';
import raw from '@/content/scenarios/invest/stock_market.json';
import { t } from '@/platform';
import { assumptions } from '@/core/market';
import { behaviour, diversification, movesByCompany, pricesAt, spreadAndHold, summarise } from './analysis';
import { buildMarket, changeAt, effectFor, nextWeeksRange, newsForRound, priceAt } from './market';
import { buy, buyCost, isError, newPortfolio, payDividends, sell, totalValue } from './portfolio';
import type { MarketConfig, Portfolio } from './types';

const config = raw as unknown as MarketConfig;
const market = buildMarket(config, 'class-1');

/** Unwraps a trade result or fails the test with the reason it was refused. */
function ok(x: Portfolio | string): Portfolio {
  if (isError(x as Portfolio)) throw new Error(`trade refused: ${String(x)}`);
  return x as Portfolio;
}

describe('config', () => {
  it('has six companies, twelve rounds, one news card per round and valid targets', () => {
    expect(config.companies).toHaveLength(6);
    expect(config.news.map((n) => n.round)).toEqual(Array.from({ length: config.rounds }, (_, i) => i + 1));
    const ids = new Set(config.companies.map((c) => c.id));
    for (const n of config.news) {
      for (const e of n.effects) expect(e.target === 'market' || ids.has(e.target), `${n.id}: bad target ${e.target}`).toBe(true);
      if (n.fail) expect(ids.has(n.fail)).toBe(true);
    }
    expect(ids.has(config.rumour.company)).toBe(true);
  });
  it('plays the scripted moments in the right weeks', () => {
    expect(newsForRound(config, config.rumour.round)?.tone).toBe('rumour');
    expect(newsForRound(config, config.drop.round)?.effects[0]).toMatchObject({ target: 'market' });
    expect(config.news.some((n) => n.fail)).toBe(true);
    expect(config.news.some((n) => n.tone === 'noise' && n.effects.length === 0)).toBe(true);
  });
  it('every string exists', () => {
    for (const c of config.companies) {
      expect(t(c.nameKey)).not.toBe(c.nameKey);
      expect(t(c.taglineKey)).not.toBe(c.taglineKey);
    }
    for (const n of config.news) expect(t(n.textKey), n.id).not.toBe(n.textKey);
  });
  it('uses the fee from assumptions.json, not a copy', () => {
    expect(buyCost(10, 100).fee).toBeCloseTo(1000 * assumptions.costs.tradeFee);
  });
});

describe('market', () => {
  it('is repeatable for a seed and different for another', () => {
    expect(buildMarket(config, 'class-1')).toEqual(market);
    expect(buildMarket(config, 'class-2')).not.toEqual(market);
  });
  it('starts at the listed prices and never goes negative', () => {
    for (const c of config.companies) {
      const path = market.prices[c.id]!;
      expect(path).toHaveLength(config.rounds);
      expect(path[0]).toBe(c.startPrice);
      for (const p of path) expect(p).toBeGreaterThan(0);
    }
  });
  it('the rumour pushes its company up, then the correction pulls it back', () => {
    const id = config.rumour.company;
    expect(changeAt(market, id, config.rumour.round)).toBeGreaterThan(0.05);
    expect(changeAt(market, id, config.rumour.round + 1)).toBeLessThan(0);
  });
  it('the market-wide drop is scripted for every company, and most fall', () => {
    expect(effectFor(newsForRound(config, config.drop.round), 'chaiwala')).toBeCloseTo(-0.15);
    const falling = config.companies.filter((c) => changeAt(market, c.id, config.drop.round) < 0).length;
    expect(falling).toBeGreaterThanOrEqual(5);
  });
  it('a failed company collapses to about 2% and stays there', () => {
    const news = config.news.find((n) => n.fail)!;
    const id = news.fail!;
    expect(priceAt(market, id, news.round) / priceAt(market, id, news.round - 1)).toBeCloseTo(0.02);
    expect(priceAt(market, id, config.rounds)).toBeCloseTo(priceAt(market, id, news.round));
  });
  it('a noise card has no scripted effect', () => {
    expect(effectFor(newsForRound(config, 3), 'chaiwala')).toBe(0);
  });
});

describe('portfolio', () => {
  it('buys with a fee, sells with a fee, and refuses what you cannot afford or hold', () => {
    const p = ok(buy(newPortfolio(10000), 1, 'chaiwala', 10, 100));
    expect(p.cash).toBeCloseTo(10000 - 1000 - 5);
    expect(p.fees).toBeCloseTo(5);
    expect(p.shares.chaiwala).toBe(10);
    expect(buy(p, 1, 'chaiwala', 1000, 100)).toBe('cash');
    expect(buy(p, 1, 'chaiwala', 0, 100)).toBe('qty');
    expect(buy(p, 1, 'chaiwala', 1.5, 100)).toBe('qty');
    expect(sell(p, 2, 'chaiwala', 11, 100)).toBe('holding');
    const sold = ok(sell(p, 2, 'chaiwala', 10, 110));
    expect(sold.shares.chaiwala).toBeUndefined();
    expect(sold.cash).toBeCloseTo(10000 - 1005 + 1100 - 5.5);
    expect(sold.fees).toBeCloseTo(10.5);
  });
  it('every trade costs something: a round trip at the same price loses the fees', () => {
    const a = ok(buy(newPortfolio(1000), 1, 'chaiwala', 5, 100));
    const b = ok(sell(a, 2, 'chaiwala', 5, 100));
    expect(b.cash).toBeLessThan(1000);
  });
  it('pays dividends only in dividend rounds, only on shares held', () => {
    const a = ok(buy(newPortfolio(10000), 1, 'chaiwala', 10, 100));
    expect(payDividends(a, config, 5)).toBe(a);
    const paid = payDividends(a, config, 6);
    expect(paid.dividends).toBeCloseTo(20);
    expect(paid.cash).toBeCloseTo(a.cash + 20);
  });
  it('total value is cash plus shares at the current prices', () => {
    const a = ok(buy(newPortfolio(10000), 1, 'chaiwala', 10, 100));
    expect(totalValue(a, { chaiwala: 120 })).toBeCloseTo(a.cash + 1200);
  });
});

describe('analysis', () => {
  const last = pricesAt(config, market, config.rounds);

  it('doing nothing keeps the money', () => {
    const r = summarise(config, newPortfolio(config.cash), last);
    expect(r.gain).toBe(0);
    expect(r.trades).toBe(0);
  });
  it('spread-and-hold buys every company and pays dividends, and is repeatable', () => {
    const p = spreadAndHold(config, market);
    expect(Object.keys(p.shares)).toHaveLength(6);
    expect(p.dividends).toBeGreaterThan(0);
    expect(spreadAndHold(config, market)).toEqual(p);
    expect(diversification(p, pricesAt(config, market, 1)).label).toBe('spread');
  });
  it('describes spread in words', () => {
    const p = (shares: Record<string, number>): Portfolio => ({ ...newPortfolio(0), shares });
    const prices = { a: 10, b: 10, c: 10, d: 10 };
    expect(diversification(p({}), prices).label).toBe('none');
    expect(diversification(p({ a: 5 }), prices).label).toBe('one');
    expect(diversification(p({ a: 9, b: 1 }), prices).label).toBe('concentrated');
    expect(diversification(p({ a: 1, b: 1, c: 1, d: 1 }), prices).label).toBe('spread');
    expect(diversification(p({ a: 1, b: 1 }), prices).label).toBe('some');
  });
  it('names the headline that moved each company most', () => {
    const moves = movesByCompany(config, market);
    expect(moves.find((m) => m.id === 'bhagya_tech')?.failed).toBe(true);
    expect(moves.find((m) => m.id === 'bhagya_tech')?.newsKeys[0]).toBe('stockmarket.news.n10');
    expect(moves.find((m) => m.id === 'deccan_farms')?.newsKeys).toContain('stockmarket.news.n4');
    expect(moves.find((m) => m.id === 'chaiwala')?.newsKeys).toEqual(['stockmarket.news.n8', 'stockmarket.news.n2']);
    expect(moves.find((m) => m.id === 'hyd_repairs')?.newsKeys.length).toBeLessThanOrEqual(2);
  });
  it('spots buying on a rumour, selling in the drop, and holding a company that fails', () => {
    const a = ok(buy(newPortfolio(config.cash), config.rumour.round, config.rumour.company, 5, 70));
    const b = ok(buy(a, 2, 'bhagya_tech', 2, 150));
    const c = ok(sell(b, config.drop.round, config.rumour.company, 1, 60));
    expect(behaviour(config, c)).toEqual({ boughtOnRumour: true, soldInDrop: true, heldFailed: true });
    expect(behaviour(config, newPortfolio(config.cash))).toEqual({ boughtOnRumour: false, soldInDrop: false, heldFailed: false });
  });
  it('selling a failing company in the failure week still counts as having held it', () => {
    const failRound = config.news.find((n) => n.fail)!.round;
    const a = ok(buy(newPortfolio(config.cash), 2, 'bhagya_tech', 2, 150));
    const b = ok(sell(a, failRound, 'bhagya_tech', 2, 3));
    expect(behaviour(config, b).heldFailed).toBe(true);
  });
  it('next-weeks range is ordered, repeatable, and wider for a bumpier holding', () => {
    const calm = nextWeeksRange(config, { chaiwala: 50 }, { chaiwala: 100 }, 0, 12, 'x');
    const wild = nextWeeksRange(config, { bhagya_tech: 33 }, { bhagya_tech: 150 }, 0, 12, 'x');
    expect(calm.low).toBeLessThanOrEqual(calm.median);
    expect(calm.median).toBeLessThanOrEqual(calm.high);
    expect(nextWeeksRange(config, { chaiwala: 50 }, { chaiwala: 100 }, 0, 12, 'x')).toEqual(calm);
    expect((wild.high - wild.low) / wild.median).toBeGreaterThan((calm.high - calm.low) / calm.median);
  });
});
