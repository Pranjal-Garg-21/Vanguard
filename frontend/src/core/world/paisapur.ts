/** The assembled Paisapur world: the shared legend plus every map in content/world/maps. */
import { buildWorld, LEGEND, type MapDef } from './index';

const files = import.meta.glob<MapDef>('../../content/world/maps/*.json', { eager: true, import: 'default' });

export const PAISAPUR = buildWorld(LEGEND, Object.values(files));

export const START_MAP = 'home';
