/**
 * Loads every lesson (all topic sections), check question and glossary entry from src/content.
 * Pure data loading (no React, no storage). Shared by the lesson screens and the validator test.
 *
 * Strings live in content/i18n/en/<pillar>_<lesson>.json (for example invest_profit_loss.json). The file name is the namespace,
 * so "hook" in invest_profit_loss.json is the key "invest_profit_loss.hook" (same as t()).
 */
import type { GlossaryEntry, Pillar, Room, Strings } from './types';
import { PILLARS } from './types';

const values = (mods: Record<string, unknown>) => Object.values(mods);

type ConceptFile = { concepts: { existing: string[]; proposed: string[] }; misconceptions: { existing: string[]; proposed: string[] } };

/** Each topic section keeps its own concept file: content/scenarios/<pillar>/concepts.p4.json. */
const conceptFiles = values(
  import.meta.glob('/src/content/scenarios/*/concepts.p4.json', { eager: true, import: 'default' }),
) as ConceptFile[];

/** Every lesson of every topic section (Bank, Plan, Save, Borrow, Invest), each a TryHackMe-style room. */
export const allRooms = (
  values(import.meta.glob('/src/content/scenarios/*/lessons/*.json', { eager: true, import: 'default' })) as Room[]
).sort((a, b) => PILLARS.indexOf(a.pillar) - PILLARS.indexOf(b.pillar) || a.order - b.order);

/** The lessons of one topic section, in teaching order. */
export const roomsFor = (pillar: Pillar): Room[] => allRooms.filter((r) => r.pillar === pillar);

/** The Investing lessons, in teaching order. */
export const rooms = roomsFor('invest');

/** Practice games that run on the room engine (a guess step, labs and questions). Not part of the lesson path. */
export const games = (
  values(import.meta.glob('/src/content/scenarios/invest/games/*.json', { eager: true, import: 'default' })) as Room[]
).sort((a, b) => a.order - b.order);

export const glossary = values(
  import.meta.glob('/src/content/scenarios/*/glossary/*.json', { eager: true, import: 'default' }),
).flat() as GlossaryEntry[];

const stringFiles = import.meta.glob('/src/content/i18n/en/{invest,bank,plan,save,borrow}_*.json', { eager: true, import: 'default' }) as Record<
  string,
  Strings
>;

/** Full key (namespace + key) -> English text. */
export const strings: Strings = {};
for (const [file, bundle] of Object.entries(stringFiles)) {
  const ns = file.split('/').pop()!.replace('.json', '');
  for (const [key, text] of Object.entries(bundle)) strings[`${ns}.${key}`] = text;
}

export const knownConcepts = new Set(conceptFiles.flatMap((c) => [...c.concepts.existing, ...c.concepts.proposed]));
export const knownMisconceptions = new Set(conceptFiles.flatMap((c) => [...c.misconceptions.existing, ...c.misconceptions.proposed]));

export const glossaryById = new Map(glossary.map((g) => [g.id, g]));
export const lessonById = new Map([...allRooms, ...games].map((l) => [l.id, l]));
