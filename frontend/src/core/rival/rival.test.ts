import { describe, expect, it } from 'vitest';
import { newLife, reduce, type LifeState } from '@/core/engine';
import { simulateKabir } from './index';

function playerAt(month: number, chapters: Record<number, number>): LifeState {
  return { ...reduce(newLife(9), { type: 'setup', goal: 'phone' }), month, chapterMonths: chapters };
}

describe("Kabir's parallel life", () => {
  it('follows the player calendar and takes every tempting choice', () => {
    const k = simulateKabir(playerAt(11, { 0: 0, 1: 0, 2: 1, 3: 3, 4: 5, 5: 7, 6: 10 }));
    expect(k.beats.map((b) => b.beat)).toEqual(['sneakers', 'goal_now', 'crack_loanapp', 'moneylender', 'tips', 'ponzi']);
    expect(k.state.month).toBe(11);
    expect(k.state.goal.id).toBe('phone');
    expect(k.state.flags.goal_done).toBe(true);
  });

  it('is deterministic', () => {
    const p = playerAt(6, { 0: 0, 1: 0, 2: 1, 3: 3 });
    expect(simulateKabir(p).state).toEqual(simulateKabir(p).state);
  });

  it('only does what has happened so far', () => {
    expect(simulateKabir(playerAt(0, { 0: 0, 1: 0 })).beats).toEqual([]);
  });
});
