import { describe, expect, it } from 'vitest';
import pool from '../../../../content/scenarios/safe/pools/inbox_pool.json';
import { buildInboxDay, type PoolItem } from './inbox';
import { judgeFeedback, responseFeedback } from './feedback';
import type { Surface } from './types';

const item = (verdict: 'legit' | 'suspicious' | 'scam') => ({ type: 'sms', from: 'X', body: [], verdict, explainKey: 'k' }) as unknown as Surface;

describe('judge feedback', () => {
  it('exact match is correct with no better option', () => {
    expect(judgeFeedback(item('scam'), 'scam')).toMatchObject({ grade: 'exact', best: null });
  });
  it('scam called suspicious is safe, and scam is the better label', () => {
    expect(judgeFeedback(item('scam'), 'suspicious')).toMatchObject({ grade: 'safe', best: 'scam', noteKey: 'safe.fb.judge.scam_suspicious' });
  });
  it('suspicious called scam is safe, and suspicious is the more accurate label', () => {
    expect(judgeFeedback(item('suspicious'), 'scam')).toMatchObject({ grade: 'safe', best: 'suspicious', noteKey: 'safe.fb.judge.suspicious_scam' });
  });
  it('a scam called legit is wrong and unsafe', () => {
    expect(judgeFeedback(item('scam'), 'legit')).toMatchObject({ grade: 'wrong', noteKey: 'safe.fb.judge.unsafe' });
  });
  it('a real message called a scam is a false alarm', () => {
    expect(judgeFeedback(item('legit'), 'scam')).toMatchObject({ grade: 'wrong', noteKey: 'safe.fb.judge.false_alarm' });
  });
});

describe('inbox response feedback', () => {
  const day = buildInboxDay(pool as unknown as PoolItem[], { seed: 4, count: 10, level: 3 });
  const surfaces = day.steps.map((s) => s.surface).filter((s) => s.respond);
  const scam = surfaces.find((s) => !s.genuine) as Surface;
  const real = surfaces.find((s) => s.genuine) as Surface;

  it('scam: block is best, ignore and ask are ok with block as the better option, open is wrong', () => {
    expect(responseFeedback(scam, 'block')).toMatchObject({ grade: 'best', best: null });
    expect(responseFeedback(scam, 'ignore')).toMatchObject({ grade: 'ok', best: 'block' });
    expect(responseFeedback(scam, 'ask')).toMatchObject({ grade: 'ok', best: 'block' });
    expect(responseFeedback(scam, 'open')).toMatchObject({ grade: 'wrong' });
  });
  it('real: open is best, ask and ignore are ok, block is a false alarm', () => {
    expect(responseFeedback(real, 'open')).toMatchObject({ grade: 'best' });
    expect(responseFeedback(real, 'ask')).toMatchObject({ grade: 'ok', best: 'open' });
    expect(responseFeedback(real, 'ignore')).toMatchObject({ grade: 'ok', best: 'open' });
    expect(responseFeedback(real, 'block')).toMatchObject({ grade: 'wrong', noteKey: 'safe.fb.inbox.genuine.block' });
  });
});
