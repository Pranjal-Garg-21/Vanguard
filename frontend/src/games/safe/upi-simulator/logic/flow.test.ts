import { describe, expect, it } from 'vitest';
import type { MiniGameResult } from '@/core/types';
import { collectRequestVariant, pickCollectVariant, qrReceiveVariant } from './variants';
import collectTemplate from '../../../../content/scenarios/safe/templates/collect_request.json';
import qrTemplate from '../../../../content/scenarios/safe/templates/qr_receive.json';
import { validateScenario } from '../../phone/logic/validate';
import type { Scenario } from '../../phone/logic/types';
import { CANTEEN_AMOUNT, createFlow, MAX_PIN_TRIES, reduce, START_BALANCE, toResult, type FlowEvent, type FlowState } from './flow';

const run = (s: FlowState, ...events: FlowEvent[]) => events.reduce(reduce, s);
const setupDone = () => run(createFlow(), { type: 'next' }, { type: 'link' }, { type: 'setPin', pin: '2957', covered: true });
const paid = () => run(setupDone(), { type: 'scan' }, { type: 'pay', pin: '2957', covered: true });

const collectResult = (fooled: boolean, amount = 1200): MiniGameResult => ({
  choices: [{ stepId: 'request', choiceId: fooled ? 'enter_pin' : 'decline', correct: !fooled, ms: 0 }],
  conceptDeltas: {},
  misconceptions: fooled ? ['pin_needed_to_receive'] : [],
  ...(fooled ? { effects: { 'money.bank': -amount } } : {}),
  summaryKey: 'x',
});

describe('setup and first payment', () => {
  it('rejects weak PINs and stays on the screen', () => {
    const s = run(createFlow(), { type: 'next' }, { type: 'link' }, { type: 'setPin', pin: '1234', covered: true });
    expect(s.chapter).toBe('setPin');
    expect(s.pin).toBeNull();
    expect(s.message).toBe('weak');
  });

  it('pays the canteen and lowers the balance by exactly that amount', () => {
    const s = paid();
    expect(s.chapter).toBe('paid');
    expect(s.balance).toBe(START_BALANCE - CANTEEN_AMOUNT);
  });

  it('a wrong PIN changes nothing, and three wrong tries cancel the payment', () => {
    let s = run(setupDone(), { type: 'scan' }, { type: 'pay', pin: '0001', covered: true });
    expect(s.balance).toBe(START_BALANCE);
    expect(s.message).toBe('wrong');
    for (let i = 1; i < MAX_PIN_TRIES; i++) s = reduce(s, { type: 'pay', pin: '0001', covered: true });
    expect(s.chapter).toBe('payScan');
    expect(s.balance).toBe(START_BALANCE);
    expect(s.message).toBe('locked');
  });

  it('records a missed keypad cover as a misconception', () => {
    const s = run(createFlow(), { type: 'next' }, { type: 'link' }, { type: 'setPin', pin: '2957', covered: false });
    expect(toResult(s, 'arcade').misconceptions).toContain('pin_uncovered');
    expect(s.choices[0]?.correct).toBe(false);
  });

  it('ignores moves that do not belong to the current chapter', () => {
    expect(reduce(createFlow(), { type: 'pay', pin: '2957', covered: true }).chapter).toBe('intro');
    expect(reduce(createFlow(), { type: 'check', answers: [] }).chapter).toBe('intro');
  });
});

describe('every path reaches done', () => {
  const answers = (ok: boolean) => ['q_collect', 'q_pin', 'q_refund'].map((id) => ({ id, concept: 'upi_collect', correct: ok, choice: 'x' }));
  const play = (fooled: boolean) =>
    run(paid(), { type: 'next' }, { type: 'script', chapter: 'collect', result: collectResult(fooled) }, { type: 'next' },
      { type: 'script', chapter: 'qr', result: collectResult(fooled, 800) }, { type: 'next' }, { type: 'check', answers: answers(!fooled) });

  it('declining both ends in done with no loss', () => {
    const s = play(false);
    expect(s.chapter).toBe('done');
    expect(s.balance).toBe(START_BALANCE - CANTEEN_AMOUNT);
  });

  it('falling for both ends in done and the balance shows the loss', () => {
    const s = play(true);
    expect(s.chapter).toBe('done');
    expect(s.balance).toBe(START_BALANCE - CANTEEN_AMOUNT - 1200 - 800);
  });

  it('reports money effects only in LifePath mode', () => {
    const s = play(true);
    expect(toResult(s, 'arcade').effects).toBeUndefined();
    expect(toResult(s, 'quickplay').effects).toBeUndefined();
    expect(toResult(s, 'lifepath').effects).toEqual({ 'money.bank': -2000 });
    expect(toResult(s, 'arcade').misconceptions).toContain('pin_needed_to_receive');
  });
});

describe('seeded variants', () => {
  const collect = collectTemplate as unknown as Scenario;
  const qr = qrTemplate as unknown as Scenario;

  it('are valid scripts for many seeds, with all four collect red flags present', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const s = collectRequestVariant(collect, seed);
      expect(validateScenario(s), `seed ${seed}`).toEqual([]);
      const req = s.steps.find((x) => x.id === 'request')?.surface;
      expect(req?.tells?.map((t) => t.id).sort()).toEqual(['mismatch', 'pin', 'pulls', 'timer']);
      expect(validateScenario(qrReceiveVariant(qr, seed)), `qr ${seed}`).toEqual([]);
    }
  });

  it('is the same for the same seed and the amount stays in range', () => {
    expect(pickCollectVariant(5)).toEqual(pickCollectVariant(5));
    for (let seed = 1; seed <= 50; seed++) {
      const v = pickCollectVariant(seed);
      expect(v.amount).toBeGreaterThanOrEqual(800);
      expect(v.amount).toBeLessThanOrEqual(2000);
      expect(v.payee.toLowerCase()).not.toContain(v.buyer.toLowerCase());
    }
  });

  it('the loss matches the amount shown', () => {
    const s = collectRequestVariant(collect, 9);
    const req = s.steps.find((x) => x.id === 'request')?.surface;
    if (req?.type !== 'pay-request') throw new Error('no request');
    expect(req.actions?.find((a) => a.id === 'enter_pin')?.effects?.['money.bank']).toBe(-req.amount);
  });
});
