/**
 * Plays every possible path through each scenario. Checks that no path gets
 * stuck, that a safe ending exists, and that a loss is possible where a script
 * says money can be lost.
 */
import { describe, expect, it } from 'vitest';
import checkTemplate from '../../../../content/scenarios/safe/customer_care.json';
import loan from '../../../../content/scenarios/safe/loan_trap.json';
import rescue from '../../../../content/scenarios/safe/rescue_mission.json';
import kyc from '../../../../content/scenarios/safe/kyc_expiry_01.json';
import collectTemplate from '../../../../content/scenarios/safe/templates/collect_request.json';
import qrTemplate from '../../../../content/scenarios/safe/templates/qr_receive.json';
import wrongTransfer from '../../../../content/scenarios/safe/templates/wrong_transfer.json';
import hackedFriend from '../../../../content/scenarios/safe/templates/hacked_friend.json';
import digitalArrest from '../../../../content/scenarios/safe/templates/digital_arrest.json';
import { collectRequestVariant, qrReceiveVariant } from '../../upi-simulator/logic/variants';
import { createRun, reduce } from './runner';
import { scoreRun } from './scoring';
import { applyVariant, type VariantSpec } from './variants';
import type { RunState, Scenario } from './types';

type Path = { state: RunState; actions: string[] };

/** Every way the run can go, trying each unused action on each delivered screen. */
function explore(script: Scenario): Path[] {
  const out: Path[] = [];
  const deliver = (s: RunState) => reduce(s, { type: 'tick', ms: 30000 });
  const walk = (state: RunState, actions: string[], depth: number) => {
    if (state.ended) return void out.push({ state, actions });
    if (depth > 14) throw new Error(`too deep: ${script.id} ${actions.join('>')}`);
    const options: { surface: string; action: string }[] = [];
    for (const id of state.inbox) {
      const surface = script.steps.find((x) => x.id === id)?.surface;
      if (!surface || state.acted[id] || state.moved.includes(id)) continue;
      for (const a of surface.actions ?? []) {
        const used = state.history.some((h) => h.kind === 'acted' && h.surface === id && h.action === a.id);
        if (!used && a.id !== surface.timeout?.action) options.push({ surface: id, action: a.id });
      }
    }
    // A stuck run: nothing to do and nothing on its way.
    expect(options.length > 0 || state.pending.length > 0, `stuck in ${script.id} after ${actions.join('>')}`).toBe(true);
    if (options.length === 0) return walk(deliver(state), actions, depth + 1);
    for (const o of options) walk(deliver(reduce(state, { type: 'act', surface: o.surface, action: o.action })), [...actions, `${o.surface}.${o.action}`], depth + 1);
  };
  walk(deliver(createRun(script, { timersOff: true })), [], 0);
  return out;
}

const template = (t: unknown, spec: VariantSpec) => applyVariant(t as Scenario, 3, spec);
const NAMES = { pools: { name: ['Vikram S.'], amount: [2000] }, derive: () => ({ newbal: '5,400' }), loss: [{ surface: 'chat', action: 'pay_back', key: 'amount' }, { surface: 'sms', action: 'pay_back', key: 'amount' }, { surface: 'bankapp', action: 'pay_anyway', key: 'amount' }] } satisfies VariantSpec;

const CASES: [string, Scenario, boolean][] = [
  ['kyc', kyc as unknown as Scenario, true],
  ['customer care', checkTemplate as unknown as Scenario, true],
  ['loan trap', loan as unknown as Scenario, true],
  ['rescue mission', rescue as unknown as Scenario, true],
  ['collect request', collectRequestVariant(collectTemplate as unknown as Scenario, 2, 3400), true],
  ['qr receive', qrReceiveVariant(qrTemplate as unknown as Scenario, 2, 3400), true],
  ['wrong transfer', template(wrongTransfer, NAMES), true],
  ['hacked friend', template(hackedFriend, { pools: { name: ['Rohit'], amount: [3000] }, loss: [{ surface: 'm2', action: 'send', key: 'amount' }, { surface: 'm3', action: 'send', key: 'amount' }] }), true],
  ['digital arrest', template(digitalArrest, { pools: { officer: ['Inspector Rao'], amount: [6000] }, loss: [{ surface: 'c3', action: 'transfer', key: 'amount' }] }), true],
];

describe('every path through every scenario', () => {
  for (const [name, script, canLose] of CASES) {
    it(`${name}: always ends, has a safe ending, and can cost money only where scripted`, () => {
      const paths = explore(script);
      expect(paths.length).toBeGreaterThan(1);
      expect(paths.every((p) => p.state.ended)).toBe(true);
      expect(paths.some((p) => p.state.outcome === 'safe')).toBe(true);
      const lost = paths.filter((p) => (p.state.effects['money.bank'] ?? 0) < 0);
      if (canLose) expect(lost.length).toBeGreaterThan(0);
      // Money is only ever lost on a path that ended as fooled.
      for (const p of lost) expect(p.state.outcome, `${name}: ${p.actions.join('>')}`).toBe('fooled');
      // Losses never exceed the starting balance.
      for (const p of lost) expect(Math.abs(p.state.effects['money.bank'] as number)).toBeLessThanOrEqual(script.phone.startBalance);
      // Every path scores without error and never reports effects outside LifePath.
      for (const p of paths) expect(scoreRun(p.state, 'arcade').effects).toBeUndefined();
    });
  }

  it('the best path in each scenario scores full marks', () => {
    for (const [name, script] of CASES) {
      const best = explore(script).map((p) => scoreRun(p.state, 'arcade')).map((r) => Object.values(r.conceptDeltas).reduce((a, b) => a + b, 0) / Math.max(1, Object.keys(r.conceptDeltas).length));
      expect(Math.max(...best), name).toBe(1);
    }
  });
});
