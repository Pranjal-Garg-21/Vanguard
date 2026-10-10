import { describe, expect, it } from 'vitest';
import prompts from '@/content/facilitator/prompts.json';
import concepts from '@/content/facilitator/concepts.json';
import type { EventRow, PlayerRow } from './data';
import { conceptName, summariseClass, SUPPORT_MIN_ANSWERS } from './insights';

const NOW = Date.UTC(2026, 9, 11, 12);
const iso = (daysAgo: number) => new Date(NOW - daysAgo * 86_400_000).toISOString();
const player = (pid: string, last: number | null = 0): PlayerRow => ({ pid, display_name: pid.toUpperCase(), first_seen: iso(5), last_sync: last === null ? null : iso(last) });
const ev = (pid: string, concept: string, correct: boolean | null, over: Partial<EventRow> = {}): EventRow => ({ pid, concept, correct, misconception: null, activity: 'UC-SAFE-01', ts: iso(1), ...over });

describe('class summary', () => {
  it('counts students active this week and synced today', () => {
    const s = summariseClass([ev('a', 'upi_collect', true), ev('b', 'upi_collect', true, { ts: iso(10) })], [player('a', 0), player('b', 3), player('c', null)], NOW);
    expect(s.activeThisWeek).toBe(1);
    expect(s.syncedToday).toBe(1);
    expect(s.totalEvents).toBe(2);
  });

  it('ranks concepts from hardest to easiest and ignores unscored events', () => {
    const events = [ev('a', 'fake_kyc', false), ev('b', 'fake_kyc', false), ev('a', 'upi_collect', true), ev('b', 'upi_collect', true), ev('a', 'red_flags', null)];
    const s = summariseClass(events, [player('a'), player('b')], NOW);
    expect(s.concepts.map((c) => c.concept)).toEqual(['fake_kyc', 'upi_collect']);
    expect(s.concepts[0]).toMatchObject({ rate: 0, students: 2, answers: 2 });
  });

  it('lists the top three misconceptions from the last week by number of students', () => {
    const mk = (pid: string, m: string, over: Partial<EventRow> = {}) => ev(pid, 'x', false, { misconception: m, ...over });
    const events = [mk('a', 'm1'), mk('b', 'm1'), mk('c', 'm1'), mk('a', 'm2'), mk('b', 'm2'), mk('a', 'm3'), mk('a', 'm4'), mk('a', 'old', { ts: iso(20) })];
    const s = summariseClass(events, [player('a'), player('b'), player('c')], NOW);
    expect(s.misconceptions.map((m) => [m.id, m.students])).toEqual([['m1', 3], ['m2', 2], ['m3', 1]]);
  });

  it('flags a student for support only after enough answers, and names their weakest concept', () => {
    const weak = Array.from({ length: SUPPORT_MIN_ANSWERS }, (_, i) => ev('a', i < 3 ? 'fake_kyc' : 'upi_collect', i === 5));
    const few = [ev('b', 'fake_kyc', false), ev('b', 'fake_kyc', false)];
    const strong = Array.from({ length: SUPPORT_MIN_ANSWERS }, () => ev('c', 'upi_collect', true));
    const s = summariseClass([...weak, ...few, ...strong], [player('a'), player('b'), player('c'), player('d')], NOW);
    const by = Object.fromEntries(s.students.map((x) => [x.pid, x]));
    expect(by.a).toMatchObject({ needsSupport: true, weakest: 'fake_kyc' });
    expect(by.b?.needsSupport).toBe(false);
    expect(by.c).toMatchObject({ needsSupport: false, accuracy: 1, weakest: null });
    expect(by.d).toMatchObject({ answers: 0, accuracy: null });
    expect(s.students[0]?.pid).toBe('a'); // needs support first
  });

  it('shows the latest events with the student name', () => {
    const events = Array.from({ length: 12 }, (_, i) => ev(i % 2 ? 'a' : 'b', 'upi_collect', true, { ts: iso(i / 10) }));
    const s = summariseClass(events, [player('a'), player('b')], NOW);
    expect(s.recent).toHaveLength(8);
    expect(s.recent[0]!.ts > s.recent[7]!.ts).toBe(true);
    expect(s.recent[0]?.name).toBe('B');
  });
});

describe('labels and prompts', () => {
  it('gives every Stay Safe concept a friendly name', () => {
    for (const id of Object.keys(concepts)) expect(conceptName(id)).not.toBe(id);
    expect(conceptName('some_new_concept')).toBe('Some new concept');
  });

  it('has a discussion prompt for every misconception the games can record', () => {
    const emitted = ['pin_needed_to_receive', 'bank_asks_otp', 'bank_will_call_for_otp', 'trust_sms_credit', 'trust_familiar_name', 'trust_familiar_account', 'authority_demands_money', 'search_result_is_official', 'loan_app_permissions', 'fraud_recovery_mistake', 'scan_to_receive', 'pay_to_get_job', 'pay_to_win', 'click_unknown_link', 'distrust_everything', 'pin_uncovered'];
    expect(emitted.filter((m) => !(m in prompts))).toEqual([]);
  });
});
