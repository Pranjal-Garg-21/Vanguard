/**
 * Tile sheets (sprite atlases). All are Kenney packs, CC0, 16×16 tiles with
 * no spacing ("tilemap_packed.png"). See public/assets/CREDITS.md.
 *
 * `columns` and `rows` must match the PNG. Check them on /dev/tiles.
 */

export type TileSheet = {
  /** Public URL of the packed tilemap PNG. */
  url: string;
  columns: number;
  rows: number;
};

export const TINY_TOWN: TileSheet = { url: '/assets/tiny-town/tilemap.png', columns: 12, rows: 11 };

export const TINY_DUNGEON: TileSheet = { url: '/assets/tiny-dungeon/tilemap.png', columns: 12, rows: 11 };

export const SHEETS = { 'tiny-town': TINY_TOWN, 'tiny-dungeon': TINY_DUNGEON } as const;
export type SheetName = keyof typeof SHEETS;
