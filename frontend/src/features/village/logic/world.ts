/**
 * The village game world: maps, collisions and movement. Pure data and
 * functions with no React or storage, so it is easy to test.
 *
 * Maps are text rows, one character per tile:
 *   village:  g f s grass · T P b trees and bushes · = path · # fence
 *             L R roof · W wall · D door (walkable, enters the building)
 *   interior: W wall · F floor · C counter · k clerk · X exit
 */

export type Dir = 'up' | 'down' | 'left' | 'right';

export type Position = { scene: string; x: number; y: number; facing: Dir };

export type Building = {
  id: 'grocery' | 'food' | 'clothing' | 'stationery' | 'stockmarket' | 'bank';
  /** The door tile on the village map. The player enters by stepping on it. */
  door: { x: number; y: number };
};

export const BUILDINGS: Building[] = [
  { id: 'grocery', door: { x: 3, y: 2 } },
  { id: 'food', door: { x: 7, y: 2 } },
  { id: 'clothing', door: { x: 11, y: 2 } },
  { id: 'stationery', door: { x: 3, y: 6 } },
  { id: 'stockmarket', door: { x: 7, y: 6 } },
  { id: 'bank', door: { x: 11, y: 6 } },
];

export const VILLAGE_SCENE = 'village';

export const VILLAGE_ROWS = [
  'TTTTTTTTTTTTTTTT',
  'TfLRLgLRLgLRLfgT',
  'TgWDWgWDWgWDWgsT',
  'Tg============gT',
  'TgsgfgbgggsgfgsT',
  'TfLRLgLRLgLRLfgT',
  'TgWDWgWDWgWDWgsT',
  'Tg============gT',
  'TgfgsggbgfgsgfgT',
  'TgggggggggggggfT',
  'TPbgfgsgPgfgsgbT',
  'TTTTTTTTTTTTTTTT',
];

/** Every shop shares this room; the scene ID says which shop it is. */
export const INTERIOR_ROWS = [
  'WWWWWWWWWW',
  'WFFFkFFFFW',
  'WFFCCCCFFW',
  'WFFFFFFFFW',
  'WFFFFFFFFW',
  'WFFFFFFFFW',
  'WWWWXWWWWW',
];

export const START: Position = { scene: VILLAGE_SCENE, x: 7, y: 4, facing: 'down' };

const INTERIOR_PREFIX = 'in:';

export function interiorScene(buildingId: Building['id']): string {
  return `${INTERIOR_PREFIX}${buildingId}`;
}

/** The building a scene belongs to, or null for the village. */
export function buildingOf(scene: string): Building | null {
  if (!scene.startsWith(INTERIOR_PREFIX)) return null;
  return BUILDINGS.find((b) => b.id === scene.slice(INTERIOR_PREFIX.length)) ?? null;
}

export function rowsFor(scene: string): string[] | null {
  if (scene === VILLAGE_SCENE) return VILLAGE_ROWS;
  return buildingOf(scene) ? INTERIOR_ROWS : null;
}

/** Tiles the player cannot walk onto. Counter and clerk are bump-to-talk. */
const SOLID = new Set(['T', 'P', 'b', 'L', 'R', 'W', '#', 'C', 'k']);
const TALK = new Set(['C', 'k']);

export type StepEvent =
  | { type: 'moved' }
  | { type: 'blocked' }
  | { type: 'entered'; building: Building['id'] }
  | { type: 'exited'; building: Building['id'] }
  | { type: 'talk'; building: Building['id'] };

const DELTA: Record<Dir, { dx: number; dy: number }> = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
};

/** Where the player stands inside a shop after walking in. */
const INTERIOR_SPAWN = { x: 4, y: 5 };

export function step(pos: Position, dir: Dir): { pos: Position; event: StepEvent } {
  const turned: Position = { ...pos, facing: dir };
  const rows = rowsFor(pos.scene);
  if (!rows) return { pos: turned, event: { type: 'blocked' } };

  const x = pos.x + DELTA[dir].dx;
  const y = pos.y + DELTA[dir].dy;
  const tile = rows[y]?.[x];
  if (tile === undefined) return { pos: turned, event: { type: 'blocked' } };

  const inside = buildingOf(pos.scene);

  if (inside && TALK.has(tile)) return { pos: turned, event: { type: 'talk', building: inside.id } };
  if (SOLID.has(tile)) return { pos: turned, event: { type: 'blocked' } };

  if (inside && tile === 'X') {
    const door = inside.door;
    return {
      pos: { scene: VILLAGE_SCENE, x: door.x, y: door.y + 1, facing: 'down' },
      event: { type: 'exited', building: inside.id },
    };
  }

  if (!inside && tile === 'D') {
    const building = BUILDINGS.find((b) => b.door.x === x && b.door.y === y);
    if (building) {
      return {
        pos: { scene: interiorScene(building.id), ...INTERIOR_SPAWN, facing: 'up' },
        event: { type: 'entered', building: building.id },
      };
    }
  }

  return { pos: { ...turned, x, y }, event: { type: 'moved' } };
}

/** For saved games: true when the position is on a walkable tile of a known scene. */
export function isValidPosition(p: unknown): p is Position {
  if (typeof p !== 'object' || p === null) return false;
  const { scene, x, y, facing } = p as Partial<Position>;
  if (typeof scene !== 'string' || typeof x !== 'number' || typeof y !== 'number') return false;
  if (!(facing && facing in DELTA)) return false;
  const tile = rowsFor(scene)?.[y]?.[x];
  return tile !== undefined && !SOLID.has(tile);
}
