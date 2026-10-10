/**
 * Which surprise arrives, and whether the character can absorb it. Pure.
 * Owner: P3.
 */

import type { MiniGameContext, Persona } from '@/core/types';
import { deriveSeed, makeRng } from '@/runtime/verbs/shared/rng';
import { billsTotalFor } from '../../shared/economics';
import { matchesPersona, type ContextFilter } from '../../shared/game';

export type Shock = {
  id: string;
  amount: number;
  hookKey: string;
  personaFilter?: ContextFilter;
};

/**
 * Pick the shock that fits this character, seeded so a rewind replays the same
 * one — §9.2 requires outside events to arrive identically in every timeline.
 *
 * Shocks with a persona filter are preferred over the generic fallback: a
 * delivery rider's bike breaking is a sharper lesson than a forgotten fee.
 */
export function pickShock(
  shocks: readonly Shock[],
  ctx: MiniGameContext,
): Shock | undefined {
  const eligible = shocks.filter((s) => matchesPersona(s.personaFilter, ctx));
  if (eligible.length === 0) return shocks[shocks.length - 1];

  const specific = eligible.filter((s) => s.personaFilter !== undefined);
  const pool = specific.length > 0 ? specific : eligible;
  const rng = makeRng(deriveSeed(ctx.seed, 'sm03:shock'));
  return pool[Math.floor(rng() * pool.length)];
}

/** What the character has set aside for surprises right now. */
export function bufferFromContext(ctx: MiniGameContext): number {
  const slice = ctx.stateSlice as {
    money?: { savingsJars?: { emergency?: number } };
  };
  const buffer = slice?.money?.savingsJars?.emergency;
  return typeof buffer === 'number' ? buffer : 0;
}

/**
 * The targets offered in the reflection, as multiples of a month of needs.
 * §12.6 suggests one month of needs as the example.
 */
export function emergencyTargets(
  persona: Persona,
  multiples: readonly number[],
): { months: number; amount: number; labelKey: string }[] {
  const monthOfNeeds = billsTotalFor(persona);
  const labels: Record<string, string> = {
    '0.5': 'sm03.reflect.half_month',
    '1': 'sm03.reflect.one_month',
    '2': 'sm03.reflect.two_months',
  };
  return multiples.map((months) => ({
    months,
    // Rounded to ₹50 so the number is one a student can picture counting.
    amount: Math.round((monthOfNeeds * months) / 50) * 50,
    labelKey: labels[String(months)] ?? 'sm03.reflect.one_month',
  }));
}
