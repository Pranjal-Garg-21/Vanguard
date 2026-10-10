import { describe, expect, it } from 'vitest';
import pool from '../../../../content/scenarios/safe/pools/inbox_pool.json';
import { buildInboxDay, type PoolItem } from './inbox';
import { createRun, reduce } from './runner';
import { scoreRun, summarise } from './scoring';
import type { RunAction, Surface } from './types';
import { validateScenario } from './validate';

const POOL = pool as unknown as PoolItem[];

describe('inbox pool', () => {
  it('scams have red flags and real messages have none', () => {
    for (const item of POOL) {
      const tells = item.surface.tells ?? [];
      if (item.kind === 'scam') expect(tells.length, item.id).toBeGreaterThan(0);
      else expect(tells, item.id).toHaveLength(0);
    }
  });
  it('has at least one real message for every four scams', () => {
    const real = POOL.filter((p) => p.kind === 'genuine').length;
    expect(real * 4).toBeGreaterThanOrEqual(POOL.filter((p) => p.kind === 'scam').length - 2);
  });
  it('every scam says how much would be lost', () => {
    for (const item of POOL.filter((p) => p.kind === 'scam')) expect(item.whatIf?.loss, item.id).toBeGreaterThan(0);
  });
});

describe('buildInboxDay', () => {
  it('builds a valid script', () => expect(validateScenario(buildInboxDay(POOL, { seed: 7 }))).toEqual([]));

  it('is the same for the same seed and different for another', () => {
    const ids = (seed: number) => buildInboxDay(POOL, { seed }).steps.map((s) => s.id).join(',');
    expect(ids(1)).toEqual(ids(1));
    expect(new Set([1, 2, 3, 4, 5, 6].map(ids)).size).toBeGreaterThan(1);
  });

  it('always includes a real message, and mostly scams', () => {
    for (let seed = 1; seed <= 25; seed++) {
      const s = buildInboxDay(POOL, { seed, count: 6 });
      const msgs = s.steps.filter((x) => x.surface.respond);
      expect(msgs).toHaveLength(6);
      const real = msgs.filter((x) => x.surface.genuine).length;
      expect(real).toBeGreaterThanOrEqual(1);
      expect(real).toBeLessThan(4);
    }
  });

  it('level 1 excludes harder messages', () => {
    const s = buildInboxDay(POOL, { seed: 3, count: 6, level: 1 });
    expect(s.steps.some((x) => x.id === 'task')).toBe(false);
  });
});

describe('playing an inbox day', () => {
  const day = () => buildInboxDay(POOL, { seed: 11, count: 6 });
  const respondAll = (choose: (s: Surface) => string) => {
    const script = day();
    let s = reduce(createRun(script), { type: 'tick', ms: 60000 });
    for (const step of script.steps.filter((x) => x.surface.respond)) {
      const a: RunAction = { type: 'act', surface: step.id, action: choose(step.surface) };
      s = reduce(s, a);
      if (s.pending.length > 0) s = reduce(s, { type: 'tick', ms: 1000 });
      const whatif = `${step.id}__whatif`;
      if (s.inbox.includes(whatif)) s = reduce(s, { type: 'act', surface: whatif, action: 'continue' });
    }
    return s;
  };

  it('ends when every message is answered, safely if nothing risky was done', () => {
    const s = respondAll((surface) => (surface.genuine ? 'open' : 'block'));
    expect(s.ended).toBe(true);
    expect(s.outcome).toBe('safe');
    expect(s.effects['money.bank']).toBeUndefined();
    expect(summarise(s).falseAlarms).toBe(0);
  });

  it('opening scams loses money and the what-if card closes', () => {
    const s = respondAll(() => 'open');
    expect(s.outcome).toBe('fooled');
    expect(s.effects['money.bank']).toBeLessThan(0);
    expect(s.open).toBeNull();
  });

  it('blocking a real message is a false alarm', () => {
    const s = respondAll(() => 'block');
    const sum = summarise(s);
    expect(sum.falseAlarms).toBeGreaterThanOrEqual(1);
    expect(s.outcome).toBe('safe');
    expect(scoreRun(s, 'arcade').misconceptions).toContain('distrust_everything');
  });

  it('only reports money effects in LifePath mode', () => {
    const s = respondAll(() => 'open');
    expect(scoreRun(s, 'arcade').effects).toBeUndefined();
    expect(scoreRun(s, 'lifepath').effects?.['money.bank']).toBeLessThan(0);
  });
});
