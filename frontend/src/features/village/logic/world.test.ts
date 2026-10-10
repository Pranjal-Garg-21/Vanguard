import { describe, expect, it } from 'vitest';
import { BUILDINGS, INTERIOR_ROWS, START, VILLAGE_ROWS, isValidPosition, step, type Dir, type Position } from './world';

function walk(from: Position, dirs: Dir[]) {
  let pos = from;
  let last = step(from, 'down').event;
  for (const dir of dirs) {
    const result = step(pos, dir);
    pos = result.pos;
    last = result.event;
  }
  return { pos, last };
}

describe('maps', () => {
  it('have rectangular rows', () => {
    expect(new Set(VILLAGE_ROWS.map((r) => r.length)).size).toBe(1);
    expect(new Set(INTERIOR_ROWS.map((r) => r.length)).size).toBe(1);
  });

  it('put every building door on a door tile', () => {
    for (const b of BUILDINGS) expect(VILLAGE_ROWS[b.door.y]?.[b.door.x]).toBe('D');
  });
});

describe('step', () => {
  it('moves onto walkable tiles and updates facing', () => {
    const { pos, last } = walk(START, ['up']);
    expect(last.type).toBe('moved');
    expect(pos).toMatchObject({ x: 7, y: 3, facing: 'up' });
  });

  it('is blocked by roofs but still turns to face them', () => {
    const { pos, last } = walk(START, ['down']);
    expect(last.type).toBe('blocked');
    expect(pos).toMatchObject({ x: 7, y: 4, facing: 'down' });
  });

  it('is blocked by the edge of the map', () => {
    const { last } = walk({ scene: 'village', x: 1, y: 4, facing: 'left' }, ['left', 'left']);
    expect(last.type).toBe('blocked');
  });

  it('enters a building through its door', () => {
    const { pos, last } = walk(START, ['up', 'up']);
    expect(last).toEqual({ type: 'entered', building: 'food' });
    expect(pos).toMatchObject({ scene: 'in:food', x: 4, y: 5 });
  });

  it('talks when walking into the counter', () => {
    const { last } = walk(START, ['up', 'up', 'up', 'up', 'up']);
    expect(last).toEqual({ type: 'talk', building: 'food' });
  });

  it('leaves through the exit and stands outside the door', () => {
    const { pos, last } = walk(START, ['up', 'up', 'down']);
    expect(last).toEqual({ type: 'exited', building: 'food' });
    expect(pos).toMatchObject({ scene: 'village', x: 7, y: 3 });
  });
});

describe('isValidPosition', () => {
  it('accepts walkable tiles and rejects solid or unknown ones', () => {
    expect(isValidPosition(START)).toBe(true);
    expect(isValidPosition({ scene: 'village', x: 0, y: 0, facing: 'up' })).toBe(false);
    expect(isValidPosition({ scene: 'nowhere', x: 1, y: 1, facing: 'up' })).toBe(false);
    expect(isValidPosition(null)).toBe(false);
  });
});
