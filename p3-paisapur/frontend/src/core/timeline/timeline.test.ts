import { describe, expect, it } from 'vitest';
import { newLife, reduce } from '@/core/engine';
import { addCheckpoint, compare, explain, MAX_CHECKPOINTS, rewind, type Checkpoint } from './index';

const pos = { map: 'paisapur', x: 1, y: 1, facing: 'down' as const };
const cp = (label: string, month: number): Checkpoint => ({ id: `${label}@${month}`, label, month, chapter: 2, life: { ...newLife(1), month }, pos, script: 'kabir' });

describe('what-if timeline', () => {
  it('keeps one checkpoint per decision and caps the list', () => {
    let list: Checkpoint[] = [];
    for (let i = 0; i < 20; i++) list = addCheckpoint(list, cp(`d${i}`, i));
    expect(list.length).toBe(MAX_CHECKPOINTS);
    list = addCheckpoint(list, cp('d19', 30));
    expect(list.filter((c) => c.label === 'd19')).toHaveLength(1);
  });

  it('rewinding restores the old state and keeps the current life as the other life', () => {
    const now = { ...newLife(1), month: 5 };
    const cps = [cp('a', 1), cp('b', 3)];
    const r = rewind({ life: now, pos, checkpoints: cps }, 'a@1', 'a')!;
    expect(r.life.month).toBe(1);
    expect(r.checkpoints.map((c) => c.id)).toEqual(['a@1']);
    expect(r.other.life.month).toBe(5);
    expect(r.replay).toBe('kabir');
  });

  it('explains which life is better and why', () => {
    const good = reduce(reduce(newLife(1), { type: 'openAccount' }), { type: 'gain', amount: 5000, reason: 'gift' });
    const bad = reduce(newLife(1), { type: 'scamLoss', amount: 300, reason: 'scam:kyc' });
    const why = explain(compare(good, bad));
    expect(why.length).toBeGreaterThan(0);
    expect(why.every((w) => w.better === 'a')).toBe(true);
  });
});
