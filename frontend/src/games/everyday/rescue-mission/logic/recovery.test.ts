import { describe, expect, it } from 'vitest';

import { recoveryChance } from './recovery';
import { scoreOrder, type RankItem } from '@/runtime/verbs/rank';
import rescue from '@/content/scenarios/protect/rescue-mission.json';

const steps: RankItem[] = rescue.steps.map((s) => ({
  id: s.id,
  textKey: s.textKey,
  value: s.value,
}));

describe('the six recovery steps', () => {
  it('puts 1930 first and orders the rest uniquely', () => {
    const values = rescue.steps.map((s) => s.value);
    expect(rescue.steps).toHaveLength(6);
    expect(new Set(values).size).toBe(6);
    expect([...values].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(rescue.steps.find((s) => s.value === 1)?.id).toBe('call_1930');
  });

  it('keeps the dashboard Help card in the same order as the game', () => {
    // If the card drifts from the game's ordering, the student is taught one
    // order and handed another on the home screen.
    const correct = [...rescue.steps].sort((a, b) => a.value - b.value).map((s) => s.textKey);
    expect(rescue.helpCard.stepKeys).toEqual(correct);
  });
});

describe('recovery chance', () => {
  it('rewards being fast as well as right', () => {
    const fast = recoveryChance(1, 20_000);
    const slow = recoveryChance(1, 300_000);
    expect(fast).toBeGreaterThan(slow);
    expect(fast).toBe(1); // 0.2 + 0.5 + 0.3
    expect(slow).toBeCloseTo(0.7, 10); // the speed term floors at 0
  });

  it('never returns zero, because reporting late still helps', () => {
    // This is the `too_late_to_report` misconception: the floor must not be 0.
    expect(recoveryChance(0, 600_000)).toBe(rescue.recovery.baseChance);
    expect(recoveryChance(0, 600_000)).toBeGreaterThan(0);
  });

  it('weights getting the order right above guessing quickly', () => {
    expect(recoveryChance(1, 300_000)).toBeGreaterThan(recoveryChance(0, 0));
  });

  it('stays within 0 and 1 for absurd inputs', () => {
    for (const [accuracy, ms] of [[5, -999], [-3, 1e9], [1, 0], [0, 0]] as const) {
      const chance = recoveryChance(accuracy, ms);
      expect(chance).toBeGreaterThanOrEqual(0);
      expect(chance).toBeLessThanOrEqual(1);
    }
  });

  it('places a near-miss between perfect and random', () => {
    const ids = steps.map((s) => s.id);
    const swapped = [ids[0]!, ids[2]!, ids[1]!, ...ids.slice(3)];
    const near = scoreOrder(swapped, steps, 'asc', 30_000);
    expect(near.inversions).toBe(1);
    expect(recoveryChance(near.accuracy, 30_000)).toBeLessThan(recoveryChance(1, 30_000));
    expect(recoveryChance(near.accuracy, 30_000)).toBeGreaterThan(recoveryChance(0, 30_000));
  });
});
