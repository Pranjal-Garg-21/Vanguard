/**
 * Which documents this character is actually asked for. Pure. Owner: P3.
 *
 * The deck is not fixed. For an under-18 character the bank needs a guardian's
 * ID (minor account) and does NOT need a PAN card — so showing a PAN to a
 * 16-year-old and then bouncing it would teach something false, and showing
 * the guardian ID to a 21-year-old would make a correct answer wrong.
 */

import type { MiniGameContext } from '@/core/types';
import content from '@/content/scenarios/bank/document-hunt.json';

export type DocCard = (typeof content.cards)[number];

export const ADULT_AGE = 18;

/** Ages come from §7.2 Q1: school 17, college 19, first earner 21. */
export function characterAge(ctx: MiniGameContext): number {
  const persona = ctx.persona as { age?: number; lifeStage?: string };
  if (typeof persona.age === 'number') return persona.age;
  switch (persona.lifeStage) {
    case 'school_student':
      return 17;
    case 'college_student':
      return 19;
    default:
      return 21;
  }
}

export function deckForAge(cards: readonly DocCard[], age: number): DocCard[] {
  const isMinor = age < ADULT_AGE;
  return cards.filter((card) => {
    if ('requiresMinor' in card && card.requiresMinor) return isMinor;
    // A minor account does not need PAN, so never put it in a minor's room.
    if (card.id === 'pan' && isMinor) return false;
    return true;
  });
}
