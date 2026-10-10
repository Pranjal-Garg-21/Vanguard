/**
 * Gameplay event format, shared by the frontend (logEvent, outbox) and the
 * backend (ingest function). Owner: P5. Changes need review from P5.
 *
 * Plain TypeScript with no dependencies, so both Vite and Deno can import it.
 * Matches Implementation.md §6.5. No names, no free text, no device identifiers.
 */

export const EVENT_SCHEMA_VERSION = 1;

export const GAME_MODES = ['lifepath', 'arcade', 'quickplay', 'daily', 'precheck', 'postcheck'] as const;
export type GameMode = (typeof GAME_MODES)[number];

export const STAGE_IDS = ['S0', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6'] as const;
export type StageId = (typeof STAGE_IDS)[number];

export type GameEvent = {
  /** Unique, time-sortable event ID (ULID). Makes uploads idempotent. */
  eid: string;
  /** Pseudonymous player ID created on the device. */
  pid: string;
  /** Class join code, or null for "play without a class". */
  class: string | null;
  mode: GameMode;
  /** Use case ID, e.g. "UC-SAFE-01". */
  activity: string;
  /** Concept ID from concepts.json, e.g. "upi_collect". */
  concept: string;
  /** Choice ID from the scenario. Never free text. */
  choice: string;
  correct: boolean | null;
  misconception: string | null;
  level: 1 | 2 | 3;
  lifeStage: string | null;
  stage: StageId | null;
  /** "main" or a branch ID from P1's timeline manager. */
  timeline: string;
  /** Seconds since epoch. */
  ts: number;
  v: typeof EVENT_SCHEMA_VERSION;
};

/** What a game passes to logEvent(); the platform fills in the rest. */
export type GameEventInput = Pick<GameEvent, 'activity' | 'concept' | 'choice'> &
  Partial<Pick<GameEvent, 'mode' | 'correct' | 'misconception' | 'level'>>;

/** IDs are short and code-like, which keeps free text out of events. */
const ID_PATTERN = /^[A-Za-z0-9_.:-]{1,64}$/;

const KEYS: (keyof GameEvent)[] = [
  'eid', 'pid', 'class', 'mode', 'activity', 'concept', 'choice', 'correct',
  'misconception', 'level', 'lifeStage', 'stage', 'timeline', 'ts', 'v',
];

export type ValidationResult = { ok: true; event: GameEvent } | { ok: false; errors: string[] };

export function validateEvent(input: unknown): ValidationResult {
  if (typeof input !== 'object' || input === null) return { ok: false, errors: ['not an object'] };
  const e = input as Record<string, unknown>;
  const errors: string[] = [];

  for (const key of Object.keys(e)) {
    if (!KEYS.includes(key as keyof GameEvent)) errors.push(`unknown field: ${key}`);
  }

  const id = (key: string, nullable = false) => {
    const value = e[key];
    if (nullable && value === null) return;
    if (typeof value !== 'string' || !ID_PATTERN.test(value)) errors.push(`invalid ${key}`);
  };

  id('eid');
  id('pid');
  id('class', true);
  id('activity');
  id('concept');
  id('choice');
  id('misconception', true);
  id('lifeStage', true);
  id('timeline');

  if (!GAME_MODES.includes(e.mode as GameMode)) errors.push('invalid mode');
  if (e.correct !== null && typeof e.correct !== 'boolean') errors.push('invalid correct');
  if (e.level !== 1 && e.level !== 2 && e.level !== 3) errors.push('invalid level');
  if (e.stage !== null && !STAGE_IDS.includes(e.stage as StageId)) errors.push('invalid stage');
  if (typeof e.ts !== 'number' || !Number.isInteger(e.ts) || e.ts <= 0) errors.push('invalid ts');
  if (e.v !== EVENT_SCHEMA_VERSION) errors.push('invalid v');

  return errors.length ? { ok: false, errors } : { ok: true, event: e as GameEvent };
}
