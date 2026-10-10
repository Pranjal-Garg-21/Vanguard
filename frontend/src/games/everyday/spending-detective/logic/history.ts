/**
 * The month's transaction history. Pure. Owner: P3.
 *
 * DATA RULE (§12.6): every transaction here is generated. Nothing is read from
 * a real phone, bank account or message, ever. When the runtime passes a real
 * `stateSlice.ledger` the history is built from the student's own LifePath
 * choices; otherwise it is synthesised from the persona and the seed so the
 * Arcade round is still their character's month rather than a stranger's.
 */

import type { MiniGameContext } from '@/core/types';
import { deriveSeed, makeRng, type Rng } from '@/runtime/verbs/shared/rng';
import { disposableOf } from '../../shared/economics';

export type Txn = {
  id: string;
  textKey: string;
  category: string;
  amount: number;
  /** How many times this happened in the month. */
  count: number;
  /** Repeated small payments are the thing the game is hunting. */
  repeated: boolean;
};

export type CategoryTotal = {
  category: string;
  total: number;
  share: number;
};

type LedgerEntry = { amount?: number; reasonKey?: string; category?: string };

/** Templates for a synthesised month, scaled to what the character can spend. */
const REPEATS = [
  { id: 'chai', textKey: 'sm02.txn.chai', category: 'chai', unit: 20, min: 12, max: 24 },
  { id: 'samosa', textKey: 'sm02.txn.samosa', category: 'chai', unit: 15, min: 4, max: 10 },
  { id: 'game_topup', textKey: 'sm02.txn.game_topup', category: 'games', unit: 49, min: 2, max: 8 },
  { id: 'auto', textKey: 'sm02.txn.auto', category: 'transport', unit: 40, min: 3, max: 9 },
  { id: 'print', textKey: 'sm02.txn.print', category: 'other', unit: 10, min: 3, max: 8 },
] as const;

const ONE_OFFS = [
  { id: 'recharge', textKey: 'sm02.txn.recharge', category: 'recharge', unit: 199 },
  { id: 'delivery', textKey: 'sm02.txn.delivery', category: 'delivery', unit: 180 },
  { id: 'cinema', textKey: 'sm02.txn.cinema', category: 'other', unit: 180 },
  { id: 'gift', textKey: 'sm02.txn.gift', category: 'other', unit: 250 },
  { id: 'repair', textKey: 'sm02.txn.repair', category: 'other', unit: 150 },
] as const;

const between = (rng: Rng, min: number, max: number) =>
  min + Math.floor(rng() * (max - min + 1));

/**
 * Build the month. Repeats are scaled so the total stays inside what the
 * character actually had to spend — a history that exceeds their income would
 * teach nothing except that the game is not paying attention.
 */
export function synthesiseHistory(ctx: MiniGameContext): Txn[] {
  const rng = makeRng(deriveSeed(ctx.seed, 'sm02:history'));
  // What the character really had left after needs: the story's figure, or the persona's in the Arcade.
  const budget = Math.max(400, disposableOf(ctx));
  const out: Txn[] = [];

  for (const template of REPEATS) {
    const count = between(rng, template.min, template.max);
    if (count <= 0) continue;
    out.push({
      id: template.id,
      textKey: template.textKey,
      category: template.category,
      amount: template.unit,
      count,
      repeated: true,
    });
  }

  // Roughly a third of the month goes on one-off things.
  const oneOffCount = between(rng, 2, 4);
  for (const template of ONE_OFFS.slice(0, oneOffCount)) {
    out.push({
      id: template.id,
      textKey: template.textKey,
      category: template.category,
      amount: template.unit,
      count: 1,
      repeated: false,
    });
  }

  return scaleToBudget(out, budget);
}

/**
 * Fit the month inside what the character actually had to spend.
 *
 * Repeats get the larger share deliberately: a month whose repeated payments
 * have been trimmed away has no leak in it, and finding the leak is the entire
 * activity. So the cheapest-unit repeat is funded first — ₹20 twenty-two times
 * is a better lesson than ₹200 twice — and the one-off items fill whatever is
 * left, cheapest first.
 */
export const REPEAT_SHARE = 0.6;

export function scaleToBudget(txns: readonly Txn[], budget: number): Txn[] {
  const repeats = txns.filter((t) => t.repeated).map((t) => ({ ...t }));
  const oneOffs = txns.filter((t) => !t.repeated).map((t) => ({ ...t }));

  const kept: Txn[] = [];
  let repeatBudget = Math.round(budget * REPEAT_SHARE);

  // Cheapest unit first, so the most countable habit survives.
  for (const txn of [...repeats].sort((a, b) => a.amount - b.amount)) {
    if (txn.amount > repeatBudget) continue;
    const affordable = Math.floor(repeatBudget / txn.amount);
    const count = Math.min(txn.count, affordable);
    if (count < 1) continue;
    kept.push({ ...txn, count });
    repeatBudget -= txn.amount * count;
  }

  let left = budget - totalOf(kept);
  for (const txn of [...oneOffs].sort((a, b) => a.amount - b.amount)) {
    if (txn.amount > left) continue;
    kept.push(txn);
    left -= txn.amount;
  }

  return kept;
}

/**
 * Group real payments by what they were for. Each line keeps its count and an
 * average unit price, so `amount × count` is what was really spent on it.
 * Entries without a reason are skipped rather than lumped together: an
 * unlabelled "everything else ×23" line hides the very leaks this game hunts.
 */
export function fromLedger(entries: readonly LedgerEntry[]): Txn[] {
  const grouped = new Map<string, { txn: Txn; total: number }>();
  for (const entry of entries) {
    const amount = Math.abs(entry.amount ?? 0);
    if (amount === 0 || !entry.reasonKey) continue;
    const key = entry.reasonKey;
    const existing = grouped.get(key);
    if (existing) {
      existing.total += amount;
      existing.txn.count += 1;
      existing.txn.repeated = true;
      existing.txn.amount = Math.round(existing.total / existing.txn.count);
      continue;
    }
    grouped.set(key, {
      total: amount,
      txn: { id: key, textKey: key, category: entry.category ?? 'other', amount, count: 1, repeated: false },
    });
  }
  return [...grouped.values()].map((g) => g.txn);
}

/** Whether the month comes from the character's own story spending, or is generated. */
export function historySource(ctx: MiniGameContext): 'ledger' | 'generated' {
  const ledger = (ctx.stateSlice as { ledger?: LedgerEntry[] })?.ledger;
  // A handful of entries is not a month; fall back rather than show a stub.
  return Array.isArray(ledger) && ledger.filter((e) => e.reasonKey).length >= 6 ? 'ledger' : 'generated';
}

export function historyFor(ctx: MiniGameContext): Txn[] {
  if (historySource(ctx) === 'ledger') return fromLedger((ctx.stateSlice as { ledger: LedgerEntry[] }).ledger);
  return synthesiseHistory(ctx);
}

export const lineTotal = (txn: Txn) => txn.amount * txn.count;
export const totalOf = (txns: readonly Txn[]) => txns.reduce((sum, t) => sum + lineTotal(t), 0);

export function categoryTotals(txns: readonly Txn[]): CategoryTotal[] {
  const total = totalOf(txns);
  const byCategory = new Map<string, number>();
  for (const txn of txns) {
    byCategory.set(txn.category, (byCategory.get(txn.category) ?? 0) + lineTotal(txn));
  }
  return [...byCategory.entries()]
    .map(([category, amount]) => ({
      category,
      total: amount,
      share: total > 0 ? amount / total : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

/** The repeated items, biggest first — the leaks the student then ranks. */
export function leaks(txns: readonly Txn[]): Txn[] {
  return txns.filter((t) => t.repeated && t.count > 1).sort((a, b) => lineTotal(b) - lineTotal(a));
}

/** ₹440 a month is ₹5,280 a year. The multiplication is the lesson. */
export const annualise = (monthly: number) => monthly * 12;

/** What halving one leak returns over the projection window. */
export const projectHalving = (monthly: number, months: number) =>
  Math.round((monthly / 2) * months);
