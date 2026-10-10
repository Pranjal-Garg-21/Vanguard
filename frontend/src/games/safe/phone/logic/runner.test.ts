import { describe, expect, it } from 'vitest';
import kyc from '../../../../content/scenarios/safe/kyc_expiry_01.json';
import collectTemplate from '../../../../content/scenarios/safe/templates/collect_request.json';
import { collectRequestVariant } from '../../upi-simulator/logic/variants';
import inbox from '../../../../content/scenarios/safe/inbox_judge_01.json';
import { bankBalance, createRun, foundTells, objectiveDone, reduce, replay, tellReport } from './runner';
import { judgedSafely, scoreRun, summarise } from './scoring';
import type { RunAction, RunState, Scenario } from './types';
import { validateScenario } from './validate';

const KYC = kyc as Scenario;
const COLLECT = collectRequestVariant(collectTemplate as unknown as Scenario, 1, 3400);
const INBOX = inbox as Scenario;

const run = (state: RunState, ...actions: RunAction[]) => actions.reduce(reduce, state);

describe('scripts are well formed', () => {
  for (const s of [KYC, COLLECT, INBOX]) {
    it(s.id, () => expect(validateScenario(s)).toEqual([]));
  }
});

describe('runner timing', () => {
  it('delivers steps at their time, not before', () => {
    let s = createRun(KYC);
    expect(s.inbox).toEqual([]);
    s = run(s, { type: 'tick', ms: 1499 });
    expect(s.inbox).toEqual([]);
    s = run(s, { type: 'tick', ms: 1 });
    expect(s.inbox).toEqual(['sms']);
  });

  it('unlocks a step after the action delay and opens a foreground page', () => {
    let s = run(createRun(KYC), { type: 'tick', ms: 1500 }, { type: 'act', surface: 'sms', action: 'open_link' });
    expect(s.inbox).toEqual(['sms']);
    s = run(s, { type: 'tick', ms: 700 });
    expect(s.inbox).toEqual(['sms', 'page']);
    expect(s.open).toBe('page');
  });

  it('only lets a surface be answered once', () => {
    const s = run(createRun(KYC), { type: 'tick', ms: 1500 }, { type: 'act', surface: 'sms', action: 'ignore' }, { type: 'act', surface: 'sms', action: 'block' });
    expect(s.acted.sms).toBe('ignore');
    expect(s.history.filter((h) => h.kind === 'acted')).toHaveLength(1);
  });
});

describe('neutral steps', () => {
  it('close the screen once the student moves on, so a decision cannot be undone', () => {
    let s = run(createRun(KYC), { type: 'tick', ms: 1500 }, { type: 'act', surface: 'sms', action: 'open_link' });
    expect(s.acted.sms).toBeUndefined();
    s = run(s, { type: 'act', surface: 'sms', action: 'open_link' });
    expect(s.history.filter((h) => h.kind === 'acted')).toHaveLength(1);
    // Having moved on to the page, the message's own options are closed.
    expect(s.moved).toContain('sms');
    s = run(s, { type: 'act', surface: 'sms', action: 'ignore' });
    expect(s.ended).toBe(false);
    s = run(s, { type: 'tick', ms: 700 }, { type: 'act', surface: 'page', action: 'close_page' });
    expect(s.outcome).toBe('safe');
  });
});

describe('effects and money', () => {
  const fooled = () =>
    run(
      createRun(KYC),
      { type: 'tick', ms: 1500 },
      { type: 'act', surface: 'sms', action: 'open_link' },
      { type: 'tick', ms: 700 },
      { type: 'act', surface: 'page', action: 'submit_otp' },
    );

  it('moves simulated money and ends fooled', () => {
    const s = fooled();
    expect(bankBalance(s)).toBe(6200 - 4999);
    expect(s.outcome).toBe('fooled');
    expect(s.ended).toBe(true);
  });

  it('reports effects to the game only in LifePath mode', () => {
    expect(scoreRun(fooled(), 'lifepath').effects).toEqual({ 'money.bank': -4999 });
    expect(scoreRun(fooled(), 'arcade').effects).toBeUndefined();
    expect(scoreRun(fooled(), 'quickplay').effects).toBeUndefined();
  });

  it('records the misconception and a wrong choice', () => {
    const result = scoreRun(fooled(), 'arcade');
    expect(result.misconceptions).toContain('bank_asks_otp');
    expect(result.choices.find((c) => c.choiceId === 'submit_otp')?.correct).toBe(false);
    expect(result.conceptDeltas.fake_kyc).toBe(0);
  });

  it('does not lose money when you ignore it', () => {
    const s = run(createRun(KYC), { type: 'tick', ms: 1500 }, { type: 'act', surface: 'sms', action: 'ignore' });
    expect(bankBalance(s)).toBe(6200);
    expect(scoreRun(s, 'lifepath').effects).toBeUndefined();
    expect(scoreRun(s, 'lifepath').conceptDeltas.fake_kyc).toBe(1);
  });
});

describe('timers', () => {
  const toRequest = (timersOff: boolean) =>
    run(createRun(COLLECT, { timersOff }), { type: 'tick', ms: 800 }, { type: 'act', surface: 'chat', action: 'wait' }, { type: 'tick', ms: 2000 });

  it('auto-expires the request when timers are on', () => {
    const s = run(toRequest(false), { type: 'tick', ms: 15000 });
    expect(s.acted.request).toBe('expire');
    expect(s.outcome).toBe('safe');
  });

  it('never auto-fails with timers off', () => {
    const s = run(toRequest(true), { type: 'tick', ms: 600000 });
    expect(s.acted.request).toBeUndefined();
    expect(s.ended).toBe(false);
    expect(bankBalance(s)).toBe(3400);
  });
});

describe('lens and tells', () => {
  const opened = () => run(createRun(KYC), { type: 'tick', ms: 1500 }, { type: 'open', surface: 'sms' });

  it('maps inspected lenses to tells', () => {
    let s = opened();
    expect(foundTells(s, 'sms')).toEqual([]);
    s = run(s, { type: 'inspect', surface: 'sms', lens: 'today' }, { type: 'inspect', surface: 'sms', lens: 'link' });
    expect(foundTells(s, 'sms').sort()).toEqual(['link', 'urgency']);
    const report = tellReport(s, 'sms');
    expect(report.found).toHaveLength(2);
    expect(report.missed.map((t) => t.id)).toEqual(['sender']);
  });

  it('ignores inspecting something that has not arrived', () => {
    const s = run(createRun(KYC), { type: 'inspect', surface: 'sms', lens: 'link' });
    expect(s.inspected).toEqual([]);
  });

  it('evaluates objectives', () => {
    let s = opened();
    expect(objectiveDone(s, 'opened:sms')).toBe(true);
    expect(objectiveDone(s, 'inspected:sender')).toBe(false);
    s = run(s, { type: 'inspect', surface: 'sms', lens: 'sender' });
    expect(objectiveDone(s, 'inspected:sender')).toBe(true);
  });
});

describe('judge mode', () => {
  const all = () => run(createRun(INBOX), { type: 'tick', ms: 2000 });

  it('treats suspicious and scam as safe handling of a scam', () => {
    expect(judgedSafely('scam', 'suspicious')).toBe(true);
    expect(judgedSafely('scam', 'legit')).toBe(false);
    expect(judgedSafely('legit', 'scam')).toBe(false);
  });

  it('ends when every item has a verdict and scores them', () => {
    let s = all();
    expect(s.inbox).toHaveLength(6);
    const said = { bank: 'legit', mom: 'scam', friend: 'scam', job: 'scam', call: 'suspicious', parcel: 'legit' } as const;
    for (const [surface, verdict] of Object.entries(said)) s = run(s, { type: 'judge', surface, verdict });
    expect(s.ended).toBe(true);
    const result = scoreRun(s, 'arcade');
    expect(result.choices).toHaveLength(6);
    expect(result.conceptDeltas.red_flags).toBeCloseTo(4 / 6);
    expect(result.misconceptions).toEqual(expect.arrayContaining(['click_unknown_link']));
    expect(summarise(s).judgedRight).toBe(4);
  });
});

describe('replay', () => {
  it('gives the identical state from the same actions', () => {
    const log: RunAction[] = [
      { type: 'tick', ms: 1500 },
      { type: 'open', surface: 'sms' },
      { type: 'inspect', surface: 'sms', lens: 'link' },
      { type: 'act', surface: 'sms', action: 'open_link' },
      { type: 'tick', ms: 700 },
      { type: 'act', surface: 'page', action: 'close_page' },
    ];
    expect(replay(KYC, log)).toEqual(replay(KYC, log));
    expect(replay(KYC, log).outcome).toBe('safe');
  });
});
