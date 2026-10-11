/** What the Time Machine saves (your goal, plan and split), and a strict reader for it. */
import content from '@/content/scenarios/invest/time_machine.json';
import type { Mix } from './mix';

export interface TimeMachineSave {
  goalId: string;
  years: number;
  initial: number;
  monthly: number;
  mix: Mix;
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const inRange = (v: unknown, min: number, max: number, step = 1): v is number =>
  typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max && Number.isInteger(v / step);

export function parseTimeMachineSave(value: unknown): TimeMachineSave | null {
  if (!isRecord(value) || !isRecord(value.mix)) return null;
  const { goalId, years, initial, monthly } = value;
  if (typeof goalId !== 'string' || !content.goals.some((g) => g.id === goalId)) return null;
  if (!inRange(years, 1, 20) || !inRange(initial, 0, 50000, 5000) || !inRange(monthly, 0, 5000, 500)) return null;
  const { steady_box: s, mixed_basket: m, bumpy_ride: b } = value.mix;
  if (!inRange(s, 0, 100, 5) || !inRange(m, 0, 100, 5) || !inRange(b, 0, 100, 5) || s + m + b !== 100) return null;
  return { goalId, years, initial, monthly, mix: { steady_box: s, mixed_basket: m, bumpy_ride: b } };
}
