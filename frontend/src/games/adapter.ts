/**
 * Bridging Paisapur's LifeState to the MiniGame contract. Owner: P3.
 *
 * The mini-games were written against `MiniGameContext` from `core/types`,
 * which is persona-shaped; Paisapur tracks a richer `LifeState`. This is the
 * one place that translates, so neither side has to know about the other.
 *
 * Anything a game reads from `stateSlice` comes from the real life, so a game
 * opened inside the story is about the player's actual money. The Arcade
 * passes nothing, and the games fall back to persona defaults.
 */

import { emergencyFund, incomeFor, ITEMS, monthlyNeeds, needsCost, priceOf, type LifeState } from '@/core/engine';
import type { Level, MiniGameContext, PlayMode } from '@/core/types';
import { everydayGames } from './everyday';
import type { StoryEconomy } from './everyday/shared/economics';
import type { UiMiniGame } from './everyday/shared/game';

const byId = new Map<string, UiMiniGame>(everydayGames.map((g) => [g.id, g]));

/**
 * A registered game that carries a React component.
 *
 * `games/registry.ts` is the lookup for the `MiniGame` contract; this is the
 * lookup for the thing the UI actually mounts. See the note on `UiMiniGame`
 * about why those are not the same object.
 */
export function getUiGame(id: string): UiMiniGame | undefined {
  return byId.get(id);
}

export function listUiGames(): UiMiniGame[] {
  return everydayGames;
}

/** Paisapur's two life stages map onto the plan's three (§7.2 Q1). */
function lifeStageOf(life: LifeState): string {
  return life.lifeStage === 'school' ? 'school_student' : 'college_student';
}

/**
 * Where the money comes from decides which cards a game shows. A player who
 * helps in the family shop should be asked about stock, not about hostel mess
 * fees (§12.6: "cards are drawn from the persona's life").
 */
function circumstanceOf(life: LifeState): string {
  switch (life.source) {
    case 'tutoring':
      return 'part_time_earner';
    case 'shop':
      return 'young_entrepreneur';
    default:
      return 'dependent';
  }
}

export function personaFromLife(life: LifeState): Record<string, unknown> {
  return {
    lifeStage: lifeStageOf(life),
    circumstance: circumstanceOf(life),
    // Paisapur does not track an age; the plan's school/college ages decide
    // whether the bank asks for a guardian's ID or a PAN card.
    age: life.lifeStage === 'school' ? 17 : 19,
    goal: life.goal.id,
    moneyPersonality: 'saver',
    maturity: life.chapter >= 4 ? 'navigator' : life.chapter >= 2 ? 'builder' : 'starter',
  };
}

/** Story goals the games know under another name (their content is keyed by these). */
const GOAL_CONTENT_KEY: Record<string, string> = { fees: 'coaching', stall: 'business' };

/** Spending Detective's categories for the story's shop items. */
const ITEM_CATEGORY: Record<string, string> = {
  bus_pass: 'transport',
  recharge: 'recharge',
  chai: 'chai',
  snacks: 'chai',
  game_topup: 'games',
};

/**
 * Everything a game needs to talk about the player's real money, in the story's
 * own numbers. Games prefer this over their persona defaults (economics.ts).
 */
export function storyEconomy(life: LifeState): StoryEconomy {
  return {
    month: life.month,
    income: incomeFor(life, life.month + 1),
    cash: life.cash,
    bank: life.bank.balance,
    emergency: emergencyFund(life),
    bills: monthlyNeeds(life).map((item) => ({
      id: item.id,
      textKey: `paisapur.item.${item.id}`,
      amount: priceOf(item, life.month),
    })),
    goal: {
      id: GOAL_CONTENT_KEY[life.goal.id] ?? life.goal.id,
      storyId: life.goal.id,
      textKey: `paisapur.goal.${life.goal.id}`,
      amount: life.goal.target,
    },
    prices: Object.fromEntries(ITEMS.map((item) => [item.id, priceOf(item, life.month)])),
  };
}

/**
 * The player's real spending, shaped as Spending Detective reads it: purchases,
 * repairs and money lost, never income, deposits or savings moves.
 */
export function spendingLedger(life: LifeState): { amount: number; reasonKey: string; category: string }[] {
  const out: { amount: number; reasonKey: string; category: string }[] = [];
  // Last month, the most recent full one: the game calls it "this month".
  for (const entry of life.ledger) {
    if (entry.month !== Math.max(0, life.month - 1)) continue;
    if (entry.amount >= 0 || entry.where === 'pot') continue;
    const [kind, detail] = entry.reason.split(':');
    if (kind === 'buy' && detail) {
      out.push({ amount: -entry.amount, reasonKey: `paisapur.item.${detail}`, category: ITEM_CATEGORY[detail] ?? 'other' });
    } else if (kind === 'repair' || kind === 'scam' || kind === 'ponzi' || kind === 'fire' || kind === 'lend') {
      out.push({ amount: -entry.amount, reasonKey: `paisapur.reason.${kind}`, category: 'other' });
    }
  }
  return out;
}

export function contextFromLife(
  life: LifeState,
  opts: { level?: Level; mode?: PlayMode; params?: Record<string, unknown> } = {},
): MiniGameContext {
  return {
    persona: personaFromLife(life),
    level: opts.level ?? 1,
    // The life's own seed, so replaying a month deals the same cards (§9.2).
    seed: life.seed + life.month,
    stateSlice: {
      money: {
        cash: life.cash,
        bank: life.bank.balance,
        savingsJars: { emergency: emergencyFund(life) },
        monthlyIncome: { amount: incomeFor(life, life.month + 1) },
      },
      // Spending Detective builds the month from this when it is rich enough.
      ledger: spendingLedger(life),
      needsCost: needsCost(life),
      story: storyEconomy(life),
    } as MiniGameContext['stateSlice'],
    mode: opts.mode ?? 'lifepath',
    params: opts.params,
  };
}
