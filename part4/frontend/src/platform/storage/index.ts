/**
 * Storage API used by every feature. Owner: P5.
 * Every call takes the player ID, so one profile can never read another's data.
 */
import { db, type StoredSnapshot } from './db';

/** Settings that belong to the device rather than a player. */
export const DEVICE_SCOPE = 'device';

export async function saveGame(pid: string, slot: string, data: unknown): Promise<void> {
  await db.saves.put({ pid, slot, data, updatedAt: Date.now() });
}

export async function loadGame<T = unknown>(pid: string, slot: string): Promise<T | null> {
  const save = await db.saves.get([pid, slot]);
  return save ? (save.data as T) : null;
}

export async function saveSnapshot(snapshot: StoredSnapshot): Promise<void> {
  await db.snapshots.put(snapshot);
}

export async function listSnapshots(pid: string, timelineId?: string): Promise<StoredSnapshot[]> {
  const rows = timelineId
    ? await db.snapshots.where('[pid+timelineId]').equals([pid, timelineId]).toArray()
    : await db.snapshots.where('pid').equals(pid).toArray();
  return rows.sort((a, b) => a.createdAt - b.createdAt);
}

export async function getSetting<T = unknown>(scope: string, key: string): Promise<T | null> {
  const row = await db.settings.get([scope, key]);
  return row ? (row.value as T) : null;
}

export async function setSetting(scope: string, key: string, value: unknown): Promise<void> {
  await db.settings.put({ scope, key, value });
}

export type StorageHealth = { usedMB: number | null; quotaMB: number | null; persisted: boolean };

/** Asks the browser not to evict our data and reports space used. */
export async function storageHealth(): Promise<StorageHealth> {
  const storage = typeof navigator !== 'undefined' ? navigator.storage : undefined;
  if (!storage?.estimate) return { usedMB: null, quotaMB: null, persisted: false };
  const persisted = (await storage.persisted?.()) || (await storage.persist?.()) || false;
  const { usage, quota } = await storage.estimate();
  const mb = (bytes?: number) => (bytes === undefined ? null : Math.round(bytes / 1024 / 1024));
  return { usedMB: mb(usage), quotaMB: mb(quota), persisted };
}

export type { StoredSnapshot } from './db';
