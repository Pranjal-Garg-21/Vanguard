import { describe, expect, it } from 'vitest';
import type { GameEvent } from '@shared/telemetry/event.ts';
import { summariseEvents } from './stats';

const DAY = 86400;
const ev = (ts: number, correct: boolean | null, concept = 'a') => ({ ts, correct, concept }) as GameEvent;

describe('summariseEvents', () => {
  const now = 100 * DAY + 100;
  it('is all zero with no events', () => {
    expect(summariseEvents([], now)).toEqual({ answers: 0, correct: 0, xp: 0, streak: 0, concepts: 0 });
  });
  it('counts XP, concepts and a streak that may end yesterday', () => {
    const s = summariseEvents([ev(99 * DAY, true), ev(98 * DAY, true, 'b'), ev(98 * DAY, false), ev(96 * DAY, true)], now);
    expect(s).toMatchObject({ answers: 4, correct: 3, xp: 30, streak: 2, concepts: 2 });
  });
  it('resets the streak after a missed day', () => {
    expect(summariseEvents([ev(97 * DAY, true)], now).streak).toBe(0);
  });
});
