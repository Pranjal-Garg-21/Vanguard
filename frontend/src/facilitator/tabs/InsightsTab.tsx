/**
 * UC-FAC-03: what the class understands. Computed from raw events for now;
 * switches to class_concept_daily when the aggregate job lands (Phase 7).
 */
import { useEffect, useMemo, useState } from 'react';
import { Badge, Card, Alert, Spinner } from '@/ui';
import prompts from '@/content/facilitator/prompts.json';
import { humanise, supabaseOrThrow, timeAgo, type ClassRow, type EventRow, type PlayerRow } from '../data';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
/** Cells with fewer students than this are hidden so no one can be singled out. */
const MIN_GROUP = 3;

type Prompt = { title: string; prompt: string; activity: string };
const PROMPTS = prompts as Record<string, Prompt>;

export function InsightsTab({ cls }: { cls: ClassRow }) {
  const [players, setPlayers] = useState<PlayerRow[] | null>(null);
  const [events, setEvents] = useState<EventRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sb = supabaseOrThrow();
    sb.from('players')
      .select('pid, display_name, first_seen, last_sync')
      .eq('class_id', cls.id)
      .order('last_sync', { ascending: false, nullsFirst: false })
      .then(({ data, error }) => {
        if (error) setError(error.message);
        setPlayers((data as PlayerRow[] | null) ?? []);
      });
    sb.from('events')
      .select('pid, concept, correct, misconception, activity, ts')
      .eq('class_id', cls.id)
      .order('ts', { ascending: false })
      .limit(5000)
      .then(({ data, error }) => {
        if (error) setError(error.message);
        setEvents((data as EventRow[] | null) ?? []);
      });
  }, [cls.id]);

  const stats = useMemo(() => (events && players ? summarise(events, players) : null), [events, players]);

  if (error) return <Alert variant="bad">{error}</Alert>;
  if (!stats || !players) return <Spinner />;

  if (players.length === 0) {
    return (
      <Card className="py-12 text-center">
        <h2 className="mt-3 text-lg font-bold">No students yet</h2>
        <p className="mt-1 text-ink-soft">
          Share the join code <span className="font-mono font-bold">{cls.join_code}</span> from the “Join code” tab.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Students joined" value={players.length} sub={cls.expected_size ? `of ${cls.expected_size} expected` : undefined} />
        <Stat label="Active this week" value={stats.activeThisWeek} />
        <Stat label="Answers recorded" value={stats.totalEvents} />
        <Stat label="Synced in last 24 h" value={stats.syncedToday} sub={`${players.length - stats.syncedToday} waiting`} />
      </div>

      {stats.totalEvents === 0 ? (
        <Alert variant="info">Students have joined but no answers have synced yet. Data appears after their phones go online.</Alert>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
          <Card>
            <h2 className="font-bold">Concepts</h2>
            <p className="mb-3 text-sm text-muted">Share of answers that were right, per concept.</p>
            <div className="space-y-2">
              {stats.concepts.map((c) => (
                <div key={c.concept} className="flex items-center gap-3">
                  <span className="w-40 shrink-0 truncate text-sm font-medium" title={c.concept}>
                    {humanise(c.concept)}
                  </span>
                  {c.students < MIN_GROUP ? (
                    <span className="text-xs text-muted">Too few students to show</span>
                  ) : (
                    <>
                      <div className="h-3 flex-1 overflow-hidden rounded-full bg-surface-2">
                        <div className={`h-full rounded-full ${band(c.rate).bar}`} style={{ width: `${Math.round(c.rate * 100)}%` }} />
                      </div>
                      <Badge variant={band(c.rate).tone}>{Math.round(c.rate * 100)}%</Badge>
                    </>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-4 flex gap-4 text-xs text-muted">
              <span>Under 40%</span>
              <span>40–70%</span>
              <span>Over 70%</span>
            </div>
          </Card>

          <Card>
            <h2 className="font-bold">Top misconceptions this week</h2>
            <p className="mb-3 text-sm text-muted">Discuss these in your next session.</p>
            {stats.misconceptions.length === 0 && <p className="text-muted">None recorded this week.</p>}
            <ol className="space-y-4">
              {stats.misconceptions.map((m, i) => {
                const p = PROMPTS[m.id];
                return (
                  <li key={m.id} className="rounded-lg border-l-4 border-line-strong bg-surface-2 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-semibold">
                        {i + 1}. {p?.title ?? humanise(m.id)}
                      </span>
                      <Badge variant="warn">{m.students} students</Badge>
                    </div>
                    {p && (
                      <>
                        <p className="mt-2 text-sm text-ink-soft">{p.prompt}</p>
                        <p className="mt-1 text-xs font-semibold text-ink-soft">Replay together: {p.activity}</p>
                      </>
                    )}
                  </li>
                );
              })}
            </ol>
          </Card>
        </div>
      )}

      <Card>
        <h2 className="mb-3 font-bold">Students and last sync</h2>
        <div className="divide-y divide-line">
          {players.map((p) => {
            const stale = !p.last_sync || Date.now() - new Date(p.last_sync).getTime() > 3 * 24 * 60 * 60 * 1000;
            return (
              <div key={p.pid} className="flex min-h-11 items-center justify-between gap-3">
                <span className="font-medium">{p.display_name}</span>
                <Badge variant={stale ? 'warn' : 'good'}>{timeAgo(p.last_sync)}</Badge>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <Card className="p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="text-3xl font-extrabold">{value}</p>
      {sub && <p className="text-xs text-muted">{sub}</p>}
    </Card>
  );
}

function band(rate: number) {
  if (rate < 0.4) return { bar: 'bg-bad', tone: 'bad' as const };
  if (rate <= 0.7) return { bar: 'bg-ink-soft', tone: 'neutral' as const };
  return { bar: 'bg-brand', tone: 'good' as const };
}

function summarise(events: EventRow[], players: PlayerRow[]) {
  const weekAgo = Date.now() - WEEK_MS;
  const dayAgo = Date.now() - WEEK_MS / 7;

  const byConcept = new Map<string, { right: number; total: number; pids: Set<string> }>();
  const byMisconception = new Map<string, Set<string>>();
  const activePids = new Set<string>();

  for (const e of events) {
    const recent = new Date(e.ts).getTime() >= weekAgo;
    if (recent) activePids.add(e.pid);

    if (e.correct !== null) {
      const c = byConcept.get(e.concept) ?? { right: 0, total: 0, pids: new Set<string>() };
      c.total += 1;
      if (e.correct) c.right += 1;
      c.pids.add(e.pid);
      byConcept.set(e.concept, c);
    }
    if (e.misconception && recent) {
      const set = byMisconception.get(e.misconception) ?? new Set<string>();
      set.add(e.pid);
      byMisconception.set(e.misconception, set);
    }
  }

  return {
    totalEvents: events.length,
    activeThisWeek: activePids.size,
    syncedToday: players.filter((p) => p.last_sync && new Date(p.last_sync).getTime() >= dayAgo).length,
    concepts: [...byConcept.entries()]
      .map(([concept, c]) => ({ concept, rate: c.right / c.total, students: c.pids.size }))
      .sort((a, b) => a.rate - b.rate),
    misconceptions: [...byMisconception.entries()]
      .map(([id, pids]) => ({ id, students: pids.size }))
      .sort((a, b) => b.students - a.students)
      .slice(0, 3),
  };
}
