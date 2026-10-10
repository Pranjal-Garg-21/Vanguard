import { describe, expect, it } from 'vitest';

import { selectCards, type TriageCard } from './deck';

const cards: TriageCard[] = [
  { id: 'c1', textKey: 'c1' },
  { id: 'c2', textKey: 'c2', minLevel: 3 },
  { id: 'c3', textKey: 'c3', minLevel: 2 },
];

describe('deck selection', () => {
  it('shows only level-1 cards at level 1, and everything at level 3', () => {
    expect(selectCards(cards, 1, 42).map((c) => c.id)).toEqual(['c1']);
    expect(selectCards(cards, 3, 42).map((c) => c.id)).toEqual(['c1', 'c2', 'c3']);
  });

  it('caps the deck, so Swipe Sort can stop at 8 cards', () => {
    expect(selectCards(cards, 3, 42, { maxCards: 2 })).toHaveLength(2);
  });
});
