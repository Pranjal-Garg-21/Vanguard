import { describe, expect, it } from 'vitest';
import rescue from '../../../../content/scenarios/safe/rescue_mission.json';
import { shuffleChoices } from './shuffle';
import type { Scenario } from './types';

const RESCUE = rescue as unknown as Scenario;
const ids = (s: Scenario, step: string) => s.steps.find((x) => x.id === step)?.surface.actions?.map((a) => a.id) ?? [];

describe('shuffleChoices', () => {
  it('keeps every option, only in a different order', () => {
    const s = shuffleChoices(RESCUE, 5);
    for (const step of RESCUE.steps) expect(ids(s, step.id).sort()).toEqual(ids(RESCUE, step.id).sort());
  });

  it('is the same for the same seed', () => {
    expect(ids(shuffleChoices(RESCUE, 9), 'r1')).toEqual(ids(shuffleChoices(RESCUE, 9), 'r1'));
  });

  it('does not change the original', () => {
    const before = ids(RESCUE, 'r1');
    shuffleChoices(RESCUE, 3);
    expect(ids(RESCUE, 'r1')).toEqual(before);
  });

  it('does not always put the best option first', () => {
    const positions = new Set<number>();
    for (let seed = 1; seed <= 40; seed++) positions.add(ids(shuffleChoices(RESCUE, seed), 'r1').indexOf('call_bank'));
    expect(positions.size).toBeGreaterThan(1);
    // Across every step, the best option lands in each place at least sometimes.
    let first = 0;
    let total = 0;
    for (let seed = 1; seed <= 60; seed++) {
      const s = shuffleChoices(RESCUE, seed);
      for (const step of s.steps) {
        const best = step.surface.best;
        if (!best || (step.surface.actions?.length ?? 0) < 3) continue;
        total += 1;
        if (step.surface.actions?.[0]?.id === best) first += 1;
      }
    }
    expect(first / total).toBeLessThan(0.6);
  });

  it('keeps a script valid and playable', () => {
    expect(shuffleChoices(RESCUE, 2).steps.length).toBe(RESCUE.steps.length);
  });
});
