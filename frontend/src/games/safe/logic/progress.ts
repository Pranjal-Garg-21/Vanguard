/**
 * Progress, XP, ranks and badges for Stay Safe. Pure: the hub loads and saves
 * the state, this only works out what a finished run is worth. Modelled on how
 * TryHackMe keeps people going: points for every room, stars for doing it well,
 * a rank that rises, badges for milestones, and a clear "next room".
 * Owner: P5.
 */
import type { MiniGameResult } from '@/core/types';

export const RANKS = [
  { id: 'rookie', min: 0 },
  { id: 'watchful', min: 150 },
  { id: 'sharp', min: 400 },
  { id: 'proof', min: 800 },
  { id: 'guardian', min: 1500 },
] as const;
export type RankId = (typeof RANKS)[number]['id'];

export type EntryProgress = { runs: number; best: number; stars: number; perfXp: number; lastAt: number };

export type Progress = {
  v: 1;
  xp: number;
  entries: Record<string, EntryProgress>;
  /** Red-flag kinds found at least once. */
  cards: string[];
  badges: string[];
  /** Days played, as YYYY-MM-DD. */
  days: string[];
};

export const emptyProgress = (): Progress => ({ v: 1, xp: 0, entries: {}, cards: [], badges: [], days: [] });

export const BASE_XP = { 1: 60, 2: 90, 3: 120 } as const;
export const FIRST_CLEAR_XP = 30;
export const CARD_XP = 10;
export const STAR_XP = 20;
export const ALL_CARDS = 7;

export type RunInput = {
  entryId: string;
  simulatorId: string;
  level: 1 | 2 | 3;
  /** 0 to 1: the share of scored choices that were right. */
  score: number;
  /** Lost money to a scam in this run. */
  fooled: boolean;
  /** Red-flag kinds found in this run. */
  kinds: string[];
  /** Every entry ID in the catalogue, by simulator, to award simulator badges. */
  catalogue: Record<string, string[]>;
  now: number;
};

export type GainLine = { key: string; xp: number; arg?: number };
export type Gain = {
  lines: GainLine[];
  total: number;
  stars: number;
  firstClear: boolean;
  newCards: string[];
  newBadges: string[];
  rankBefore: RankId;
  rankAfter: RankId;
  xpBefore: number;
  xpAfter: number;
};

/** The share of choices the game scored as correct. A run with nothing scored counts as 1 unless the student was fooled. */
export function scoreOf(result: MiniGameResult, fooled = false): number {
  const scored = result.choices.filter((c) => c.correct !== undefined);
  if (scored.length === 0) return fooled ? 0 : 1;
  return scored.filter((c) => c.correct).length / scored.length;
}

export function starsFor(score: number, fooled: boolean): number {
  if (score >= 0.9 && !fooled) return 3;
  if (score >= 0.7) return 2;
  return 1;
}

export function rankFor(xp: number): RankId {
  let rank: RankId = 'rookie';
  for (const r of RANKS) if (xp >= r.min) rank = r.id;
  return rank;
}

/** XP needed for the next rank and how far through the current one the student is (0 to 1). */
export function rankProgress(xp: number): { rank: RankId; level: number; next: RankId | null; toNext: number; fraction: number } {
  const i = RANKS.findIndex((r) => r.id === rankFor(xp));
  const current = RANKS[i] as (typeof RANKS)[number];
  const next = RANKS[i + 1];
  if (!next) return { rank: current.id, level: i + 1, next: null, toNext: 0, fraction: 1 };
  return { rank: current.id, level: i + 1, next: next.id, toNext: next.min - xp, fraction: (xp - current.min) / (next.min - current.min) };
}

const dayOf = (ms: number) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Longest run of consecutive days ending on the latest day played. */
export function streakDays(days: string[]): number {
  const set = new Set(days);
  const latest = [...set].sort().at(-1);
  if (!latest) return 0;
  let count = 0;
  const cursor = new Date(`${latest}T00:00:00`);
  while (set.has(dayOf(cursor.getTime()))) {
    count += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}

export const BADGES = ['first_room', 'flawless', 'card_collector', 'streak_3', 'all_rooms', 'sim_upi', 'sim_inbox', 'sim_hunter', 'sim_call', 'sim_chat', 'sim_loan', 'sim_rescue'] as const;
export type BadgeId = (typeof BADGES)[number];

function earnedBadges(p: Progress, flawlessNow: boolean, catalogue: Record<string, string[]>): string[] {
  const done = (id: string) => (p.entries[id]?.runs ?? 0) > 0;
  const out = new Set(p.badges);
  if (Object.keys(p.entries).length > 0) out.add('first_room');
  if (flawlessNow) out.add('flawless');
  if (p.cards.length >= ALL_CARDS) out.add('card_collector');
  if (streakDays(p.days) >= 3) out.add('streak_3');
  for (const [sim, ids] of Object.entries(catalogue)) if (ids.length > 0 && ids.every(done)) out.add(`sim_${sim}`);
  const all = Object.values(catalogue).flat();
  if (all.length > 0 && all.every(done)) out.add('all_rooms');
  return [...out];
}

/** What a finished run earns. Replays only pay for improvement, so XP cannot be farmed. */
export function applyRun(prev: Progress, input: RunInput): { progress: Progress; gain: Gain } {
  const before = prev.entries[input.entryId];
  const firstClear = !before;
  const stars = starsFor(input.score, input.fooled);

  const perfXp = Math.round(BASE_XP[input.level] * (0.4 + 0.6 * input.score));
  const lines: GainLine[] = [];
  const perfGain = Math.max(0, perfXp - (before?.perfXp ?? 0));
  if (perfGain > 0) lines.push({ key: 'performance', xp: perfGain });
  if (firstClear) lines.push({ key: 'firstClear', xp: FIRST_CLEAR_XP });
  const starGain = Math.max(0, stars - (before?.stars ?? 0));
  if (starGain > 0 && !firstClear) lines.push({ key: 'moreStars', xp: starGain * STAR_XP, arg: starGain });
  const newCards = input.kinds.filter((k) => !prev.cards.includes(k));
  if (newCards.length > 0) lines.push({ key: 'newCards', xp: newCards.length * CARD_XP, arg: newCards.length });

  const total = lines.reduce((n, l) => n + l.xp, 0);
  const day = dayOf(input.now);
  const next: Progress = {
    ...prev,
    xp: prev.xp + total,
    entries: {
      ...prev.entries,
      [input.entryId]: {
        runs: (before?.runs ?? 0) + 1,
        best: Math.max(before?.best ?? 0, input.score),
        stars: Math.max(before?.stars ?? 0, stars),
        perfXp: Math.max(before?.perfXp ?? 0, perfXp),
        lastAt: input.now,
      },
    },
    cards: [...new Set([...prev.cards, ...input.kinds])],
    days: prev.days.includes(day) ? prev.days : [...prev.days, day],
  };
  const badges = earnedBadges(next, input.score >= 1 && !input.fooled, input.catalogue);
  const newBadges = badges.filter((b) => !prev.badges.includes(b));
  next.badges = badges;

  return {
    progress: next,
    gain: { lines, total, stars, firstClear, newCards, newBadges, rankBefore: rankFor(prev.xp), rankAfter: rankFor(next.xp), xpBefore: prev.xp, xpAfter: next.xp },
  };
}

/** The first room on the learning path that has not been played. */
export function nextOnPath(path: string[], p: Progress): string | null {
  return path.find((id) => !p.entries[id]) ?? null;
}
