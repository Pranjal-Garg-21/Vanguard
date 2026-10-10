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

import { emergencyFund, incomeFor, needsCost, type LifeState } from '@/core/engine';
import type { Level, MiniGameContext, PlayMode } from '@/core/types';
import { everydayGames } from './everyday';
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

export function contextFromLife(
  life: LifeState,
  opts: { level?: Level; mode?: PlayMode } = {},
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
        monthlyIncome: { amount: incomeFor(life, life.month) },
      },
      // Spending Detective builds the month from this when it is rich enough.
      ledger: life.ledger,
      needsCost: needsCost(life),
    } as MiniGameContext['stateSlice'],
    mode: opts.mode ?? 'lifepath',
  };
}
