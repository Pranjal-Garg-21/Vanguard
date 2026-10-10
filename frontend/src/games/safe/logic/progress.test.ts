import { describe, expect, it } from 'vitest';
import type { MiniGameResult } from '@/core/types';
import { ALL_CARDS, applyRun, BASE_XP, CARD_XP, emptyProgress, FIRST_CLEAR_XP, nextOnPath, rankFor, rankProgress, scoreOf, starsFor, streakDays, type RunInput } from './progress';

const CATALOGUE = { upi: ['a', 'b'], inbox: ['c'] };
const run = (over: Partial<RunInput> = {}): RunInput => ({ entryId: 'a', simulatorId: 'upi', level: 2, score: 1, fooled: false, kinds: [], catalogue: CATALOGUE, now: Date.UTC(2026, 9, 11, 12), ...over });

describe('scoring a result', () => {
  const result = (flags: (boolean | undefined)[]): MiniGameResult => ({ choices: flags.map((c, i) => ({ stepId: String(i), choiceId: 'x', ms: 0, ...(c === undefined ? {} : { correct: c }) })), conceptDeltas: {}, misconceptions: [], summaryKey: 's' });
  it('is the share of scored choices that were right', () => expect(scoreOf(result([true, false, true, undefined]))).toBeCloseTo(2 / 3));
  it('counts nothing scored as full marks unless fooled', () => {
    expect(scoreOf(result([undefined]))).toBe(1);
    expect(scoreOf(result([undefined]), true)).toBe(0);
  });
  it('gives stars by score and never three stars when fooled', () => {
    expect(starsFor(1, false)).toBe(3);
    expect(starsFor(1, true)).toBe(2);
    expect(starsFor(0.75, false)).toBe(2);
    expect(starsFor(0.2, false)).toBe(1);
  });
});

describe('XP', () => {
  it('pays performance plus a first-clear bonus on the first run', () => {
    const { gain, progress } = applyRun(emptyProgress(), run());
    expect(gain.total).toBe(BASE_XP[2] + FIRST_CLEAR_XP);
    expect(gain.firstClear).toBe(true);
    expect(progress.xp).toBe(gain.total);
  });
  it('scales with score', () => {
    const low = applyRun(emptyProgress(), run({ score: 0 })).gain.total;
    const high = applyRun(emptyProgress(), run({ score: 1 })).gain.total;
    expect(high).toBeGreaterThan(low);
  });
  it('pays only for improvement on a replay, so it cannot be farmed', () => {
    const first = applyRun(emptyProgress(), run({ score: 0.5 })).progress;
    const same = applyRun(first, run({ score: 0.5 }));
    expect(same.gain.total).toBe(0);
    const better = applyRun(first, run({ score: 1 }));
    expect(better.gain.total).toBeGreaterThan(0);
    expect(better.progress.xp).toBe(first.xp + better.gain.total);
    const worse = applyRun(better.progress, run({ score: 0.1 }));
    expect(worse.gain.total).toBe(0);
    expect(worse.progress.entries.a?.best).toBe(1);
  });
  it('pays once for each new red-flag card', () => {
    const first = applyRun(emptyProgress(), run({ kinds: ['urgency', 'secrecy'] }));
    expect(first.gain.newCards).toEqual(['urgency', 'secrecy']);
    const again = applyRun(first.progress, run({ entryId: 'b', kinds: ['urgency', 'odd_link'] }));
    expect(again.gain.newCards).toEqual(['odd_link']);
    expect(again.gain.lines.find((l) => l.key === 'newCards')?.xp).toBe(CARD_XP);
  });
});

describe('ranks', () => {
  it('rises with XP', () => {
    expect(rankFor(0)).toBe('rookie');
    expect(rankFor(150)).toBe('watchful');
    expect(rankFor(799)).toBe('sharp');
    expect(rankFor(5000)).toBe('guardian');
  });
  it('reports progress to the next rank', () => {
    const p = rankProgress(200);
    expect(p).toMatchObject({ rank: 'watchful', next: 'sharp', toNext: 200 });
    expect(p.fraction).toBeCloseTo(50 / 250);
    expect(rankProgress(9999).next).toBeNull();
  });
  it('reports a rank-up in the gain', () => {
    const p = { ...emptyProgress(), xp: 140 };
    const { gain } = applyRun(p, run({ entryId: 'c', simulatorId: 'inbox', level: 3 }));
    expect(gain.rankBefore).toBe('rookie');
    expect(gain.rankAfter).toBe('watchful');
  });
});

describe('badges', () => {
  it('awards the first-room and flawless badges', () => {
    const { gain } = applyRun(emptyProgress(), run());
    expect(gain.newBadges).toEqual(expect.arrayContaining(['first_room', 'flawless']));
  });
  it('awards a simulator badge when every room in it is played, and all_rooms at the end', () => {
    let p = applyRun(emptyProgress(), run({ entryId: 'a' })).progress;
    expect(p.badges).not.toContain('sim_upi');
    const second = applyRun(p, run({ entryId: 'b' }));
    expect(second.gain.newBadges).toContain('sim_upi');
    p = second.progress;
    const third = applyRun(p, run({ entryId: 'c', simulatorId: 'inbox' }));
    expect(third.gain.newBadges).toEqual(expect.arrayContaining(['sim_inbox', 'all_rooms']));
  });
  it('awards the collector badge at all seven cards', () => {
    const kinds = ['urgency', 'too_good', 'asks_secret', 'pretends', 'secrecy', 'odd_link', 'pulls_money'];
    expect(kinds).toHaveLength(ALL_CARDS);
    expect(applyRun(emptyProgress(), run({ kinds })).gain.newBadges).toContain('card_collector');
  });
  it('never awards the same badge twice', () => {
    const first = applyRun(emptyProgress(), run()).progress;
    expect(applyRun(first, run()).gain.newBadges).toEqual([]);
  });
});

describe('streaks and path', () => {
  it('counts consecutive days', () => {
    expect(streakDays([])).toBe(0);
    expect(streakDays(['2026-10-09', '2026-10-10', '2026-10-11'])).toBe(3);
    expect(streakDays(['2026-10-01', '2026-10-10', '2026-10-11'])).toBe(2);
  });
  it('recommends the first unplayed room on the path', () => {
    const p = applyRun(emptyProgress(), run({ entryId: 'a' })).progress;
    expect(nextOnPath(['a', 'b', 'c'], p)).toBe('b');
    expect(nextOnPath(['a'], p)).toBeNull();
  });
});
