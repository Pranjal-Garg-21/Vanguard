/**
 * Turns a class's raw events into what a facilitator needs: which concepts the
 * class struggles with, the top misconceptions, who needs support, and what
 * just happened. Pure, so it is easy to test. Owner: P5.
 */
import concepts from '@/content/facilitator/concepts.json';
import type { EventRow, PlayerRow } from './data';
import { humanise } from './data';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Concept bars are hidden when fewer students than this have answered, so no one can be singled out. */
export const MIN_GROUP = 3;
/** A student is flagged for support below this accuracy, once they have answered enough. */
export const SUPPORT_BELOW = 0.5;
export const SUPPORT_MIN_ANSWERS = 6;

type ConceptInfo = { name: string; room: string };
const CONCEPTS = concepts as Record<string, ConceptInfo>;

export const conceptName = (id: string) => CONCEPTS[id]?.name ?? humanise(id);
export const conceptRoom = (id: string) => CONCEPTS[id]?.room ?? null;

export type ConceptStat = { concept: string; rate: number; students: number; answers: number };
export type MisconceptionStat = { id: string; students: number };
export type StudentStat = {
  pid: string;
  name: string;
  answers: number;
  accuracy: number | null;
  weakest: string | null;
  lastActive: string | null;
  needsSupport: boolean;
};
export type RecentEvent = { name: string; concept: string; correct: boolean | null; ts: string };

export type ClassSummary = {
  totalEvents: number;
  activeThisWeek: number;
  syncedToday: number;
  concepts: ConceptStat[];
  misconceptions: MisconceptionStat[];
  students: StudentStat[];
  recent: RecentEvent[];
};

export function summariseClass(events: EventRow[], players: PlayerRow[], now = Date.now()): ClassSummary {
  const weekAgo = now - WEEK_MS;
  const dayAgo = now - DAY_MS;
  const names = new Map(players.map((p) => [p.pid, p.display_name]));

  const byConcept = new Map<string, { right: number; total: number; pids: Set<string> }>();
  const byMisconception = new Map<string, Set<string>>();
  const activePids = new Set<string>();
  const perStudent = new Map<string, { answers: number; scored: number; right: number; byConcept: Map<string, { right: number; total: number }>; last: string | null }>();

  for (const e of events) {
    const recent = new Date(e.ts).getTime() >= weekAgo;
    if (recent) activePids.add(e.pid);

    const s = perStudent.get(e.pid) ?? { answers: 0, scored: 0, right: 0, byConcept: new Map(), last: null };
    s.answers += 1;
    if (!s.last || e.ts > s.last) s.last = e.ts;

    if (e.correct !== null) {
      const c = byConcept.get(e.concept) ?? { right: 0, total: 0, pids: new Set<string>() };
      c.total += 1;
      if (e.correct) c.right += 1;
      c.pids.add(e.pid);
      byConcept.set(e.concept, c);

      s.scored += 1;
      if (e.correct) s.right += 1;
      const sc = s.byConcept.get(e.concept) ?? { right: 0, total: 0 };
      sc.total += 1;
      if (e.correct) sc.right += 1;
      s.byConcept.set(e.concept, sc);
    }
    perStudent.set(e.pid, s);

    if (e.misconception && recent) {
      const set = byMisconception.get(e.misconception) ?? new Set<string>();
      set.add(e.pid);
      byMisconception.set(e.misconception, set);
    }
  }

  const students: StudentStat[] = players.map((p) => {
    const s = perStudent.get(p.pid);
    const accuracy = s && s.scored > 0 ? s.right / s.scored : null;
    let weakest: string | null = null;
    let weakestRate = 2;
    for (const [concept, c] of s?.byConcept ?? []) {
      if (c.total < 2) continue;
      const rate = c.right / c.total;
      if (rate < weakestRate) {
        weakestRate = rate;
        weakest = concept;
      }
    }
    return {
      pid: p.pid,
      name: p.display_name,
      answers: s?.answers ?? 0,
      accuracy,
      weakest: weakestRate < 1 ? weakest : null,
      lastActive: s?.last ?? null,
      needsSupport: accuracy !== null && (s?.scored ?? 0) >= SUPPORT_MIN_ANSWERS && accuracy < SUPPORT_BELOW,
    };
  });
  // Students who need support first, then the lowest accuracy, then those with no answers yet.
  students.sort((a, b) => Number(b.needsSupport) - Number(a.needsSupport) || (a.accuracy ?? 2) - (b.accuracy ?? 2) || a.name.localeCompare(b.name));

  const recentEvents = [...events]
    .sort((a, b) => (a.ts < b.ts ? 1 : -1))
    .slice(0, 8)
    .map((e) => ({ name: names.get(e.pid) ?? 'A student', concept: e.concept, correct: e.correct, ts: e.ts }));

  return {
    totalEvents: events.length,
    activeThisWeek: activePids.size,
    syncedToday: players.filter((p) => p.last_sync && new Date(p.last_sync).getTime() >= dayAgo).length,
    concepts: [...byConcept.entries()]
      .map(([concept, c]) => ({ concept, rate: c.right / c.total, students: c.pids.size, answers: c.total }))
      .sort((a, b) => a.rate - b.rate),
    misconceptions: [...byMisconception.entries()].map(([id, pids]) => ({ id, students: pids.size })).sort((a, b) => b.students - a.students || a.id.localeCompare(b.id)).slice(0, 3),
    students,
    recent: recentEvents,
  };
}
