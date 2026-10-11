/**
 * Named tiles from Kenney "Tiny Town" and "Tiny Dungeon", plus ready-made
 * legends for maps. Indices count left to right, top to bottom, from 0.
 *
 * UNVERIFIED: these indices are first guesses. Open /dev/tiles, read the
 * correct numbers off the sheet, and fix them here. Nothing else changes.
 */
import type { LegendEntry } from './Tiles';
import { TINY_DUNGEON, TINY_TOWN } from './sheets';

export const TOWN = {
  grass: 0,
  flowers: 1,
  grassTufts: 2,
  tree: 4,
  pine: 5,
  bush: 6,
  path: 24,
  fence: 36,
  houseRoofLeft: 48,
  houseRoofRight: 49,
  houseWall: 60,
  houseDoor: 61,
} as const;

export const HEROES = {
  player: 84,
  villager: 85,
  coin: 89,
} as const;

const town = (index: number) => ({ sheet: TINY_TOWN, index });
const hero = (index: number) => ({ sheet: TINY_DUNGEON, index });

/** Shared legend for the village scenes. */
export const VILLAGE_LEGEND: Record<string, LegendEntry> = {
  g: [town(TOWN.grass)],
  f: [town(TOWN.grass), town(TOWN.flowers)],
  s: [town(TOWN.grass), town(TOWN.grassTufts)],
  T: [town(TOWN.grass), town(TOWN.tree)],
  P: [town(TOWN.grass), town(TOWN.pine)],
  b: [town(TOWN.grass), town(TOWN.bush)],
  '=': [town(TOWN.path)],
  '#': [town(TOWN.grass), town(TOWN.fence)],
  L: [town(TOWN.grass), town(TOWN.houseRoofLeft)],
  R: [town(TOWN.grass), town(TOWN.houseRoofRight)],
  W: [town(TOWN.grass), town(TOWN.houseWall)],
  D: [town(TOWN.grass), town(TOWN.houseDoor)],
  '@': [town(TOWN.path), hero(HEROES.player)],
  v: [town(TOWN.grass), hero(HEROES.villager)],
  c: [town(TOWN.path), hero(HEROES.coin)],
};

/** Inside a shop: wall, wooden floor, counter, clerk, exit door. */
export const INTERIOR_LEGEND: Record<string, LegendEntry> = {
  W: [town(TOWN.houseWall)],
  F: [town(TOWN.path)],
  C: [town(TOWN.path), town(TOWN.fence)],
  k: [town(TOWN.path), hero(HEROES.villager)],
  X: [town(TOWN.path), town(TOWN.houseDoor)],
};

/** The player's character sprite, for the game's moving avatar. */
export const PLAYER_TILE = { sheet: TINY_DUNGEON, index: HEROES.player };

/** The landing-page scene: a small village with a path to the door. */
export const LANDING_SCENE = [
  'TPTgfgTPTg',
  'gsgLRgfgsT',
  'fgbWDgvgPg',
  'gg===gg#gf',
  'sg=@==cgbg',
  'TgfgsgTPfg',
];

/** A single decorative row: trees, flowers, fence. */
export const STRIP_TREES = 'TPbfsTfbPT';
export const STRIP_FLOWERS = 'fsgfsgfsgf';
