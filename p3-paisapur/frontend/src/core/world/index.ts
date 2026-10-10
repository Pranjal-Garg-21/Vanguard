/**
 * The Paisapur overworld: maps, buildings, collision, doors, warps, NPCs and
 * what is in front of the player. Pure data and functions (no React, no
 * canvas). Conditions such as "chapter>=2" are evaluated by a function the
 * caller passes in, so the world doesn't depend on the story. Owner: P2.
 *
 * Maps are text rows, one character per tile, looked up in legend.json.
 * Buildings are stamped on top; the stamp's door tile leads inside.
 */
import legendJson from '@/content/world/legend.json';

export type Dir = 'up' | 'down' | 'left' | 'right';
export type Pos = { map: string; x: number; y: number; facing: Dir };
export type Cond = (expr: string) => boolean;

export type TileDef = { layers: string[]; solid?: boolean; counter?: boolean; exit?: boolean };
export type Stamp = { rows: string[][]; door: [number, number] };
export type SpriteDef = { char: number; hue?: number };
export type Legend = {
  sheets: Record<string, string>;
  tiles: Record<string, TileDef>;
  stamps: Record<string, Stamp>;
  sprites: Record<string, SpriteDef>;
};

export type Building = { id: string; stamp: string; x: number; y: number; to?: string; when?: string; closed?: string };
export type Warp = { x: number; y: number; to: string; tx: number; ty: number; facing: Dir; when?: string };
export type Npc = { id: string; sprite: string; x: number; y: number; facing: Dir; script: string; when?: string };
export type Spot = { x: number; y: number; text?: string; script?: string; when?: string };
export type Blocker = { x: number; y: number; tile: string; unless: string; text?: string };

export type MapDef = {
  id: string;
  name: string;
  rows: string[];
  interior?: boolean;
  entry?: { x: number; y: number; facing: Dir };
  start?: { x: number; y: number; facing: Dir };
  buildings?: Building[];
  warps?: Warp[];
  npcs?: Npc[];
  signs?: Spot[];
  objects?: Spot[];
  triggers?: Spot[];
  blockers?: Blocker[];
};

export type World = {
  legend: Legend;
  maps: Record<string, MapDef>;
  /** Interior map → where its exit leads outside. */
  exits: Record<string, Pos>;
};

export const LEGEND = legendJson as unknown as Legend;

const DELTA: Record<Dir, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

export function delta(dir: Dir): [number, number] {
  return DELTA[dir];
}

export function buildWorld(legend: Legend, mapList: MapDef[]): World {
  const maps = Object.fromEntries(mapList.map((m) => [m.id, m]));
  const exits: Record<string, Pos> = {};
  for (const m of mapList) {
    for (const b of m.buildings ?? []) {
      if (!b.to) continue;
      const [dx, dy] = legend.stamps[b.stamp]!.door;
      exits[b.to] = { map: m.id, x: b.x + dx, y: b.y + dy + 1, facing: 'down' };
    }
  }
  return { legend, maps, exits };
}

export function mapOf(world: World, id: string): MapDef {
  const m = world.maps[id];
  if (!m) throw new Error(`unknown map ${id}`);
  return m;
}

export function size(map: MapDef): { w: number; h: number } {
  return { w: map.rows[0]?.length ?? 0, h: map.rows.length };
}

export function tileAt(world: World, map: MapDef, x: number, y: number): TileDef | undefined {
  const ch = map.rows[y]?.[x];
  return ch === undefined ? undefined : world.legend.tiles[ch];
}

/** The building covering a tile, and whether that tile is its door. */
export function buildingAt(world: World, map: MapDef, x: number, y: number): { b: Building; door: boolean } | null {
  for (const b of map.buildings ?? []) {
    const stamp = world.legend.stamps[b.stamp]!;
    const w = stamp.rows[0]!.length;
    const h = stamp.rows.length;
    if (x >= b.x && x < b.x + w && y >= b.y && y < b.y + h) {
      return { b, door: x === b.x + stamp.door[0] && y === b.y + stamp.door[1] };
    }
  }
  return null;
}

const visible = (cond: Cond, when?: string) => !when || cond(when);

export function npcsOn(map: MapDef, cond: Cond): Npc[] {
  return (map.npcs ?? []).filter((n) => visible(cond, n.when));
}

export function activeBlockers(map: MapDef, cond: Cond): Blocker[] {
  return (map.blockers ?? []).filter((b) => !cond(b.unless));
}

export type StepEvent =
  | { type: 'moved' }
  | { type: 'blocked'; text?: string }
  | { type: 'warp'; to: Pos }
  | { type: 'trigger'; script: string };

/**
 * One step in a direction. The player always turns; they move if the tile is
 * free. Stepping on a door, exit or warp tile returns where to go next.
 */
export function step(world: World, cond: Cond, pos: Pos, dir: Dir, npcPositions?: { x: number; y: number }[]): { pos: Pos; event: StepEvent } {
  const map = mapOf(world, pos.map);
  const turned: Pos = { ...pos, facing: dir };
  const [dx, dy] = DELTA[dir];
  const x = pos.x + dx;
  const y = pos.y + dy;

  // Map-edge warps sit on the edge tile itself, so check warps before the bounds.
  const tile = tileAt(world, map, x, y);
  if (!tile) return { pos: turned, event: { type: 'blocked' } };

  const building = buildingAt(world, map, x, y);
  if (building) {
    if (!building.door) return { pos: turned, event: { type: 'blocked' } };
    const { b } = building;
    if (!b.to || !visible(cond, b.when)) return { pos: turned, event: { type: 'blocked', text: b.closed } };
    const inside = mapOf(world, b.to);
    const entry = inside.entry ?? { x: 1, y: 1, facing: 'up' as Dir };
    return { pos: turned, event: { type: 'warp', to: { map: b.to, ...entry } } };
  }

  const blocker = activeBlockers(map, cond).find((b) => b.x === x && b.y === y);
  if (blocker) return { pos: turned, event: { type: 'blocked', text: blocker.text } };
  if (tile.solid) return { pos: turned, event: { type: 'blocked' } };
  const npcs = npcPositions ?? npcsOn(map, cond);
  if (npcs.some((n) => n.x === x && n.y === y)) return { pos: turned, event: { type: 'blocked' } };

  const moved: Pos = { ...turned, x, y };

  if (tile.exit) {
    const out = world.exits[map.id];
    if (out) return { pos: moved, event: { type: 'warp', to: out } };
  }
  const warp = (map.warps ?? []).find((w) => w.x === x && w.y === y && visible(cond, w.when));
  if (warp) return { pos: moved, event: { type: 'warp', to: { map: warp.to, x: warp.tx, y: warp.ty, facing: warp.facing } } };
  const trigger = (map.triggers ?? []).find((t) => t.x === x && t.y === y && t.script && visible(cond, t.when));
  if (trigger) return { pos: moved, event: { type: 'trigger', script: trigger.script! } };

  return { pos: moved, event: { type: 'moved' } };
}

export type Interaction =
  | { type: 'npc'; npc: Npc }
  | { type: 'sign'; text: string }
  | { type: 'object'; script: string }
  | null;

/** What the player is facing when they press A. Talks across shop counters. */
export function interact(world: World, cond: Cond, pos: Pos): Interaction {
  const map = mapOf(world, pos.map);
  const [dx, dy] = DELTA[pos.facing];
  const look = (x: number, y: number): Interaction => {
    const npc = npcsOn(map, cond).find((n) => n.x === x && n.y === y);
    if (npc) return { type: 'npc', npc };
    const obj = (map.objects ?? []).find((o) => o.x === x && o.y === y && o.script && visible(cond, o.when));
    if (obj) return { type: 'object', script: obj.script! };
    const sign = (map.signs ?? []).find((s) => s.x === x && s.y === y && s.text);
    if (sign) return { type: 'sign', text: sign.text! };
    const blocker = activeBlockers(map, cond).find((b) => b.x === x && b.y === y && b.text);
    if (blocker) return { type: 'sign', text: blocker.text! };
    const building = buildingAt(world, map, x, y);
    if (building?.door && building.b.closed && (!building.b.to || !visible(cond, building.b.when))) {
      return { type: 'sign', text: building.b.closed };
    }
    return null;
  };
  const x = pos.x + dx;
  const y = pos.y + dy;
  const direct = look(x, y);
  if (direct) return direct;
  if (tileAt(world, map, x, y)?.counter) return look(x + dx, y + dy);
  return null;
}

/** True when a saved position is a walkable tile on a known map. */
export function isValidPos(world: World, p: unknown): p is Pos {
  if (typeof p !== 'object' || p === null) return false;
  const { map, x, y, facing } = p as Partial<Pos>;
  if (typeof map !== 'string' || typeof x !== 'number' || typeof y !== 'number' || !facing || !(facing in DELTA)) return false;
  const m = world.maps[map];
  if (!m) return false;
  const tile = tileAt(world, m, x, y);
  return !!tile && !tile.solid && !buildingAt(world, m, x, y);
}
