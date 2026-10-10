/**
 * logEvent(): the one way to record what a student did. Owner: P5.
 *
 * Games call it with the activity, concept and choice. The platform fills in
 * the player, class, stage and time, validates the event, and puts it in the
 * outbox. It never waits for the network.
 */
import { ulid } from 'ulid';
import {
  EVENT_SCHEMA_VERSION,
  validateEvent,
  type GameEvent,
  type GameEventInput,
  type GameMode,
  type StageId,
} from '@shared/telemetry/event.ts';
import type { MiniGameResult } from '@/core/types';
import { db } from '../storage/db';
import { getActiveProfile } from '../profiles';

/** Set by P2's app store whenever the stage, life stage, timeline or mode changes. */
export type TelemetryContext = {
  mode: GameMode;
  stage: StageId | null;
  lifeStage: string | null;
  timeline: string;
  level: 1 | 2 | 3;
};

let context: TelemetryContext = { mode: 'arcade', stage: null, lifeStage: null, timeline: 'main', level: 1 };

export function setTelemetryContext(next: Partial<TelemetryContext>): void {
  context = { ...context, ...next };
}

export function getTelemetryContext(): TelemetryContext {
  return context;
}

export type LogResult = { ok: true; eid: string } | { ok: false; errors: string[] };

export async function logEvent(input: GameEventInput): Promise<LogResult> {
  const profile = await getActiveProfile();
  if (!profile) return { ok: false, errors: ['no active profile'] };

  const event: GameEvent = {
    eid: ulid(),
    pid: profile.pid,
    class: profile.classCode,
    mode: input.mode ?? context.mode,
    activity: input.activity,
    concept: input.concept,
    choice: input.choice,
    correct: input.correct ?? null,
    misconception: input.misconception ?? null,
    level: input.level ?? context.level,
    lifeStage: context.lifeStage,
    stage: context.stage,
    timeline: context.timeline,
    ts: Math.floor(Date.now() / 1000),
    v: EVENT_SCHEMA_VERSION,
  };

  const result = validateEvent(event);
  if (!result.ok) {
    if (import.meta.env.DEV) console.error('[logEvent] rejected', result.errors, event);
    return result;
  }

  await db.outbox.add({ ...result.event, status: 'pending', attempts: 0 });
  return { ok: true, eid: event.eid };
}

/**
 * Logs one event per choice of a finished mini-game. Used by P2's runtime so
 * game owners don't call logEvent for standard flows.
 */
export async function logResult(
  result: MiniGameResult,
  meta: { activity: string; concept: string },
): Promise<LogResult[]> {
  const misconception = result.misconceptions[0] ?? null;
  return Promise.all(
    result.choices.map((c) =>
      logEvent({
        activity: meta.activity,
        concept: c.concept ?? meta.concept,
        choice: c.choiceId,
        correct: c.correct ?? null,
        misconception: c.correct === false ? (c.misconception ?? misconception) : null,
      }),
    ),
  );
}

/** For the dev panel: most recent events first. */
export async function recentEvents(limit = 50): Promise<GameEvent[]> {
  const rows = await db.outbox.orderBy('eid').reverse().limit(limit).toArray();
  return rows.map(({ status: _status, attempts: _attempts, ...event }) => event);
}

export async function pendingCount(): Promise<number> {
  return db.outbox.where('status').equals('pending').count();
}
