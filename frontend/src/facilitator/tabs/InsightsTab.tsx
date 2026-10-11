/**
 * UC-FAC-03: what the class understands, who needs support and what just
 * happened. Computed from the class's raw events (see ../insights.ts) and
 * refreshed every 20 seconds, so the facilitator sees answers arrive.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Icon, Spinner } from '@/ui';
import prompts from '@/content/facilitator/prompts.json';
import { humanise, supabaseOrThrow, timeAgo, type ClassRow, type EventRow, type PlayerRow } from '../data';
import { conceptName, conceptRoom, MIN_GROUP, summariseClass } from '../insights';
import { ghost, Notice, Panel, Pill, StatTile, td, th } from '../theme';

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
      <Panel icon="users" title="No students yet">
        <div className="rounded-xl border-2 border-dashed border-[#d5dbe5] px-6 py-12 text-center">
          <p className="mx-auto max-w-lg text-[#5b6577]">
            Share the join code <span className="rounded bg-[#1c2538] px-2 py-0.5 font-mono font-bold text-white">{cls.join_code}</span> from the
            “Join code” tab. Students appear here after their phone syncs once.
          </p>
          <button type="button" className={`${ghost} mt-6`} onClick={() => void load()}>
            <Icon name="refresh" className="h-4 w-4" />
            Check again
          </button>
        </div>
      </Panel>
    );
  }

  const struggling = stats.students.filter((s) => s.needsSupport);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <p className="flex items-center gap-2 text-sm text-[#5b6577]">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#2563eb] opacity-60 motion-reduce:hidden" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#65a30d]" />
          </span>
          {updatedAt ? `Live · updated ${timeAgo(new Date(updatedAt).toISOString())}. Refreshes every 20 seconds.` : 'Live'}
        </p>
        <button type="button" className={ghost} onClick={() => void load()}>
          <Icon name="refresh" className="h-4 w-4" />
          Refresh now
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
        <StatTile icon="users" label="Students joined" value={players.length} sub={cls.expected_size ? `of ${cls.expected_size} expected` : undefined} />
        <StatTile icon="zap" label="Active this week" value={stats.activeThisWeek} accent="#65a30d" />
        <StatTile icon="check" label="Answers recorded" value={stats.totalEvents} accent="#7c3aed" />
        <StatTile icon="refresh" label="Synced in last 24 h" value={stats.syncedToday} sub={`${players.length - stats.syncedToday} waiting`} accent="#0891b2" />
      </div>

      {struggling.length > 0 && (
        <div className="flex items-start gap-4 rounded-xl border border-[#fcd34d] bg-[#fffbeb] p-5 sm:p-6" role="status">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#fde68a] text-[#92400e]">
            <Icon name="alert" className="h-5 w-5" />
          </span>
          <div>
            <p className="font-bold text-[#92400e]">
              {struggling.length} {struggling.length === 1 ? 'student' : 'students'} may need support
            </p>
            <p className="mt-1 text-[#78350f]">{struggling.map((s) => s.name).join(', ')}.</p>
          </div>
        </div>
      )}

      {stats.totalEvents === 0 ? (
        <Notice tone="info">Students have joined but no answers have synced yet. Data appears after their phones go online.</Notice>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr] lg:gap-8">
          <Panel icon="target" title="Where the class struggles" subtitle="Share of answers that were right, hardest first.">
            <ul className="space-y-4">
              {stats.concepts.map((c) => (
                <li key={c.concept} className="grid items-center gap-x-4 gap-y-1.5 sm:grid-cols-[12rem_1fr_auto]">
                  <span className="text-sm font-semibold" title={conceptRoom(c.concept) ?? undefined}>
                    {conceptName(c.concept)}
                  </span>
                  {c.students < MIN_GROUP ? (
                    <span className="text-xs text-[#7a8597] sm:col-span-2">Too few students to show</span>
                  ) : (
                    <>
                      <span className="h-3 overflow-hidden rounded-full bg-[#eef1f6]">
                        <span className={`block h-full rounded-full ${band(c.rate).bar}`} style={{ width: `${Math.round(c.rate * 100)}%` }} />
                      </span>
                      <Pill tone={band(c.rate).tone}>{Math.round(c.rate * 100)}%</Pill>
                    </>
                  )}
                </li>
              ))}
            </ul>
            <div className="mt-6 flex flex-wrap gap-5 border-t border-[#eef1f6] pt-4 text-xs text-[#5b6577]">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[#ef4444]" />Under 40%</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[#f59e0b]" />40 to 70%</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[#84cc16]" />Over 70%</span>
            </div>
          </Panel>

          <Panel icon="chat" title="Top misconceptions this week" subtitle="Discuss these in your next session.">
            {stats.misconceptions.length === 0 && <p className="text-[#5b6577]">None recorded this week.</p>}
            <ol className="space-y-4">
              {stats.misconceptions.map((m, i) => {
                const p = PROMPTS[m.id];
                return (
                  <li key={m.id} className="rounded-xl border border-[#e3e8ef] p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-3">
                      <span className="flex items-start gap-3 font-bold">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#1c2538] text-sm text-white">{i + 1}</span>
                        <span className="pt-0.5">{p?.title ?? humanise(m.id)}</span>
                      </span>
                      <Pill tone="warn">{m.students} {m.students === 1 ? 'student' : 'students'}</Pill>
                    </div>
                    {p && (
                      <div className="mt-3 space-y-2 pl-10">
                        <p className="text-sm leading-relaxed text-[#3b4558]">{p.prompt}</p>
                        <p className="inline-flex items-center gap-1.5 rounded-md bg-[#ecfccb] px-2 py-1 text-xs font-semibold text-[#3f6212]">
                          <Icon name="refresh" className="h-3.5 w-3.5" />
                          Replay together: {p.activity}
                        </p>
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          </Panel>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr] lg:gap-8">
        <Panel icon="users" title="Students" subtitle={`${stats.students.length} in this class`}>
          <div className="-mx-6 overflow-x-auto sm:-mx-8">
            <table className="w-full min-w-[34rem] text-left text-sm">
              <thead>
                <tr>
                  <th className={`${th} pl-6 sm:pl-8`}>Student</th>
                  <th className={th}>Answers</th>
                  <th className={th}>Right</th>
                  <th className={th}>Hardest for them</th>
                  <th className={`${th} pr-6 sm:pr-8`}>Last sync</th>
                </tr>
              </thead>
              <tbody>
                {stats.students.map((s) => {
                  const player = players.find((p) => p.pid === s.pid);
                  const stale = !player?.last_sync || Date.now() - new Date(player.last_sync).getTime() > 3 * 24 * 60 * 60 * 1000;
                  return (
                    <tr key={s.pid} className="hover:bg-[#f8fafc]">
                      <td className={`${td} pl-6 font-semibold sm:pl-8`}>
                        <span className="flex flex-wrap items-center gap-2">
                          {s.name} {s.needsSupport && <Pill tone="warn">Needs support</Pill>}
                        </span>
                      </td>
                      <td className={`${td} tabular-nums`}>{s.answers}</td>
                      <td className={`${td} tabular-nums`}>{s.accuracy === null ? 'No scored answers' : `${Math.round(s.accuracy * 100)}%`}</td>
                      <td className={`${td} text-[#5b6577]`}>{s.weakest ? conceptName(s.weakest) : 'None yet'}</td>
                      <td className={`${td} pr-6 sm:pr-8`}><Pill tone={stale ? 'warn' : 'good'}>{timeAgo(player?.last_sync ?? null)}</Pill></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel icon="clock" title="Just happened" subtitle="The latest answers from the class.">
          {stats.recent.length === 0 && <p className="text-[#5b6577]">No answers yet.</p>}
          <ul className="space-y-3">
            {stats.recent.map((r, i) => (
              <li key={i} className="flex items-center justify-between gap-3 rounded-lg px-1 py-1.5 text-sm">
                <span className="flex min-w-0 items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#e8eefb] text-xs font-bold text-[#2563eb]">
                    {r.name.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="min-w-0">
                    <span className="font-semibold">{r.name}</span> <span className="text-[#5b6577]">on {conceptName(r.concept)}</span>
                  </span>
                </span>
                <Pill tone={r.correct === null ? 'neutral' : r.correct ? 'good' : 'bad'}>{r.correct === null ? 'Step' : r.correct ? 'Right' : 'Wrong'}</Pill>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}

function band(rate: number) {
  if (rate < 0.4) return { bar: 'bg-[#ef4444]', tone: 'bad' as const };
  if (rate <= 0.7) return { bar: 'bg-[#f59e0b]', tone: 'warn' as const };
  return { bar: 'bg-[#84cc16]', tone: 'good' as const };
}
