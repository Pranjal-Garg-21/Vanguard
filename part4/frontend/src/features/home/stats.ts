import type { GameEvent } from '@shared/telemetry/event.ts';

const DAY = 24 * 60 * 60;
const XP_PER_CORRECT = 10;

export type PlayerStats = { answers: number; correct: number; xp: number; streak: number; concepts: number };

/** Dashboard numbers computed from this player's events. Streak counts consecutive days up to today (or yesterday). */
export function summariseEvents(events: GameEvent[], nowSec = Date.now() / 1000): PlayerStats {
  const correct = events.filter((e) => e.correct === true).length;
  const days = new Set(events.map((e) => Math.floor(e.ts / DAY)));
  const today = Math.floor(nowSec / DAY);
  let day = days.has(today) ? today : today - 1;
  let streak = 0;
  while (days.has(day)) {
    streak += 1;
    day -= 1;
  }
  return {
    answers: events.length,
    correct,
    xp: correct * XP_PER_CORRECT,
    streak,
    concepts: new Set(events.filter((e) => e.correct === true).map((e) => e.concept)).size,
  };
}
