/**
 * The Bag: what the player carries, worked out from the game state (it is
 * never stored separately, so it can't drift out of sync). Three pockets,
 * like the classic handheld bag: key items, your things, and papers.
 * Pure.
 */
import { depositValue, gstIn, itemById, resaleValue, type LifeState } from '@/core/engine';
import { assetDef, priceAt, type AssetId } from '@/core/market';

export type Pocket = 'key' | 'things' | 'papers';

export const POCKETS: Pocket[] = ['key', 'things', 'papers'];

export type BagItem = {
  /** Stable key for lists. */
  key: string;
  pocket: Pocket;
  icon: string;
  /** Translation key for the name and description (`bag.item.<id>.name` / `.desc`). */
  id: string;
  /** Values for the description's {placeholders}. */
  vars: Record<string, string | number>;
  /** What "Use" does, if anything. */
  use?: 'journal' | 'wallet';
};

const GOAL_ICON: Record<string, string> = {
  trip: '📸',
  cycle: '🚲',
  fees: '📜',
  phone: '📱',
  stall: '🔑',
  laptop: '💻',
  bike: '🏍️',
};
const THING_ICON: Record<string, string> = { sneakers: '👟', headphones: '🎧', poster: '🖼️' };

type Fmt = (n: number) => string;

export function bagContents(s: LifeState, fmt: Fmt): BagItem[] {
  const items: BagItem[] = [];
  const add = (pocket: Pocket, icon: string, id: string, vars: Record<string, string | number> = {}, key = id, use?: BagItem['use']) =>
    items.push({ key, pocket, icon, id, vars, use });

  // ── Key items ──
  add('key', '👛', 'wallet', { cash: fmt(s.cash) }, 'wallet', 'wallet');
  if (s.flags.met_prof) add('key', '📔', 'journal', { seen: Object.keys(s.journal).length }, 'journal', 'journal');
  if (s.flags.has_docs) add('key', '🪪', 'documents');
  if (s.bank.open) add('key', '💳', 'debit_card', { balance: fmt(s.bank.balance) });
  const upi = s.ledger.filter((e) => e.where === 'bank' && e.amount < 0 && e.reason.startsWith('buy:')).slice(-3);
  add('key', '📲', s.bank.upi ? 'phone_upi' : 'phone', {
    recent: upi.length ? upi.map((e) => `${fmt(-e.amount)}`).join(', ') : '—',
    cracked: s.flags.phone_cracked ? 1 : 0,
  });
  if (s.badges.length) add('key', '🏅', 'badge_case', { n: s.badges.length });

  // ── Your things (and what they're worth now) ──
  (s.owned ?? []).forEach((o, i) => {
    const goal = o.id.startsWith('goal:') ? o.id.slice(5) : null;
    const id = goal ? `goal_${goal}` : `thing_${o.id}`;
    add('things', goal ? (GOAL_ICON[goal] ?? '🎁') : (THING_ICON[o.id] ?? '🛍️'), id, {
      price: fmt(o.price),
      month: o.month,
      now: fmt(resaleValue(o, s.month)),
    }, `${o.id}-${i}`);
  });

  // ── Papers ──
  for (const e of s.ledger.filter((x) => x.reason.startsWith('buy:') && x.amount < 0).slice(-5).reverse()) {
    const item = itemById(e.reason.slice(4));
    if (!item) continue;
    add('papers', '🧾', 'receipt', {
      item: item.id,
      price: fmt(-e.amount),
      gst: fmt(gstIn(-e.amount, item.gst)),
      rate: item.gst,
      month: e.month,
    }, `receipt-${item.id}-${e.month}-${e.amount}`);
  }
  for (const d of s.deposits) add('papers', '🔐', 'fd', { amount: fmt(d.amount), now: fmt(depositValue(d, s.month)), month: d.startMonth + d.months }, d.id);
  for (const b of s.bonds) add('papers', '🌉', 'bond', { amount: fmt(b.amount), now: fmt(depositValue(b, s.month)), month: b.startMonth + b.months }, b.id);
  for (const l of s.loans) {
    add('papers', l.kind === 'card' ? '💳' : '📄', l.kind === 'card' ? 'card_statement' : 'loan', {
      kind: l.kind,
      balance: fmt(l.balance),
      emi: fmt(l.emi),
      months: l.monthsLeft,
      rate: (l.monthlyRate * 100).toFixed(1),
      missed: l.missed,
    }, l.id);
  }
  const held = Object.entries(s.holdings).filter(([, h]) => h && h.units > 0) as [AssetId, { units: number; invested: number }][];
  if (held.length) {
    const value = held.reduce((sum, [id, h]) => sum + h.units * priceAt(s.seed, id, s.month), 0);
    const invested = held.reduce((sum, [, h]) => sum + h.invested, 0);
    add('papers', '📈', 'statement', {
      count: held.length,
      kinds: [...new Set(held.map(([id]) => assetDef(id).kind))].length,
      value: fmt(value),
      invested: fmt(invested),
    }, 'statement');
  }
  if (s.insured) add('papers', '☂️', 'policy');
  return items;
}
