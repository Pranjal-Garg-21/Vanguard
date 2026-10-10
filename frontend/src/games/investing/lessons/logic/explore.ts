/**
 * Pure maths behind the lesson "explore" widgets and the list of what the lesson format allows.
 * No React here, so it can be tested and reused by the games later.
 */
import { breakevenGain, compoundAmount, simpleAmount } from '@/core/market/finance';

/** Widgets a lesson may name in an `explore` block. Add the id here when you build the component. */
export const EXPLORE_WIDGETS = ['fall_rise', 'simple_vs_compound'] as const;
export type ExploreWidgetId = (typeof EXPLORE_WIDGETS)[number];

/** Pictures a lesson may name in a `visual` field. The screen draws each one. */
export const VISUALS = ['samosa_stall', 'tea_stall', 'piggy_bank', 'mango_trees'] as const;
export type VisualId = (typeof VISUALS)[number];

/** fall_rise: what you hold after a fall, and the rise needed to get back. `fall` is a fraction (0.5 = 50%). */
export function fallAndRise(start: number, fall: number) {
  const f = Math.min(Math.max(fall, 0), 0.95);
  return {
    afterFall: start * (1 - f),
    needGain: breakevenGain(f),
    /** What a rise equal to the fall would give (the common mistake). */
    afterSameRise: start * (1 - f) * (1 + f),
  };
}

export interface GrowthPoint {
  year: number;
  simple: number;
  compound: number;
}

/** simple_vs_compound: value at the end of each year, from year 0 to `years`. */
export function growthSeries(principal: number, rate: number, years: number): GrowthPoint[] {
  return Array.from({ length: years + 1 }, (_, year) => ({
    year,
    simple: simpleAmount(principal, rate, year),
    compound: compoundAmount(principal, rate, year),
  }));
}
