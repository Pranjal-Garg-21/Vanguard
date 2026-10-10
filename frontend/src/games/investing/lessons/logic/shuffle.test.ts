import { describe, expect, it } from 'vitest';
import { rooms } from './content';
import { roomQuestions } from './room';
import { shuffleStable } from './shuffle';

describe('shuffleStable', () => {
  const items = ['a', 'b', 'c', 'd'];
  it('keeps every item exactly once and does not change the input', () => {
    const out = shuffleStable(items, 'q1');
    expect([...out].sort()).toEqual(items);
    expect(items).toEqual(['a', 'b', 'c', 'd']);
  });
  it('gives the same order every time for the same question', () => {
    expect(shuffleStable(items, 'q1')).toEqual(shuffleStable(items, 'q1'));
  });
  it('gives different questions different orders', () => {
    const orders = new Set(['q1', 'q2', 'q3', 'q4', 'q5', 'q6'].map((q) => shuffleStable(items, q).join('')));
    expect(orders.size).toBeGreaterThan(1);
  });
  it('the right answer is not first in most real choice questions (so "always pick the first" does not work)', () => {
    const choices = rooms.flatMap((r) => roomQuestions(r)).filter((q) => q.kind === 'choice');
    expect(choices.length).toBeGreaterThan(0);
    const firstIsRight = choices.filter((q) => shuffleStable(q.options ?? [], q.id)[0]!.id === q.correct).length;
    expect(firstIsRight).toBeLessThan(choices.length * 0.6);
  });
});
