import { describe, it, expect } from 'vitest';
import raw from '@/content/scenarios/invest/stock_market.json';
import { t } from '@/platform';
import { pricesAt } from './analysis';
import { commentsAfterTrade, commentsAfterWeek, type Comment } from './coach';
import { buildMarket, changeAt, newsForRound } from './market';
import { avgCost, buy, newPortfolio, positionOf, sell } from './portfolio';
import type { MarketConfig, Portfolio } from './types';

const config = raw as unknown as MarketConfig;
const market = buildMarket(config, 'class-1');
const name = (id: string) => t(config.companies.find((c) => c.id === id)!.nameKey);

const ok = (x: Portfolio | string): Portfolio => {
  if (typeof x === 'string') throw new Error(`refused: ${x}`);
  return x;
};

/** Plays one trade and returns the coach's comments for it. */
function trade(before: Portfolio, round: number, side: 'buy' | 'sell', id: string, qty: number) {
  const prices = pricesAt(config, market, round);
  const after = ok(side === 'buy' ? buy(before, round, id, qty, prices[id]!) : sell(before, round, id, qty, prices[id]!));
  const last = after.trades[after.trades.length - 1]!;
  const changes = Object.fromEntries(config.companies.map((c) => [c.id, changeAt(market, c.id, round)]));
  const failedIds = new Set(config.news.filter((n) => n.fail && n.round <= round).map((n) => n.fail!));
  const comments = commentsAfterTrade({ config, round, side, id, qty, price: last.price, fee: last.fee, before, after, prices, changes, news: newsForRound(config, round), failedIds, name });
  return { after, comments };
}

const keys = (cs: Comment[]) => cs.map((c) => c.key);
const say = (c: Comment) => t(`stockmarket.coach.${c.key}`, c.vars as Record<string, string | number>);

describe('positions and cost', () => {
  it('averages what you paid across several buys, and keeps the average when you sell some', () => {
    let p = ok(buy(newPortfolio(10000), 1, 'chaiwala', 10, 100));
    p = ok(buy(p, 2, 'chaiwala', 10, 120));
    expect(avgCost(p.trades, 'chaiwala')).toBeCloseTo(110);
    p = ok(sell(p, 3, 'chaiwala', 5, 130));
    expect(avgCost(p.trades, 'chaiwala')).toBeCloseTo(110);
    expect(positionOf(p, 'chaiwala', 130)).toMatchObject({ shares: 15, value: 1950, paper: 300 });
    expect(avgCost(p.trades, 'bhagya_tech')).toBe(0);
  });
});

describe('after a buy', () => {
  it('says what it cost, and how far the price must rise to cover the fees', () => {
    const { comments } = trade(newPortfolio(config.cash), 1, 'buy', 'chaiwala', 10);
    expect(keys(comments)).toContain('trade.buy');
    const be = comments.find((c) => c.key === 'think.breakeven')!;
    expect(be.vars.pct).toBe('1.0%');
  });

  it('asks about real news after a jump, and calls out a rumour', () => {
    const rumour = config.rumour.company;
    const { comments } = trade(newPortfolio(config.cash), config.rumour.round, 'buy', rumour, 5);
    expect(keys(comments)).toContain('think.rumour');
    expect(keys(comments)).not.toContain('think.jump');
  });

  it('warns when most of your shares sit in one company, and praises a real spread', () => {
    const one = trade(newPortfolio(config.cash), 1, 'buy', 'chaiwala', 10);
    expect(keys(one.comments)).toContain('think.concentrated');
    let p = newPortfolio(config.cash);
    for (const c of config.companies) p = trade(p, 1, 'buy', c.id, 4).after;
    const last = trade(p, 1, 'buy', 'chaiwala', 1);
    expect(keys(last.comments)).toContain('spread.ok');
    expect(keys(last.comments)).not.toContain('think.concentrated');
  });

  it('notes when cash is nearly gone', () => {
    const { comments } = trade(newPortfolio(10000), 1, 'buy', 'musi_transport', 82);
    expect(keys(comments)).toContain('think.lowCash');
  });

  it('flags running fees once, when they first reach 1% of the starting money', () => {
    let p = newPortfolio(config.cash);
    let flagged = 0;
    for (let i = 0; i < 12; i++) {
      const r = trade(p, 1, i % 2 === 0 ? 'buy' : 'sell', 'chaiwala', 30);
      p = r.after;
      flagged += keys(r.comments).filter((k) => k === 'think.fees').length;
    }
    expect(flagged).toBe(1);
  });
});

describe('after a sell', () => {
  it('says whether the sale locked in a gain or a loss against what you paid', () => {
    const bought = trade(newPortfolio(config.cash), 1, 'buy', 'chaiwala', 10).after;
    const lossy = ok(sell(bought, 2, 'chaiwala', 10, 80));
    const gainy = ok(sell(bought, 2, 'chaiwala', 10, 140));
    const input = (after: Portfolio, price: number) =>
      commentsAfterTrade({
        config, round: 2, side: 'sell', id: 'chaiwala', qty: 10, price, fee: after.trades[after.trades.length - 1]!.fee,
        before: bought, after, prices: pricesAt(config, market, 2), changes: {}, news: newsForRound(config, 2), failedIds: new Set(), name,
      });
    expect(keys(input(lossy, 80))).toContain('sell.loss');
    expect(keys(input(gainy, 140))).toContain('sell.gain');
  });

  it('turns a drop-week sale into a question about paper losses', () => {
    const bought = trade(newPortfolio(config.cash), 1, 'buy', 'chaiwala', 10).after;
    const { comments } = trade(bought, config.drop.round, 'sell', 'chaiwala', 5);
    expect(keys(comments)).toContain('think.soldDrop');
  });

  it('says when you are back to all cash', () => {
    const bought = trade(newPortfolio(config.cash), 1, 'buy', 'chaiwala', 10).after;
    const { comments } = trade(bought, 2, 'sell', 'chaiwala', 10);
    expect(keys(comments)).toContain('think.allCash');
  });
});

describe('after a week', () => {
  const week = (p: Portfolio, round: number, dividendsPaid = 0) =>
    commentsAfterWeek({ config, round, portfolio: p, prevPrices: pricesAt(config, market, round - 1), prices: pricesAt(config, market, round), dividendsPaid, news: newsForRound(config, round), name });

  it('says your money was untouched if you held only cash', () => {
    expect(keys(week(newPortfolio(config.cash), 2))).toEqual(['week.cashOnly']);
  });

  it('says how your total moved and which holding drove it', () => {
    const p = trade(newPortfolio(config.cash), 1, 'buy', 'chaiwala', 20).after;
    const cs = week(p, 2);
    expect(keys(cs)).toContain('week.moved');
    expect(cs.find((c) => c.key === 'week.driver')?.vars.name).toBe(name('chaiwala'));
  });

  it('tells you about a held fall, a failed company you held, and a dividend', () => {
    const p = trade(newPortfolio(config.cash), 1, 'buy', 'bhagya_tech', 10).after;
    expect(keys(week(p, config.drop.round))).toContain('week.heldDrop');
    const failRound = config.news.find((n) => n.fail)!.round;
    const failed = week(p, failRound).find((c) => c.key === 'week.failedHeld')!;
    expect(failed.tone).toBe('warn');
    expect(keys(week(newPortfolio(config.cash), failRound))).toContain('week.failedNot');
    expect(keys(week(p, 6, 25))).toContain('week.dividend');
  });

  it('explains that noise headlines change nothing', () => {
    expect(keys(week(newPortfolio(config.cash), 3))).toContain('week.noise');
  });
});

describe('wording', () => {
  const allKeys = [
    'trade.buy', 'trade.sell', 'sell.gain', 'sell.loss', 'sell.even', 'sell.failed', 'think.breakeven', 'think.rumour', 'think.jump', 'think.dip',
    'think.concentrated', 'spread.ok', 'think.lowCash', 'think.fees', 'think.soldDrop', 'think.allCash', 'week.moved', 'week.driver', 'week.cashOnly',
    'week.heldDrop', 'week.failedHeld', 'week.failedNot', 'week.dividend', 'week.noise',
  ];
  const sample = { qty: 5, name: 'Chaiwala Ltd', price: '₹100.00', total: '₹501', fee: '₹0.50', avg: '₹100', amount: '₹10', pct: '8%', count: 4, fees: '₹100', n: 3, from: '₹1', to: '₹2', delta: '+₹1', loss: '₹5' };

  it('every coach string exists, fills in, and is easy to read', () => {
    for (const key of allKeys) {
      const text = t(`stockmarket.coach.${key}`, sample);
      expect(text, key).not.toMatch(/[{}]|^stockmarket\./);
      for (const sentence of text.split(/(?<=[.!?])\s+/)) {
        expect(sentence.split(/\s+/).length, `${key}: "${sentence}"`).toBeLessThanOrEqual(26);
      }
    }
  });

  it('the coach never tells you to buy or sell, or says an asset is best', () => {
    for (const key of allKeys) {
      const text = t(`stockmarket.coach.${key}`, sample);
      expect(text, key).not.toMatch(/\b(you should|you must|buy now|sell now|best|recommend)\b/i);
    }
  });

  it('think lines ask something or point at a risk, and happened lines state facts', () => {
    const thinkKeys = allKeys.filter((k) => k.startsWith('think.'));
    expect(thinkKeys.length).toBeGreaterThan(5);
    expect(say({ kind: 'think', tone: 'info', key: 'think.jump', vars: { name: 'X', pct: '9%' }, round: 1 })).toContain('?');
  });
});
