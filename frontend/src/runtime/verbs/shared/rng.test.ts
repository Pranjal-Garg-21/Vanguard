import { describe, expect, it } from 'vitest';

import { deriveSeed, makeRng, shuffled } from './rng';

describe('seeded shuffling', () => {
  it('deals the same order for the same seed, so a rewind replays identically', () => {
    const deck = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const first = shuffled(deck, makeRng(deriveSeed(12345, 'triage')));
    const again = shuffled(deck, makeRng(deriveSeed(12345, 'triage')));
    const other = shuffled(deck, makeRng(deriveSeed(99999, 'triage')));

    expect(again).toEqual(first);
    expect(other).not.toEqual(first);
  });

  it('never loses or duplicates a card', () => {
    const deck = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const out = shuffled(deck, makeRng(deriveSeed(7, 'x')));
    expect([...out].sort()).toEqual([...deck].sort());
  });

  it('shuffles two activities in the same life differently', () => {
    const deck = ['a', 'b', 'c', 'd', 'e', 'f'];
    expect(shuffled(deck, makeRng(deriveSeed(777, 'triage')))).not.toEqual(
      shuffled(deck, makeRng(deriveSeed(777, 'rank:step1'))),
    );
  });
});
