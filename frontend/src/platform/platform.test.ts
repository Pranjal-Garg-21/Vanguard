import { beforeEach, describe, expect, it } from 'vitest';
import { validateEvent } from '@shared/telemetry/event.ts';
import { createTestProfile, resetDb, TEST_PIN } from '@/test/fixtures';
import { loadGame, saveGame } from './storage';
import { getActiveProfile, LOCKOUT_MS, switchPlayer, unlockProfile } from './profiles';
import { logEvent, pendingCount, recentEvents } from './telemetry';
import { db } from './storage/db';

beforeEach(resetDb);

describe('storage', () => {
  it('keeps each profile’s saves separate', async () => {
    const a = await createTestProfile({ displayName: 'A' });
    const b = await createTestProfile({ displayName: 'B' });
    await saveGame(a.pid, 'lifepath', { month: 4 });
    expect(await loadGame(a.pid, 'lifepath')).toEqual({ month: 4 });
    expect(await loadGame(b.pid, 'lifepath')).toBeNull();
  });
});

describe('profiles', () => {
  it('never stores the PIN itself', async () => {
    const p = await createTestProfile();
    const row = await db.profiles.get(p.pid);
    expect(JSON.stringify(row)).not.toContain('mango');
  });

  it('unlocks with the right PIN and locks after 3 wrong tries', async () => {
    const p = await createTestProfile();
    await switchPlayer();
    expect(await getActiveProfile()).toBeNull();

    const now = 1_000_000;
    expect(await unlockProfile(p.pid, ['x'], now)).toEqual({ ok: false, lockedForMs: 0, attemptsLeft: 2 });
    await unlockProfile(p.pid, ['x'], now);
    expect(await unlockProfile(p.pid, ['x'], now)).toEqual({ ok: false, lockedForMs: LOCKOUT_MS, attemptsLeft: 0 });
    expect((await unlockProfile(p.pid, TEST_PIN, now + 1000)).ok).toBe(false);

    expect(await unlockProfile(p.pid, TEST_PIN, now + LOCKOUT_MS + 1)).toEqual({ ok: true });
    expect((await getActiveProfile())?.pid).toBe(p.pid);
  });
});

describe('logEvent', () => {
  it('fills in the platform fields and adds a valid event to the outbox', async () => {
    const p = await createTestProfile({ classCode: 'hyd007' });
    const result = await logEvent({ activity: 'UC-SAFE-01', concept: 'upi_collect', choice: 'entered_pin', correct: false });
    expect(result.ok).toBe(true);

    const [event] = await recentEvents();
    expect(event).toMatchObject({ pid: p.pid, class: 'HYD007', activity: 'UC-SAFE-01', timeline: 'main', v: 1 });
    expect(validateEvent(event).ok).toBe(true);
    expect(await pendingCount()).toBe(1);
  });

  it('rejects free text', async () => {
    await createTestProfile();
    const result = await logEvent({ activity: 'UC-SAFE-03', concept: 'fake_kyc', choice: 'I typed my mother’s name here' });
    expect(result.ok).toBe(false);
    expect(await pendingCount()).toBe(0);
  });

  it('needs an active profile', async () => {
    expect((await logEvent({ activity: 'DEV', concept: 'x', choice: 'y' })).ok).toBe(false);
  });
});
