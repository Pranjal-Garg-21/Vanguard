import { describe, expect, it } from 'vitest';

import { monthsToReach } from './goal';

describe('months to reach a goal', () => {
  it('rounds up, because a part month is still a month', () => {
    expect(monthsToReach(25000, 500)).toBe(50);
    expect(monthsToReach(25000, 2000)).toBe(13); // 12.5 -> 13
  });

  it('returns undefined when the goal can never be reached', () => {
    expect(monthsToReach(1000, 0)).toBeUndefined();
    expect(monthsToReach(1000, -50)).toBeUndefined();
    expect(monthsToReach(0, 500)).toBeUndefined();
  });
});
