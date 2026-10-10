/**
 * The coach: after every move it says what the move did to your money, and asks a question worth thinking about.
 * Pure: it returns message keys and numbers, and the screen turns them into words.
 *
 * Rule: it never tells the student what to buy or sell. "Happened" lines say what the move did. "Think" lines
 * ask a question, such as "what real news is behind this jump?".
 */
import { diversification } from './analysis';
import { money, price as fmtPrice, signedMoney, signedPct } from './format';
import { avgCost, totalValue } from './portfolio';
import type { MarketConfig, NewsCard, Portfolio } from './types';

export interface Comment {
  kind: 'happened' | 'think';
  tone: 'good' | 'warn' | 'info';
  /** A key under stockmarket.coach.* */
  key: string;
  vars: Record<string, string | number>;
  round: number;
}

const pct0 = (x: number) => `${Math.round(Math.abs(x) * 100)}%`;
/** A weekly move this big is worth a question. */
const BIG_MOVE = 0.08;

function maker(round: number) {
  const out: Comment[] = [];
  const say = (kind: Comment['kind'], tone: Comment['tone'], key: string, vars: Comment['vars'] = {}) => {
    out.push({ kind, tone, key, vars, round });
  };
  return { out, say };
}

export interface TradeInput {
  config: MarketConfig;
  round: number;
  side: 'buy' | 'sell';
  id: string;
  qty: number;
  price: number;
  fee: number;
  before: Portfolio;
  after: Portfolio;
  /** Prices this round, and this week's change for each company. */
  prices: Record<string, number>;
  changes: Record<string, number>;
  news: NewsCard | undefined;
  failedIds: Set<string>;
  name: (id: string) => string;
}

export function commentsAfterTrade(i: TradeInput): Comment[] {
  const { out, say } = maker(i.round);
  const gross = i.qty * i.price;
  const name = i.name(i.id);
  const feeRate = i.fee / gross;

  if (i.side === 'buy') {
    say('happened', 'info', 'trade.buy', { qty: i.qty, name, price: fmtPrice(i.price), total: fmtPrice(gross + i.fee), fee: fmtPrice(i.fee) });
    if (i.before.trades.length < 3) {
      // A buying fee now and a selling fee later: the price must rise by about two fees before you are even.
      say('think', 'info', 'think.breakeven', { name, pct: `${(((1 + feeRate) / (1 - feeRate) - 1) * 100).toFixed(1)}%` });
    }
    const change = i.changes[i.id] ?? 0;
    if (change >= BIG_MOVE) {
      const rumour = i.news?.tone === 'rumour' && i.news.effects.some((e) => e.target === i.id);
      say('think', 'warn', rumour ? 'think.rumour' : 'think.jump', { name, pct: pct0(change) });
    } else if (change <= -BIG_MOVE) {
      say('think', 'info', 'think.dip', { name, pct: pct0(change) });
    }
    const spread = diversification(i.after, i.prices);
    if (spread.label === 'one' || spread.label === 'concentrated') {
      const value = (id: string) => (i.after.shares[id] ?? 0) * (i.prices[id] ?? 0);
      const topId = Object.keys(i.after.shares).sort((a, b) => value(b) - value(a))[0]!;
      say('think', 'warn', 'think.concentrated', { pct: pct0(spread.topShare), name: i.name(topId) });
    } else if (spread.label === 'spread') {
      say('happened', 'good', 'spread.ok', { count: spread.count });
    }
    const total = totalValue(i.after, i.prices);
    if (total > 0 && i.after.cash / total < 0.1) say('think', 'info', 'think.lowCash');
  } else {
    say('happened', 'info', 'trade.sell', { qty: i.qty, name, price: fmtPrice(i.price), total: fmtPrice(gross - i.fee), fee: fmtPrice(i.fee) });
    const avg = avgCost(i.before.trades, i.id);
    const realised = (i.price - avg) * i.qty - i.fee;
    if (i.failedIds.has(i.id)) {
      say('happened', 'warn', 'sell.failed', { name });
    } else if (Math.abs(realised) < i.fee * 1.5) {
      say('happened', 'info', 'sell.even');
    } else {
      say('happened', realised > 0 ? 'good' : 'warn', realised > 0 ? 'sell.gain' : 'sell.loss', { avg: fmtPrice(avg), amount: money(Math.abs(realised)) });
    }
    if (i.round === i.config.drop.round) say('think', 'warn', 'think.soldDrop');
    if (Object.keys(i.after.shares).length === 0) say('think', 'info', 'think.allCash');
  }

  // Said once, when the fees first reach 1% of your starting money.
  const threshold = i.config.cash * 0.01;
  if (i.before.fees < threshold && i.after.fees >= threshold) {
    say('think', 'warn', 'think.fees', { fees: money(i.after.fees), pct: `${((i.after.fees / i.config.cash) * 100).toFixed(1)}%` });
  }
  return out;
}

export interface WeekInput {
  config: MarketConfig;
  /** The round just reached. */
  round: number;
  /** What you hold going into the new week (dividends not yet added). */
  portfolio: Portfolio;
  prevPrices: Record<string, number>;
  prices: Record<string, number>;
  dividendsPaid: number;
  news: NewsCard | undefined;
  name: (id: string) => string;
}

export function commentsAfterWeek(i: WeekInput): Comment[] {
  const { out, say } = maker(i.round);
  const held = Object.keys(i.portfolio.shares);
  const from = totalValue(i.portfolio, i.prevPrices);
  const to = totalValue(i.portfolio, i.prices);

  if (held.length === 0) {
    say('happened', 'info', 'week.cashOnly');
  } else {
    say('happened', to < from ? 'warn' : to > from ? 'good' : 'info', 'week.moved', { n: i.round, from: money(from), to: money(to), delta: signedMoney(to - from) });
    const driver = held
      .map((id) => ({
        id,
        delta: i.portfolio.shares[id]! * ((i.prices[id] ?? 0) - (i.prevPrices[id] ?? 0)),
        move: (i.prices[id] ?? 0) / (i.prevPrices[id] || 1) - 1,
      }))
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))[0]!;
    if (Math.abs(driver.delta) >= 1) {
      say('happened', 'info', 'week.driver', { name: i.name(driver.id), delta: signedMoney(driver.delta), pct: signedPct(driver.move) });
    }
  }

  const news = i.news;
  if (news?.fail) {
    const qty = i.portfolio.shares[news.fail] ?? 0;
    if (qty > 0) {
      const loss = qty * ((i.prevPrices[news.fail] ?? 0) - (i.prices[news.fail] ?? 0));
      say('happened', 'warn', 'week.failedHeld', { name: i.name(news.fail), qty, loss: money(loss) });
    } else {
      say('happened', 'info', 'week.failedNot', { name: i.name(news.fail) });
    }
  }
  if (news && held.length > 0 && news.effects.some((e) => e.target === 'market' && e.pct <= -0.1)) say('think', 'info', 'week.heldDrop');
  if (news?.tone === 'noise') say('think', 'info', 'week.noise');
  if (i.dividendsPaid > 0) say('happened', 'good', 'week.dividend', { amount: money(i.dividendsPaid) });
  return out;
}
