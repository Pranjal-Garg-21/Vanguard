import { describe, expect, it } from 'vitest';
import { newLife, type LifeState } from '@/core/engine';
import { evalCond } from '@/core/story';
import { interact, step, type Dir, type Pos } from './index';
import { PAISAPUR } from './paisapur';

const at = (state: LifeState) => (expr: string) => evalCond(expr, state);

function walk(state: LifeState, from: Pos, dirs: Dir[]) {
  let pos = from;
  let last = step(PAISAPUR, at(state), pos, dirs[0]!).event;
  for (const d of dirs) {
    const r = step(PAISAPUR, at(state), pos, d);
    pos = r.event.type === 'warp' ? r.event.to : r.pos;
    last = r.event;
  }
  return { pos, last };
}

describe('Paisapur world', () => {
  const s = newLife(1);

  it('walking out of the house door lands in front of it in town', () => {
    const { pos } = walk(s, { map: 'home', x: 4, y: 5, facing: 'down' }, ['down']);
    expect(pos).toEqual({ map: 'paisapur', x: 6, y: 21, facing: 'down' });
  });

  it('walking into a door enters the building at its entry', () => {
    const { pos } = walk(s, { map: 'paisapur', x: 5, y: 8, facing: 'up' }, ['up']);
    expect(pos).toMatchObject({ map: 'lab', x: 5, y: 7 });
  });

  it('shops stay closed until chapter 2, with a sign', () => {
    const r = step(PAISAPUR, at(s), { map: 'paisapur', x: 5, y: 15, facing: 'up' }, 'up');
    expect(r.event).toEqual({ type: 'blocked', text: 'signs.closed_early' });
    const open = { ...s, chapter: 2 };
    expect(step(PAISAPUR, at(open), { map: 'paisapur', x: 5, y: 15, facing: 'up' }, 'up').event.type).toBe('warp');
  });

  it('the bridge is barricaded until the town builds it', () => {
    const blocked = step(PAISAPUR, at(s), { map: 'paisapur', x: 24, y: 4, facing: 'up' }, 'up');
    expect(blocked.event).toEqual({ type: 'blocked', text: 'signs.bridge_broken' });
    const built = { ...s, flags: { bridge_built: true } };
    expect(step(PAISAPUR, at(built), { map: 'paisapur', x: 24, y: 4, facing: 'up' }, 'up').event.type).toBe('moved');
  });

  it('talks to a clerk across the counter', () => {
    const it = interact(PAISAPUR, at(s), { map: 'bank', x: 3, y: 4, facing: 'up' });
    expect(it).toMatchObject({ type: 'npc', npc: { id: 'meena' } });
  });

  it('NPCs block the way and solid tiles stop you, but you still turn', () => {
    const r = step(PAISAPUR, at(s), { map: 'home', x: 5, y: 4, facing: 'down' }, 'up');
    expect(r.event.type).toBe('blocked');
    expect(r.pos.facing).toBe('up');
  });

  it('reads signs', () => {
    expect(interact(PAISAPUR, at(s), { map: 'paisapur', x: 7, y: 9, facing: 'up' })).toEqual({ type: 'sign', text: 'signs.lab' });
  });
});
