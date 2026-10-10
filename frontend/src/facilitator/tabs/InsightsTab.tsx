/**
 * UC-FAC-03: what the class understands, who needs support and what just
 * happened. Computed from the class's raw events (see ../insights.ts) and
 * refreshed every 20 seconds, so the facilitator sees answers arrive.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge, Button, Card, Notice, Spinner } from '@/ui';
import prompts from '@/content/facilitator/prompts.json';
import { humanise, supabaseOrThrow, timeAgo, type ClassRow, type EventRow, type PlayerRow } from '../data';
import { conceptName, conceptRoom, MIN_GROUP, summariseClass } from '../insights';

type Prompt = { title: string; prompt: string; activity: string };
const PROMPTS = prompts as Record<string, Prompt>;
const REFRESH_MS = 20_000;

export function InsightsTab({ cls }: { cls: ClassRow }) {
  const [players, setPlayers] = useState<PlayerRow[] | null>(null);
  const [events, setEvents] = useState<EventRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);

  const load = useCallback(async () => {
    const sb = supabaseOrThrow();
    const [p, e] = await Promise.all([
      sb.from('players').select('pid, display_name, first_seen, last_sync').eq('class_id', cls.id).order('last_sync', { ascending: false, nullsFirst: false }),
      sb.from('events').select('pid, concept, correct, misconception, activity, ts').eq('class_id', cls.id).order('ts', { ascending: false }).limit(5000),
    ]);
    if (p.error || e.error) setError((p.error ?? e.error)?.message ?? 'Could not load the class.');
    else setError(null);
    setPlayers((p.data as PlayerRow[] | null) ?? []);
    setEvents((e.data as EventRow[] | null) ?? []);
    setUpdatedAt(Date.now());
  }, [cls.id]);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), REFRESH_MS);
    return () => window.clearInterval(id);
  }, [load]);

  const stats = useMemo(() => (events && players ? summariseClass(events, players) : null), [events, players]);

  if (error && !stats) return <Notice tone="bad">{error}</Notice>;
  if (!stats || !players) return <Spinner />;

  if (players.length === 0) {
    return (
      <Card className="space-y-2 py-12 text-center">
        <h2 className="mt-3 text-lg font-bold">No students yet</h2>
        <p className="text-ink-soft">
          Share the join code <span className="font-mono font-bold">{cls.join_code}</span> from the “Join code” tab. Students appear here after their
          phone syncs once.
        </p>
        <div>
          <Button variant="secondary" onClick={() => void load()}>Check again</Button>
        </div>
      </Card>
    );
  }

  const struggling = stats.students.filter((s) => s.needsSupport);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <p className="text-sm text-muted">{updatedAt ? `Updated ${timeAgo(new Date(updatedAt).toISOString())}. Refreshes every 20 seconds.` : ''}</p>
        <Button variant="secondary" className="!min-h-9 text-sm" onClick={() => void load()}>Refresh now</Button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Students joined" value={players.length} sub={cls.expected_size ? `of ${cls.expected_size} expected` : undefined} />
        <Stat label="Active this week" value={stats.activeThisWeek} />
        <Stat label="Answers recorded" value={stats.totalEvents} />
        <Stat label="Synced in last 24 h" value={stats.syncedToday} sub={`${players.length - stats.syncedToday} waiting`} />
      </div>

      {struggling.length > 0 && (
        <Notice tone="warn">
          <strong>{struggling.length} {struggling.length === 1 ? 'student' : 'students'} may need support:</strong> {struggling.map((s) => s.name).join(', ')}.
        </Notice>
      )}

      {stats.totalEvents === 0 ? (
        <Notice tone="info">Students have joined but no answers have synced yet. Data appears after their phones go online.</Notice>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
          <Card>
            <h2 className="font-bold">Where the class struggles</h2>
            <p className="mb-3 text-sm text-muted">Share of answers that were right, hardest first.</p>
            <div className="space-y-2">
              {stats.concepts.map((c) => (
                <div key={c.concept} className="flex items-center gap-3">
                  <span className="w-44 shrink-0 text-sm font-medium" title={conceptRoom(c.concept) ?? undefined}>
                    {conceptName(c.concept)}
                  </span>
                  {c.students < MIN_GROUP ? (
                    <span className="text-xs text-muted">Too few students to show</span>
                  ) : (
                    <>
                      <div className="h-3 flex-1 overflow-hidden rounded-full bg-surface-2">
                        <div className={`h-full rounded-full ${band(c.rate).bar}`} style={{ width: `${Math.round(c.rate * 100)}%` }} />
                      </div>
                      <Badge tone={band(c.rate).tone}>{Math.round(c.rate * 100)}%</Badge>
                    </>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-4 flex gap-4 text-xs text-muted">
              <span>Under 40%</span>
              <span>40 to 70%</span>
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
                      <Badge tone="warn">{m.students} {m.students === 1 ? 'student' : 'students'}</Badge>
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

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <h2 className="mb-3 font-bold">Students</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted">
                <tr>
                  <th className="pb-2 pr-3 font-bold">Student</th>
                  <th className="pb-2 pr-3 font-bold">Answers</th>
                  <th className="pb-2 pr-3 font-bold">Right</th>
                  <th className="pb-2 pr-3 font-bold">Hardest for them</th>
                  <th className="pb-2 font-bold">Last sync</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {stats.students.map((s) => {
                  const player = players.find((p) => p.pid === s.pid);
                  const stale = !player?.last_sync || Date.now() - new Date(player.last_sync).getTime() > 3 * 24 * 60 * 60 * 1000;
                  return (
                    <tr key={s.pid} className="min-h-11">
                      <td className="py-2.5 pr-3 font-medium">
                        {s.name} {s.needsSupport && <Badge tone="warn">Needs support</Badge>}
                      </td>
                      <td className="py-2.5 pr-3 tabular-nums">{s.answers}</td>
                      <td className="py-2.5 pr-3 tabular-nums">{s.accuracy === null ? 'No scored answers' : `${Math.round(s.accuracy * 100)}%`}</td>
                      <td className="py-2.5 pr-3 text-ink-soft">{s.weakest ? conceptName(s.weakest) : 'None yet'}</td>
                      <td className="py-2.5"><Badge tone={stale ? 'warn' : 'good'}>{timeAgo(player?.last_sync ?? null)}</Badge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <h2 className="font-bold">Just happened</h2>
          <p className="mb-3 text-sm text-muted">The latest answers from the class.</p>
          {stats.recent.length === 0 && <p className="text-muted">No answers yet.</p>}
          <ul className="space-y-2">
            {stats.recent.map((r, i) => (
              <li key={i} className="flex items-start justify-between gap-2 text-sm">
                <span>
                  <span className="font-medium">{r.name}</span> <span className="text-ink-soft">on {conceptName(r.concept)}</span>
                </span>
                <Badge tone={r.correct === null ? 'neutral' : r.correct ? 'good' : 'bad'}>{r.correct === null ? 'Step' : r.correct ? 'Right' : 'Wrong'}</Badge>
              </li>
            ))}
          </ul>
        </Card>
      </div>
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
