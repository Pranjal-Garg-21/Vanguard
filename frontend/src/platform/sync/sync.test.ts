import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ulid } from 'ulid';
import type { IngestRequest, IngestResponse } from '@shared/sync/protocol.ts';
import { EVENT_SCHEMA_VERSION, type GameEvent } from '@shared/telemetry/event.ts';
import { createTestProfile, resetDb } from '@/test/fixtures';
import { db } from '../storage/db';
import { logEvent, recentEvents } from '../telemetry';
import { backoffMs, KEEP_SENT_DAYS, pruneSent, pushOutbox, resetStuckSending, type Transport } from './push';
import { getClassUnlocks, syncNow, uploadableCount, useSyncStatus } from './index';
import { getCustomScenario, listCustomScenarios } from '../custom';
import type { CustomScenarioRow } from '@shared/custom/scenario.ts';

// The status badge reads 'disabled' when Supabase is not configured, so these
// tests pin the env: CI and a fresh clone have no .env.local.
beforeEach(async () => {
  vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key');
  await resetDb();
  useSyncStatus.setState({ state: 'offline', pending: 0, lastSyncAt: null, newUnlocks: [], lastError: null });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

/** A server that accepts everything it is sent, and remembers each call. */
function fakeServer(overrides: Partial<IngestResponse> = {}) {
  const calls: IngestRequest[] = [];
  const transport: Transport = async (req) => {
    calls.push(req);
    return { ok: true, data: { accepted: req.events.map((e) => e.eid), rejected: [], unlocks: [], focus: null, ...overrides } };
  };
  return { calls, transport };
}

const joinedPlayer = (code = 'HYD007') => createTestProfile({ classCode: code, classStatus: 'pending' });
const log = (n: number) => Promise.all(Array.from({ length: n }, (_, i) => logEvent({ activity: 'UC-SAFE-01', concept: 'upi_collect', choice: `c${i}`, correct: true })));
const statuses = async () => (await db.outbox.toArray()).map((e) => e.status);

function fakeEvent(pid: string, i: number): GameEvent {
  return { eid: ulid(1_700_000_000_000 + i), pid, class: 'HYD007', mode: 'arcade', activity: 'UC-SAFE-01', concept: 'upi_collect', choice: 'c', correct: true, misconception: null, level: 1, lifeStage: null, stage: null, timeline: 'main', ts: 1_700_000_000 + i, v: EVENT_SCHEMA_VERSION };
}

describe('pushing the outbox', () => {
  it('sends events once, marks them sent, and keeps them on the phone', async () => {
    await joinedPlayer();
    await log(3);
    const { calls, transport } = fakeServer();
    const outcome = await pushOutbox(transport);
    expect(outcome).toMatchObject({ sent: 3, rejected: 0, failed: false });
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({ classCode: 'HYD007', player: { displayName: 'Test player' } });
    expect(await statuses()).toEqual(['sent', 'sent', 'sent']);
    expect(await recentEvents()).toHaveLength(3); // the dashboard still reads them
    // A second push has no events to send, only a check-in for news (unlocks, scenarios).
    expect((await pushOutbox(transport)).sent).toBe(0);
    expect(calls).toHaveLength(2);
    expect(calls[1]?.events).toEqual([]);
  });

  it('sends the oldest first, in batches of at most 200', async () => {
    const p = await joinedPlayer();
    await db.outbox.bulkAdd(Array.from({ length: 450 }, (_, i) => ({ ...fakeEvent(p.pid, i), status: 'pending' as const, attempts: 0 })));
    const { calls, transport } = fakeServer();
    await pushOutbox(transport);
    expect(calls.map((c) => c.events.length)).toEqual([200, 200, 50]);
    const order = calls.flatMap((c) => c.events.map((e) => e.eid));
    expect(order).toEqual([...order].sort());
  });

  it('puts events back in the queue when the network fails, and counts the attempt', async () => {
    await joinedPlayer();
    await log(2);
    const outcome = await pushOutbox(async () => ({ ok: false, status: null, message: 'network down' }));
    expect(outcome).toMatchObject({ failed: true, message: 'network down', sent: 0 });
    expect(await statuses()).toEqual(['pending', 'pending']);
    expect((await db.outbox.toArray()).every((e) => e.attempts === 1)).toBe(true);
  });

  it('does not retry events the server rejects for good', async () => {
    await joinedPlayer();
    await log(2);
    const [first] = (await db.outbox.toArray()).sort((a, b) => (a.eid < b.eid ? -1 : 1));
    const { transport } = fakeServer();
    const picky: Transport = async (req) => {
      const r = await transport(req);
      if (!r.ok) return r;
      return { ok: true, data: { ...r.data, accepted: r.data.accepted.filter((e) => e !== first!.eid), rejected: [{ eid: first!.eid, errors: ['bad'] }] } };
    };
    expect(await pushOutbox(picky)).toMatchObject({ sent: 1, rejected: 1 });
    const rows = await db.outbox.toArray();
    expect(rows.find((e) => e.eid === first!.eid)?.status).toBe('rejected');
    expect((await pushOutbox(transport)).sent).toBe(0);
  });

  it('requeues events the server did not mention', async () => {
    await joinedPlayer();
    await log(2);
    await pushOutbox(async () => ({ ok: true, data: { accepted: [], rejected: [], unlocks: [], focus: null } }));
    expect(await statuses()).toEqual(['pending', 'pending']);
  });

  it('marks the class invalid on an unknown code and stops sending its events', async () => {
    const p = await joinedPlayer('NOPE22');
    await log(2);
    let calls = 0;
    const unknown: Transport = async () => {
      calls += 1;
      return { ok: false, status: 404, message: 'unknown class code' };
    };
    const outcome = await pushOutbox(unknown);
    expect(outcome.unknownClasses).toEqual(['NOPE22']);
    expect(outcome.failed).toBe(false);
    expect((await db.profiles.get(p.pid))?.classStatus).toBe('invalid');
    await pushOutbox(unknown);
    expect(calls).toBe(1); // not tried again
    expect(await uploadableCount()).toBe(0);
  });

  it('confirms a pending class code after the first successful upload', async () => {
    const p = await joinedPlayer();
    await log(1);
    await pushOutbox(fakeServer().transport);
    expect((await db.profiles.get(p.pid))?.classStatus).toBe('valid');
  });

  it('never uploads events from play without a class', async () => {
    await createTestProfile({ classCode: null });
    await log(2);
    const { calls, transport } = fakeServer();
    expect((await pushOutbox(transport)).sent).toBe(0);
    expect(calls).toHaveLength(0);
    expect(await uploadableCount()).toBe(0);
  });

  it('sends each player on a shared phone under their own id and class', async () => {
    const a = await joinedPlayer('AAA111');
    await log(1);
    const b = await createTestProfile({ displayName: 'B', classCode: 'BBB222', classStatus: 'pending' });
    await log(2);
    const { calls, transport } = fakeServer();
    await pushOutbox(transport);
    const byClass = Object.fromEntries(calls.map((c) => [c.classCode, c]));
    expect(byClass.AAA111?.player.pid).toBe(a.pid);
    expect(byClass.AAA111?.events).toHaveLength(1);
    expect(byClass.BBB222?.player.pid).toBe(b.pid);
    expect(byClass.BBB222?.events).toHaveLength(2);
  });

  it('returns stuck "sending" events to the queue', async () => {
    const p = await joinedPlayer();
    await db.outbox.add({ ...fakeEvent(p.pid, 1), status: 'sending', attempts: 0 });
    await resetStuckSending();
    expect(await statuses()).toEqual(['pending']);
  });

  it('stops between batches when the phone goes offline', async () => {
    const p = await joinedPlayer();
    await db.outbox.bulkAdd(Array.from({ length: 450 }, (_, i) => ({ ...fakeEvent(p.pid, i), status: 'pending' as const, attempts: 0 })));
    const { calls, transport } = fakeServer();
    let batches = 0;
    const outcome = await pushOutbox(transport, { shouldContinue: () => batches++ < 1 });
    expect(calls).toHaveLength(1);
    expect(outcome).toMatchObject({ failed: true, message: 'offline', sent: 200 });
    expect((await db.outbox.where('status').equals('pending').count())).toBe(250);
  });

  // The test database is far slower than a real phone's IndexedDB, so the backlog here is 1,000.
  // The loop works in batches of 200 and yields to the page between them, so a bigger one stays smooth.
  it('syncs a large backlog in batches', async () => {
    const p = await joinedPlayer();
    await db.outbox.bulkAdd(Array.from({ length: 1_000 }, (_, i) => ({ ...fakeEvent(p.pid, i), status: 'pending' as const, attempts: 0 })));
    const { calls, transport } = fakeServer();
    const outcome = await pushOutbox(transport);
    expect(outcome.sent).toBe(1_000);
    expect(calls).toHaveLength(5);
    expect(await db.outbox.where('status').equals('sent').count()).toBe(1_000);
  }, 60_000);
});

describe('backoff and housekeeping', () => {
  it('waits 30 s, 1 min, 2 min… and never more than 30 min', () => {
    expect([1, 2, 3, 4].map(backoffMs)).toEqual([30_000, 60_000, 120_000, 240_000]);
    expect(backoffMs(0)).toBe(0);
    expect(backoffMs(20)).toBe(30 * 60_000);
  });

  it('removes only old events that were already sent', async () => {
    const p = await joinedPlayer();
    const now = Date.now();
    const old = Math.floor(now / 1000) - (KEEP_SENT_DAYS + 1) * 86_400;
    await db.outbox.bulkAdd([
      { ...fakeEvent(p.pid, 1), ts: old, status: 'sent', attempts: 0 },
      { ...fakeEvent(p.pid, 2), ts: old, status: 'pending', attempts: 0 },
      { ...fakeEvent(p.pid, 3), ts: Math.floor(now / 1000), status: 'sent', attempts: 0 },
    ]);
    expect(await pruneSent(now)).toBe(1);
    expect(await db.outbox.count()).toBe(2);
  });
});

describe('syncNow', () => {
  it('uploads, saves unlocks and reports which are new', async () => {
    await joinedPlayer();
    await log(2);
    const server = fakeServer({ unlocks: [{ target: 'S3', fromDate: null }], focus: 'safe' });
    const first = await syncNow({ force: true, transport: server.transport, now: 1_000 });
    expect(first).toMatchObject({ ran: true, sent: 2, failed: false, newUnlocks: ['S3'] });
    expect(await getClassUnlocks('hyd007')).toEqual([{ target: 'S3', fromDate: null }]);
    expect(useSyncStatus.getState()).toMatchObject({ state: expect.stringMatching(/synced|disabled/), pending: 0, newUnlocks: ['S3'], lastSyncAt: 1_000 });

    await log(1);
    const second = await syncNow({ force: true, transport: server.transport, now: 2_000 });
    expect(second).toMatchObject({ ran: true, sent: 1, newUnlocks: [] }); // S3 is no longer new
  });

  it('backs off after a failure, then recovers on success', async () => {
    await joinedPlayer();
    await log(1);
    const down: Transport = async () => ({ ok: false, status: 503, message: 'server busy' });
    const fail = await syncNow({ force: true, transport: down, now: 10_000 });
    expect(fail).toMatchObject({ ran: true, failed: true });
    expect(useSyncStatus.getState().lastError).toBe('server busy');

    // Too soon: skipped without calling the server.
    const tooSoon = await syncNow({ transport: down, now: 10_000 + 5_000 });
    expect(tooSoon).toEqual({ ran: false, reason: 'backoff' });

    // After the wait it tries again, and success resets the backoff.
    const ok = await syncNow({ transport: fakeServer().transport, now: 10_000 + 31_000 });
    expect(ok).toMatchObject({ ran: true, sent: 1, failed: false });
    expect(useSyncStatus.getState().lastError).toBeNull();
    expect(await syncNow({ transport: fakeServer().transport, now: 10_000 + 31_001 })).toMatchObject({ ran: true });
  });

  it('does nothing while offline, and keeps the events', async () => {
    await joinedPlayer();
    await log(2);
    const spy = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    const { calls, transport } = fakeServer();
    expect(await syncNow({ force: true, transport })).toEqual({ ran: false, reason: 'offline' });
    expect(calls).toHaveLength(0);
    expect(useSyncStatus.getState().state).toBe('offline');
    expect(await uploadableCount()).toBe(2);
    spy.mockRestore();
    // Back online: everything arrives, once.
    expect(await syncNow({ force: true, transport })).toMatchObject({ sent: 2 });
    expect(calls.flatMap((c) => c.events)).toHaveLength(2);
  });

  it('never sends the same events twice when two syncs start together', async () => {
    await joinedPlayer();
    await log(3);
    const { calls, transport } = fakeServer();
    const slow: Transport = async (req) => {
      await new Promise((r) => setTimeout(r, 20));
      return transport(req);
    };
    const results = await Promise.all([syncNow({ force: true, transport: slow }), syncNow({ force: true, transport: slow })]);
    expect(results.filter((r) => r.ran && r.sent > 0)).toHaveLength(1);
    expect(calls.flatMap((c) => c.events)).toHaveLength(3);
  });
});

describe('class news without any answers to send', () => {
  const scenario = (id: string, version = 1): CustomScenarioRow => ({
    id, version, title: `Scenario ${id}`, brief: 'Read each message.', concept: 'fake_kyc', language: 'en',
    body: { v: 1, messages: [{ id: 'm1', channel: 'sms', kind: 'scam', from: 'AX-TEST', body: 'Pay now', flags: [{ start: 0, end: 7, kind: 'urgency', why: 'Rushing you.' }], explain: 'A scam.' }] },
  });

  it('asks the server even when there is nothing to upload, and saves unlocks and scenarios', async () => {
    await joinedPlayer();
    const server = fakeServer({ unlocks: [{ target: 'S2', fromDate: null }], scenarios: [scenario('a'), scenario('b')] });
    const result = await syncNow({ force: true, transport: server.transport, now: 5_000 });
    expect(result).toMatchObject({ ran: true, sent: 0, failed: false, newUnlocks: ['S2'] });
    expect(server.calls).toHaveLength(1);
    expect(server.calls[0]?.events).toEqual([]);
    expect((await listCustomScenarios('hyd007')).map((s) => s.id).sort()).toEqual(['a', 'b']);
    expect((await getCustomScenario('a'))?.title).toBe('Scenario a');
  });

  it('keeps only what is published now, so an unpublished scenario disappears and an edit replaces the old copy', async () => {
    await joinedPlayer();
    await syncNow({ force: true, transport: fakeServer({ scenarios: [scenario('a'), scenario('b')] }).transport, now: 1_000 });
    await syncNow({ force: true, transport: fakeServer({ scenarios: [scenario('a', 2)] }).transport, now: 2_000 });
    const rows = await listCustomScenarios('HYD007');
    expect(rows.map((r) => [r.id, r.version])).toEqual([['a', 2]]);
    // An older server that sends no scenarios field leaves what is saved alone.
    await syncNow({ force: true, transport: fakeServer({ scenarios: undefined }).transport, now: 3_000 });
    expect(await listCustomScenarios('HYD007')).toHaveLength(1);
  });

  it('only shows a class its own scenarios', async () => {
    await joinedPlayer('AAA111');
    await syncNow({ force: true, transport: fakeServer({ scenarios: [scenario('a')] }).transport, now: 1_000 });
    expect(await listCustomScenarios('AAA111')).toHaveLength(1);
    expect(await listCustomScenarios('BBB222')).toEqual([]);
    expect(await listCustomScenarios(null)).toEqual([]);
  });

  it('marks the class invalid when the server does not know it', async () => {
    const p = await joinedPlayer('NOPE22');
    const unknown: Transport = async () => ({ ok: false, status: 404, message: 'unknown class code' });
    const outcome = await pushOutbox(unknown);
    expect(outcome.unknownClasses).toEqual(['NOPE22']);
    expect((await db.profiles.get(p.pid))?.classStatus).toBe('invalid');
  });

  it('does not ask for a player who has no class', async () => {
    await createTestProfile({ classCode: null });
    const { calls, transport } = fakeServer();
    await pushOutbox(transport);
    expect(calls).toHaveLength(0);
  });
});
