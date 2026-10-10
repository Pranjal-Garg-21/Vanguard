/** A finished room becomes events in the outbox, so the dashboard's streak and XP move. */
import { beforeEach, describe, expect, it } from 'vitest';
import { logResult, recentEvents } from '@/platform';
import { createTestProfile, resetDb } from '@/test/fixtures';
import kyc from '../../../content/scenarios/safe/kyc_expiry_01.json';
import { createRun, reduce } from './logic/runner';
import { scoreRun } from './logic/scoring';
import type { RunAction, Scenario } from './logic/types';

beforeEach(resetDb);

describe('room results become events', () => {
  it('logs one valid event per choice', async () => {
    await createTestProfile();
    const actions: RunAction[] = [
      { type: 'tick', ms: 1500 },
      { type: 'open', surface: 'sms' },
      { type: 'act', surface: 'sms', action: 'ignore' },
    ];
    const state = actions.reduce(reduce, createRun(kyc as Scenario));
    const results = await logResult(scoreRun(state, 'arcade'), { activity: 'UC-SAFE', concept: 'fake_kyc' });
    expect(results.every((r) => r.ok)).toBe(true);
    const events = await recentEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ activity: 'UC-SAFE', concept: 'fake_kyc', choice: 'ignore', correct: true });
  });
});
