/**
 * Temporary landing page while the real home dashboard (P2) is built.
 * Shows that the scaffold works and lets you log a test event.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import {
  getActiveProfile,
  isSupabaseConfigured,
  logEvent,
  recentEvents,
  refreshSyncStatus,
  syncNow,
  useSyncStatus,
  type GameEvent,
  type ProfileSummary,
} from '@/platform';

export function DevHome() {
  const sync = useSyncStatus();
  const [profile, setProfile] = useState<ProfileSummary | null>(null);
  const [events, setEvents] = useState<GameEvent[]>([]);

  const refresh = async () => {
    setProfile(await getActiveProfile());
    setEvents(await recentEvents(10));
    await refreshSyncStatus();
  };

  useEffect(() => {
    void refresh();
  }, []);

  const logTestEvent = async () => {
    await logEvent({ activity: 'DEV', concept: 'example_concept', choice: 'test', correct: true });
    await refresh();
  };

  return (
    <main className="mx-auto max-w-xl space-y-6 p-4">
      <h1 className="text-2xl font-bold">PaisaPath scaffold</h1>

      <section className="space-y-1">
        <p>Supabase: {isSupabaseConfigured() ? 'configured' : 'not configured (see frontend/.env.example)'}</p>
        <p>Sync: {sync.state} · {sync.pending} pending{sync.lastSyncAt ? ` · last ${new Date(sync.lastSyncAt).toLocaleTimeString()}` : ''}</p>
        {sync.lastError && <p className="text-bad">Last error: {sync.lastError}</p>}
        <p>Active profile: {profile ? profile.displayName : 'none'}</p>
      </section>

      <nav className="flex flex-wrap gap-3">
        <Link className="rounded bg-brand px-3 py-2 font-bold text-brand-ink" to="/setup">Setup (P5)</Link>
        <Link className="rounded bg-surface-3 px-3 py-2 text-ink" to="/facilitator">Facilitator (P5)</Link>
        <button className="rounded border border-line-strong px-3 py-2" onClick={async () => { await syncNow({ force: true }); await refresh(); }}>
          Sync now
        </button>
        <Link className="rounded bg-surface-3 px-3 py-2 text-ink" to="/learn">Learn: all topics (P4)</Link>
        <Link className="rounded bg-surface-3 px-3 py-2 text-ink" to="/learn/invest">Investing ABC (P4)</Link>
        <Link className="rounded bg-surface-3 px-3 py-2 text-ink" to="/arcade">Arcade (P4)</Link>
        <Link className="rounded bg-surface-3 px-3 py-2 text-ink" to="/gallery">Design kit gallery (P4)</Link>
        <button className="rounded border border-line-strong px-3 py-2 disabled:opacity-50" disabled={!profile} onClick={logTestEvent}>

          Log test event
        </button>
      </nav>

      <section>
        <h2 className="font-semibold">Last events in outbox</h2>
        <ul className="font-mono text-xs">
          {events.map((e) => (
            <li key={e.eid}>{e.activity} · {e.concept} · {e.choice} · {String(e.correct)}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}
