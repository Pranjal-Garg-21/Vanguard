/**
 * Sync status and triggers. Owner: P5.
 *
 * STUB: the shape is final so P2's dashboard can show the badge now.
 * The push/pull loop is built in P5 Phase 8.
 */
import { create } from 'zustand';
import { pendingCount } from '../telemetry';
import { isSupabaseConfigured } from '../supabase/client';

export type SyncState = 'offline' | 'pending' | 'syncing' | 'synced' | 'error' | 'disabled';

export type SyncStatus = {
  state: SyncState;
  /** Events waiting in the outbox. */
  pending: number;
  lastSyncAt: number | null;
};

export const useSyncStatus = create<SyncStatus>(() => ({
  state: 'offline',
  pending: 0,
  lastSyncAt: null,
}));

/** Refreshes the badge from the outbox and network state. */
export async function refreshSyncStatus(): Promise<void> {
  const pending = await pendingCount();
  const online = typeof navigator === 'undefined' ? false : navigator.onLine;
  const state: SyncState = !isSupabaseConfigured()
    ? 'disabled'
    : !online
      ? 'offline'
      : pending > 0
        ? 'pending'
        : 'synced';
  useSyncStatus.setState({ pending, state });
}

/** Sends the outbox. TODO(P5, Phase 8): batches of 200 to the ingest function, retry with backoff. */
export async function syncNow(): Promise<void> {
  await refreshSyncStatus();
}
