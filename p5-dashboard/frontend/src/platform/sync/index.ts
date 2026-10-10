/**
 * Sync: moves events from the phone to the cloud and brings class unlocks
 * back, without the student waiting or noticing. Owner: P5.
 *
 * Triggers: app start, the phone coming online, the app returning to the
 * foreground, every 15 minutes, and a short while after new events appear.
 * A failure backs off (30 s, 1 min, 2 min… up to 30 min) and nothing is lost:
 * events stay in the outbox until the server confirms them.
 */
import { create } from 'zustand';
import type { Unlock } from '@shared/sync/protocol.ts';
import { db, type ClassInfo } from '../storage/db';
import { DEVICE_SCOPE, getSetting, setSetting } from '../storage';
import { isSupabaseConfigured } from '../supabase/client';
import { backoffMs, pruneSent, pushOutbox, type ClassUpdate, type Transport } from './push';
import { supabaseTransport } from './transport';

export type SyncState = 'offline' | 'pending' | 'syncing' | 'synced' | 'error' | 'disabled';

export type SyncStatus = {
  state: SyncState;
  /** Events waiting to go up. Events from "play without a class" are not counted. */
  pending: number;
  lastSyncAt: number | null;
  /** Stages or sections the facilitator has opened since the last sync, for a "New: …" message. */
  newUnlocks: string[];
  lastError: string | null;
};

export const useSyncStatus = create<SyncStatus>(() => ({ state: 'offline', pending: 0, lastSyncAt: null, newUnlocks: [], lastError: null }));

const SETTING = 'sync';
type SyncMemory = { failures: number; nextAttemptAt: number; lastSyncAt: number | null };
const EMPTY_MEMORY: SyncMemory = { failures: 0, nextAttemptAt: 0, lastSyncAt: null };

const online = () => (typeof navigator === 'undefined' ? false : navigator.onLine);
const readMemory = async () => (await getSetting<SyncMemory>(DEVICE_SCOPE, SETTING)) ?? EMPTY_MEMORY;
const writeMemory = (m: SyncMemory) => setSetting(DEVICE_SCOPE, SETTING, m);

/** Events that can go up: they belong to a class, and that class has not been rejected. */
export async function uploadableCount(): Promise<number> {
  const profiles = await db.profiles.toArray();
  const bad = new Set(profiles.filter((p) => p.classStatus === 'invalid' && p.classCode).map((p) => `${p.pid}|${p.classCode}`));
  return db.outbox
    .where('status')
    .equals('pending')
    .filter((e) => !!e.class && !bad.has(`${e.pid}|${e.class}`))
    .count();
}

/** Refreshes the badge from the outbox, the network and the last attempt. */
export async function refreshSyncStatus(): Promise<void> {
  const [pending, memory] = await Promise.all([uploadableCount(), readMemory()]);
  const current = useSyncStatus.getState().state;
  let state: SyncState;
  if (!isSupabaseConfigured()) state = 'disabled';
  else if (current === 'syncing' && running) state = 'syncing';
  else if (!online()) state = 'offline';
  else if (memory.failures > 0 && pending > 0) state = 'error';
  else if (pending > 0) state = 'pending';
  else state = 'synced';
  useSyncStatus.setState({ state, pending, lastSyncAt: memory.lastSyncAt });
}

let running = false;
const LOCK_NAME = 'paisapath-sync';

/** Only one sync at a time, across tabs where the browser supports Web Locks. */
async function exclusive<T>(job: () => Promise<T>): Promise<T | undefined> {
  if (running) return undefined;
  running = true;
  try {
    const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined;
    if (locks?.request) return await locks.request(LOCK_NAME, { ifAvailable: true }, async (lock) => (lock ? job() : undefined));
    return await job();
  } finally {
    running = false;
  }
}

async function saveClassUpdates(updates: ClassUpdate[]): Promise<string[]> {
  const opened: string[] = [];
  for (const u of updates) {
    const before = await db.classCache.get(u.classCode);
    const known = new Set((before?.unlocks ?? []).map((x) => x.target));
    for (const unlock of u.unlocks) if (!known.has(unlock.target)) opened.push(unlock.target);
    const row: ClassInfo = { code: u.classCode, name: before?.name ?? null, unlocks: u.unlocks, focus: u.focus, updatedAt: Date.now() };
    await db.classCache.put(row);
  }
  return opened;
}

export type SyncResult =
  | { ran: false; reason: 'disabled' | 'offline' | 'backoff' | 'busy' }
  | { ran: true; sent: number; rejected: number; failed: boolean; newUnlocks: string[] };

/**
 * Sends the outbox now. `force` ignores the backoff wait (used when the phone
 * comes online or the student taps Sync).
 */
export async function syncNow(options: { force?: boolean; transport?: Transport; now?: number } = {}): Promise<SyncResult> {
  const now = options.now ?? Date.now();
  if (!isSupabaseConfigured() && !options.transport) {
    await refreshSyncStatus();
    return { ran: false, reason: 'disabled' };
  }
  if (!online()) {
    await refreshSyncStatus();
    return { ran: false, reason: 'offline' };
  }
  const memory = await readMemory();
  if (!options.force && now < memory.nextAttemptAt) return { ran: false, reason: 'backoff' };

  const result = await exclusive(async (): Promise<SyncResult> => {
    useSyncStatus.setState({ state: 'syncing' });
    const outcome = await pushOutbox(options.transport ?? supabaseTransport, { shouldContinue: online });
    const newUnlocks = await saveClassUpdates(outcome.classUpdates);

    if (outcome.failed) {
      const failures = memory.failures + 1;
      await writeMemory({ ...memory, failures, nextAttemptAt: now + backoffMs(failures) });
      useSyncStatus.setState({ lastError: outcome.message });
    } else {
      await writeMemory({ failures: 0, nextAttemptAt: 0, lastSyncAt: now });
      await pruneSent(now);
      useSyncStatus.setState({ lastError: null, ...(newUnlocks.length > 0 ? { newUnlocks } : {}) });
    }
    return { ran: true, sent: outcome.sent, rejected: outcome.rejected, failed: outcome.failed, newUnlocks };
  });

  await refreshSyncStatus();
  return result ?? { ran: false, reason: 'busy' };
}

/** What a class has opened for this phone, from the last sync. */
export async function getClassUnlocks(classCode: string): Promise<Unlock[]> {
  return (await db.classCache.get(classCode.toUpperCase()))?.unlocks ?? [];
}

export async function getClassFocus(classCode: string): Promise<string | null> {
  return (await db.classCache.get(classCode.toUpperCase()))?.focus ?? null;
}

/** Hides the "New: …" message after the student has seen it. */
export function dismissNewUnlocks(): void {
  useSyncStatus.setState({ newUnlocks: [] });
}

const FIFTEEN_MINUTES = 15 * 60_000;
const AFTER_EVENTS_MS = 8_000;
let stopTriggers: (() => void) | null = null;

/** Starts the automatic triggers. Safe to call more than once. Returns a function that stops them. */
export function startSyncTriggers(): () => void {
  if (stopTriggers || typeof window === 'undefined') return stopTriggers ?? (() => {});

  const run = (force = false) => void syncNow({ force });
  const onOnline = () => run(true);
  const onOffline = () => void refreshSyncStatus();
  const onVisible = () => {
    if (document.visibilityState === 'visible') run();
  };
  let debounce: number | undefined;
  const afterNewEvents = () => {
    window.clearTimeout(debounce);
    debounce = window.setTimeout(() => run(), AFTER_EVENTS_MS);
  };

  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);
  document.addEventListener('visibilitychange', onVisible);
  const interval = window.setInterval(() => run(), FIFTEEN_MINUTES);
  const onCreating = () => {
    afterNewEvents();
  };
  db.outbox.hook('creating', onCreating);
  run();

  stopTriggers = () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
    document.removeEventListener('visibilitychange', onVisible);
    window.clearInterval(interval);
    window.clearTimeout(debounce);
    db.outbox.hook('creating').unsubscribe(onCreating);
    stopTriggers = null;
  };
  return stopTriggers;
}
