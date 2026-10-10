/**
 * Push loop: sends pending outbox events to the ingest function in batches.
 * The transport is passed in, so the loop can be tested without a network.
 * Events are append-only and the server ignores duplicates, so a retry is
 * always safe. Owner: P5.
 */
import { MAX_BATCH_SIZE, type IngestRequest, type IngestResponse, type Unlock } from '@shared/sync/protocol.ts';
import { db, type OutboxEvent } from '../storage/db';
import { setClassStatus } from '../profiles';

export type TransportResult = { ok: true; data: IngestResponse } | { ok: false; status: number | null; message: string };
export type Transport = (request: IngestRequest) => Promise<TransportResult>;

export type ClassUpdate = { classCode: string; unlocks: Unlock[]; focus: string | null };

export type PushOutcome = {
  sent: number;
  rejected: number;
  /** A network or server problem stopped the push; try again later with backoff. */
  failed: boolean;
  message: string | null;
  /** Class codes the server did not recognise. */
  unknownClasses: string[];
  /** Unlocks and focus returned by the server, one entry per class. */
  classUpdates: ClassUpdate[];
};

export type PushOptions = {
  batchSize?: number;
  /** Checked between batches, so a push stops quickly when the phone goes offline. */
  shouldContinue?: () => boolean;
};

const yieldToUi = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/** Events left as "sending" by a closed tab go back to the queue. */
export async function resetStuckSending(): Promise<void> {
  await db.outbox.where('status').equals('sending').modify({ status: 'pending' });
}

async function setStatus(events: OutboxEvent[], status: OutboxEvent['status'], countAttempt = false): Promise<void> {
  if (events.length === 0) return;
  await db.outbox.bulkPut(events.map((e) => ({ ...e, status, attempts: e.attempts + (countAttempt ? 1 : 0) })));
}

export async function pushOutbox(transport: Transport, options: PushOptions = {}): Promise<PushOutcome> {
  const batchSize = Math.min(options.batchSize ?? MAX_BATCH_SIZE, MAX_BATCH_SIZE);
  const outcome: PushOutcome = { sent: 0, rejected: 0, failed: false, message: null, unknownClasses: [], classUpdates: [] };

  await resetStuckSending();

  const profiles = new Map((await db.profiles.toArray()).map((p) => [p.pid, p]));
  const pending = await db.outbox.where('status').equals('pending').toArray();

  // One group per player and class: each ingest call is for one player.
  const groups = new Map<string, OutboxEvent[]>();
  for (const event of pending) {
    if (!event.class) continue; // played without a class: stays on the phone
    const profile = profiles.get(event.pid);
    if (!profile) continue;
    if (profile.classStatus === 'invalid' && profile.classCode === event.class) continue;
    const key = `${event.pid}|${event.class}`;
    groups.set(key, [...(groups.get(key) ?? []), event]);
  }

  for (const [key, events] of groups) {
    const [pid, classCode] = key.split('|') as [string, string];
    const profile = profiles.get(pid)!;
    events.sort((a, b) => (a.eid < b.eid ? -1 : 1)); // ULIDs sort by time: oldest first

    for (let i = 0; i < events.length; i += batchSize) {
      if (options.shouldContinue && !options.shouldContinue()) {
        outcome.failed = true;
        outcome.message = 'offline';
        return outcome;
      }
      const batch = events.slice(i, i + batchSize);
      await setStatus(batch, 'sending');

      const request: IngestRequest = {
        classCode,
        player: { pid, displayName: profile.displayName },
        events: batch.map(({ status: _status, attempts: _attempts, ...event }) => event),
      };
      const result = await transport(request);

      if (!result.ok) {
        await setStatus(batch, 'pending', true);
        if (result.status === 404) {
          // The class code does not exist (or consent is not confirmed). Stop for this class, keep the events.
          outcome.unknownClasses.push(classCode);
          if (profile.classCode === classCode) await setClassStatus(pid, 'invalid');
          break;
        }
        outcome.failed = true;
        outcome.message = result.message;
        return outcome;
      }

      const { accepted, rejected, unlocks, focus } = result.data;
      const acceptedSet = new Set(accepted);
      const rejectedSet = new Set(rejected.map((r) => r.eid));
      await setStatus(batch.filter((e) => acceptedSet.has(e.eid)), 'sent');
      await setStatus(batch.filter((e) => rejectedSet.has(e.eid)), 'rejected');
      // Anything the server did not mention goes back to the queue.
      await setStatus(batch.filter((e) => !acceptedSet.has(e.eid) && !rejectedSet.has(e.eid)), 'pending', true);
      outcome.sent += accepted.length;
      outcome.rejected += rejected.length;

      if (profile.classStatus === 'pending' && profile.classCode === classCode) await setClassStatus(pid, 'valid');
      outcome.classUpdates = [...outcome.classUpdates.filter((u) => u.classCode !== classCode), { classCode, unlocks, focus }];

      if (i + batchSize < events.length) await yieldToUi(); // keep the page responsive for big backlogs
    }
  }
  return outcome;
}

/** How long to wait after the nth failure in a row: 30 s, 1 min, 2 min, 4 min… up to 30 min. */
export function backoffMs(failures: number): number {
  if (failures <= 0) return 0;
  return Math.min(30 * 60_000, 30_000 * 2 ** (failures - 1));
}

/** Sent events older than this are removed from the phone to keep it light. */
export const KEEP_SENT_DAYS = 90;

export async function pruneSent(now = Date.now()): Promise<number> {
  const cutoff = Math.floor(now / 1000) - KEEP_SENT_DAYS * 24 * 60 * 60;
  return db.outbox.where('status').equals('sent').filter((e) => e.ts < cutoff).delete();
}
