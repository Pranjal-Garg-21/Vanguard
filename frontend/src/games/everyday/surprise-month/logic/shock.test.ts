import { describe, expect, it } from 'vitest';

import { bufferFromContext, emergencyTargets, pickShock, type Shock } from './shock';
import type { MiniGameContext } from '@/core/types';
import content from '@/content/scenarios/save/surprise-month.json';

const shocks = content.shocks as Shock[];

const ctxFor = (persona: Record<string, unknown>, seed = 1): MiniGameContext => ({
  persona,
  level: 1,
  seed,
  stateSlice: {},
  mode: 'arcade',
});

describe('choosing the shock', () => {
  it('gives a delivery rider the one that stops them earning', () => {
    const shock = pickShock(shocks, ctxFor({ circumstance: 'young_entrepreneur' }));
    expect(shock?.id).toBe('vehicle');
  });

  it('lands a contributor’s shock on someone else in the family', () => {
    const shock = pickShock(shocks, ctxFor({ circumstance: 'family_contributor' }));
    expect(shock?.id).toBe('medicine');
  });

  it('always finds something, even for a persona nothing matches', () => {
    expect(pickShock(shocks, ctxFor({ lifeStage: 'first_earner' }))).toBeDefined();
  });

  it('picks the same shock for the same seed, so a rewind replays it', () => {
    const persona = { lifeStage: 'college_student' };
    const first = pickShock(shocks, ctxFor(persona, 4242));
    const again = pickShock(shocks, ctxFor(persona, 4242));
    expect(again?.id).toBe(first?.id);
  });
});

describe('the buffer', () => {
  it('is zero when the character has no emergency jar yet', () => {
    expect(bufferFromContext(ctxFor({}))).toBe(0);
  });

  it('reads the real jar when the runtime passes one', () => {
    const ctx = { ...ctxFor({}), stateSlice: { money: { savingsJars: { emergency: 2500 } } } };
    expect(bufferFromContext(ctx as MiniGameContext)).toBe(2500);
  });
});

describe('the targets offered afterwards', () => {
  const persona = { lifeStage: 'college_student', circumstance: 'dependent' };

  it('scales to a month of that character’s own needs', () => {
    const targets = emergencyTargets(persona, [0.5, 1, 2]);
    expect(targets).toHaveLength(3);
    const [half, one, two] = targets;
    expect(one!.amount).toBeGreaterThan(half!.amount);
    expect(two!.amount).toBeGreaterThan(one!.amount);
    // Two months is twice one month, give or take the ₹50 rounding.
    expect(Math.abs(two!.amount - one!.amount * 2)).toBeLessThanOrEqual(50);
  });

  it('rounds to amounts a student can picture counting', () => {
    for (const target of emergencyTargets(persona, [0.5, 1, 2])) {
      expect(target.amount % 50).toBe(0);
    }
  });
});
