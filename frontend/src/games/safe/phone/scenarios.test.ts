/** Every script validates and every text key it uses exists in safe.json. */
import { describe, expect, it } from 'vitest';
import { t } from '@/platform';
import { inboxDay, listScenarios } from './scenarios';
import collectTemplate from '../../../content/scenarios/safe/templates/collect_request.json';
import qrTemplate from '../../../content/scenarios/safe/templates/qr_receive.json';
import checkPool from '../../../content/scenarios/safe/pools/upi_check.json';
import { collectRequestVariant, qrReceiveVariant } from '../upi-simulator/logic/variants';
import { validateScenario } from './logic/validate';
import { TELL_META } from './tells';
import type { Scenario } from './logic/types';

function keysOf(s: Scenario): string[] {
  const keys = [s.titleKey, s.briefKey, ...s.objectives.map((o) => o.textKey)];
  for (const { surface } of s.steps) {
    if (surface.explainKey) keys.push(surface.explainKey);
    for (const l of surface.lens ?? []) keys.push(l.revealKey);
    for (const x of surface.tells ?? []) keys.push(x.whyKey);
    for (const a of surface.actions ?? []) keys.push(a.labelKey);
    if ('body' in surface) keys.push(...surface.body.map((g) => g.k));
    if ('lines' in surface) keys.push(...surface.lines.map((g) => g.k));
    if (surface.type === 'mail') keys.push(surface.subjectKey);
    if (surface.type === 'page') keys.push(surface.titleKey, ...(surface.fields ?? []).map((f) => f.labelKey));
    if (surface.type === 'permission') keys.push(surface.appKey, surface.askKey);
    if (surface.type === 'pay-request') keys.push(surface.noteKey);
  }
  return keys;
}

describe('phone scenarios', () => {
  const generated = [
    ...[1, 2, 3, 4, 5, 6, 7, 8].map((seed) => inboxDay({ seed, count: 10, level: 3 })),
    collectRequestVariant(collectTemplate as unknown as Scenario, 1),
    qrReceiveVariant(qrTemplate as unknown as Scenario, 1),
  ];
  const all = [...listScenarios(), ...generated];
  it('loads the shipped scripts', () => expect(listScenarios().length).toBeGreaterThanOrEqual(2));
  it('has every feedback text', () => {
    const keys = [
      ...['exact', 'safe', 'wrong', 'best', 'ok'].map((g) => `safe.fb.title.${g}`),
      'safe.fb.judge.scam_suspicious', 'safe.fb.judge.suspicious_scam', 'safe.fb.judge.unsafe', 'safe.fb.judge.false_alarm',
      ...['scam', 'genuine'].flatMap((k) => ['block', 'ignore', 'ask', 'open'].map((a) => `safe.fb.inbox.${k}.${a}`)),
    ];
    expect(keys.filter((k) => t(k) === k)).toEqual([]);
  });
  it('every judge item and inbox message explains itself', () => {
    for (const s of all) for (const step of s.steps) if (step.surface.verdict || step.surface.respond) expect(step.surface.explainKey, `${s.id}/${step.id}`).toBeTruthy();
  });
  it('has every text key for the UPI check questions', () => {
    const keys = checkPool.flatMap((q) => [q.promptKey, q.whyKey, ...q.options.map((o) => o.textKey)]);
    expect(keys.filter((k) => t(k) === k)).toEqual([]);
  });
  for (const s of all) {
    it(`${s.id} validates`, () => expect(validateScenario(s)).toEqual([]));
    it(`${s.id} has every text key`, () => {
      const missing = keysOf(s).filter((k) => t(k) === k);
      expect(missing).toEqual([]);
    });
  }
  it('every red-flag kind has a name and hint', () => {
    for (const m of Object.values(TELL_META)) expect([t(m.nameKey), t(m.hintKey)].some((x) => x.startsWith('safe.'))).toBe(false);
  });
});
