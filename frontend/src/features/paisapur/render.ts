/**
 * Canvas renderer for the overworld: tiles, building stamps, NPCs and the
 * player, with a camera that follows the player. Draws a 15×10-tile view
 * (240×160 px, the classic handheld screen) that CSS scales up crisply.
 */
import { activeBlockers, mapOf, npcsOn, size, type Cond, type Dir, type Npc, type Pos, type World } from '@/core/world';
import { SHEETS, type SheetName } from '@/ui';

export const TILE = 16;
export const VIEW_W = 15;
export const VIEW_H = 10;
/**
 * The canvas is this many device pixels per game pixel. The art is drawn
 * with nearest-neighbour scaling (so it looks the same), but text such as
 * building names is rasterised at full resolution and stays sharp.
 */
export const RENDER_SCALE = 3;

/** Walking sprites live in RPG Urban: columns 23–26 = left, down, up, right; 3 rows per character. */
const DIR_COL: Record<Dir, number> = { left: 23, down: 24, up: 25, right: 26 };

export type Assets = { sheets: Record<string, HTMLImageElement>; sprites: Map<string, HTMLCanvasElement | HTMLImageElement> };

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${url}`));
    img.src = url;
  });
}

/**
 * Shifts the hue of clothing pixels only: skin, hair and the dark outline
 * (warm oranges and browns, or very dark/grey pixels) keep their colour.
 */
function recolourClothes(ctx: CanvasRenderingContext2D, hue: number) {
  const img = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3]! === 0) continue;
    const r = d[i]! / 255;
    const g = d[i + 1]! / 255;
    const b = d[i + 2]! / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    const c = max - min;
    if (c < 0.12 || l < 0.18) continue; // greys and outline
    let h = max === r ? ((g - b) / c) % 6 : max === g ? (b - r) / c + 2 : (r - g) / c + 4;
    h = (h * 60 + 360) % 360;
    if (h >= 12 && h <= 45) continue; // skin and hair
    const sat = c / (1 - Math.abs(2 * l - 1));
    const nh = (h + hue) % 360;
    const k = (n: number) => (n + nh / 30) % 12;
    const a = sat * Math.min(l, 1 - l);
    const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    d[i] = Math.round(f(0) * 255);
    d[i + 1] = Math.round(f(8) * 255);
    d[i + 2] = Math.round(f(4) * 255);
  }
  ctx.putImageData(img, 0, 0);
}

/** Loads every sheet in the legend and pre-tints each character sprite sheet. */
export async function loadAssets(world: World): Promise<Assets> {
  const sheets: Record<string, HTMLImageElement> = {};
  await Promise.all(
    Object.entries(world.legend.sheets).map(async ([short, name]) => {
      sheets[short] = await loadImage(SHEETS[name as SheetName].url);
    }),
  );
  const urban = sheets.urban!;
  const sprites = new Map<string, HTMLCanvasElement | HTMLImageElement>();
  for (const [id, def] of Object.entries(world.legend.sprites)) {
    // Cut this character's 4×3 frames out, tinted if it has a hue, so NPCs look different.
    const canvas = document.createElement('canvas');
    canvas.width = 4 * TILE;
    canvas.height = 3 * TILE;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) continue;
    ctx.drawImage(urban, 23 * TILE, def.char * 3 * TILE, 4 * TILE, 3 * TILE, 0, 0, 4 * TILE, 3 * TILE);
    if (def.hue) recolourClothes(ctx, def.hue);
    sprites.set(id, canvas);
  }
  return { sheets, sprites };
}

function drawRef(ctx: CanvasRenderingContext2D, assets: Assets, ref: string, dx: number, dy: number) {
  const [sheet, idx] = ref.split(':');
  const img = assets.sheets[sheet!];
  if (!img) return;
  const i = Number(idx);
  const cols = Math.floor(img.width / TILE);
  ctx.drawImage(img, (i % cols) * TILE, Math.floor(i / cols) * TILE, TILE, TILE, dx, dy, TILE, TILE);
}

function drawCharacter(ctx: CanvasRenderingContext2D, assets: Assets, sprite: string, facing: Dir, frame: number, dx: number, dy: number) {
  const sheet = assets.sprites.get(sprite);
  if (!sheet) return;
  const col = DIR_COL[facing] - 23;
  ctx.drawImage(sheet, col * TILE, frame * TILE, TILE, TILE, Math.round(dx), Math.round(dy), TILE, TILE);
}

export type Walker = {
  pos: Pos;
  /** Tile the player is walking from, while a step is animating. */
  from: { x: number; y: number } | null;
  /** 0 → 1 progress through the current step. */
  t: number;
  /** Alternates feet between steps. */
  foot: 0 | 1;
};

export type Frame = {
  world: World;
  cond: Cond;
  walker: Walker;
  playerSprite: string;
  npcFacing: Record<string, Dir>;
  /** 0 = clear, 1 = black (for map transitions). */
  fade: number;
  /** The short name shown above a building, by building id. */
  label: (buildingId: string) => string;
};

/** A name tag over a building's roof: parchment with a hard pixel edge, like the town's signs. */
function drawLabel(ctx: CanvasRenderingContext2D, text: string, cx: number, top: number, viewW: number) {
  ctx.font = '700 6.5px "Pixelify Sans", ui-monospace, monospace';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  const w = Math.ceil(ctx.measureText(text).width) + 6;
  const h = 9;
  // Keep the tag on screen when a building is half out of view.
  const x = Math.min(Math.max(cx - w / 2, 1), viewW - w - 1);
  ctx.fillStyle = '#3b2412';
  ctx.fillRect(x - 1, top - 1, w + 2, h + 2);
  ctx.fillStyle = '#fff1c9';
  ctx.fillRect(x, top, w, h);
  ctx.fillStyle = '#3b2412';
  ctx.fillText(text, x + w / 2, top + h / 2 + 0.5);
}

/** The player's position in pixels, including the step in progress. */
function playerPixels(w: Walker): { x: number; y: number } {
  if (!w.from) return { x: w.pos.x * TILE, y: w.pos.y * TILE };
  return {
    x: (w.from.x + (w.pos.x - w.from.x) * w.t) * TILE,
    y: (w.from.y + (w.pos.y - w.from.y) * w.t) * TILE,
  };
}

export function draw(ctx: CanvasRenderingContext2D, assets: Assets, f: Frame): void {
  const { world, walker } = f;
  const map = mapOf(world, walker.pos.map);
  const { w, h } = size(map);
  // The window onto the map is as big as the room: a small room fills the screen instead of floating in a
  // fixed-size frame, and a big map scrolls inside the usual 15 x 10 tiles.
  const viewW = Math.min(w, VIEW_W) * TILE;
  const viewH = Math.min(h, VIEW_H) * TILE;
  const canvas = ctx.canvas;
  if (canvas.width !== viewW * RENDER_SCALE || canvas.height !== viewH * RENDER_SCALE) {
    canvas.width = viewW * RENDER_SCALE;
    canvas.height = viewH * RENDER_SCALE;
    canvas.style.aspectRatio = `${viewW} / ${viewH}`;
    canvas.parentElement?.parentElement?.style.setProperty('--stage-ratio', String(viewW / viewH));
  }

  // Game pixels → device pixels (see RENDER_SCALE).
  const scale = canvas.width / viewW;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#10141c';
  ctx.fillRect(0, 0, viewW, viewH);

  // Camera: centred on the player, clamped to the map; small maps are centred.
  const p = playerPixels(walker);
  const camX = w * TILE <= viewW ? -(viewW - w * TILE) / 2 : Math.min(Math.max(p.x + TILE / 2 - viewW / 2, 0), w * TILE - viewW);
  const camY = h * TILE <= viewH ? -(viewH - h * TILE) / 2 : Math.min(Math.max(p.y + TILE / 2 - viewH / 2, 0), h * TILE - viewH);
  const ox = -Math.round(camX);
  const oy = -Math.round(camY);

  const x0 = Math.max(0, Math.floor(camX / TILE));
  const y0 = Math.max(0, Math.floor(camY / TILE));
  const x1 = Math.min(w - 1, Math.ceil((camX + viewW) / TILE));
  const y1 = Math.min(h - 1, Math.ceil((camY + viewH) / TILE));

  for (let y = y0; y <= y1; y++) {
    const row = map.rows[y]!;
    for (let x = x0; x <= x1; x++) {
      const def = world.legend.tiles[row[x]!];
      if (!def) continue;
      for (const ref of def.layers) drawRef(ctx, assets, ref, ox + x * TILE, oy + y * TILE);
    }
  }

  for (const b of map.buildings ?? []) {
    const stamp = world.legend.stamps[b.stamp]!;
    stamp.rows.forEach((row, dy) =>
      row.forEach((ref, dx) => drawRef(ctx, assets, ref, ox + (b.x + dx) * TILE, oy + (b.y + dy) * TILE)),
    );
  }
  for (const bl of activeBlockers(map, f.cond)) drawRef(ctx, assets, bl.tile, ox + bl.x * TILE, oy + bl.y * TILE);

  // Characters, back to front.
  type Body = { y: number; draw: () => void };
  const bodies: Body[] = npcsOn(map, f.cond).map((n: Npc) => ({
    y: n.y * TILE,
    draw: () => drawCharacter(ctx, assets, n.sprite, f.npcFacing[n.id] ?? n.facing, 0, ox + n.x * TILE, oy + n.y * TILE),
  }));
  const moving = walker.from !== null;
  const frame = moving && walker.t > 0.25 && walker.t < 0.75 ? 1 + walker.foot : 0;
  bodies.push({ y: p.y, draw: () => drawCharacter(ctx, assets, f.playerSprite, walker.pos.facing, frame, ox + p.x, oy + p.y - 1) });
  bodies.sort((a, b) => a.y - b.y).forEach((b) => b.draw());

  // Building names, on top of everything, so a shop can be found at a glance.
  for (const b of map.buildings ?? []) {
    const stamp = world.legend.stamps[b.stamp]!;
    const width = stamp.rows[0]!.length * TILE;
    const left = ox + b.x * TILE;
    const bottom = oy + (b.y + stamp.rows.length) * TILE;
    if (left + width < 0 || left > viewW || bottom < 0 || oy + b.y * TILE > viewH) continue;
    // On the roof; if the roof is scrolled off the top, the tag slides down with the building.
    const top = Math.min(Math.max(oy + b.y * TILE + 2, 1), bottom - 12);
    // A building that will open later in the story shows a lock.
    const locked = !!b.to && !!b.when && !f.cond(b.when);
    drawLabel(ctx, `${locked ? '🔒 ' : ''}${f.label(b.id)}`, left + width / 2, top, viewW);
  }

  if (f.fade > 0) {
    ctx.fillStyle = `rgba(0,0,0,${f.fade})`;
    ctx.fillRect(0, 0, viewW, viewH);
  }
}
