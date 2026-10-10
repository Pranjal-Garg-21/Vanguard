/**
 * Loads every investing lesson, check question and glossary entry from src/content.
 * Pure data loading (no React, no storage). Shared by the lesson screens and the validator test.
 *
 * Strings live in content/i18n/en/invest_<lesson>.json. The file name is the namespace,
 * so "hook" in invest_profit_loss.json is the key "invest_profit_loss.hook" (same as t()).
 */
import conceptData from '@/content/scenarios/invest/concepts.p4.json';
import type { AnyLesson, CheckItem, GlossaryEntry, Lesson, Room, Strings } from './types';

const values = (mods: Record<string, unknown>) => Object.values(mods);

/** Every lesson, whichever style it is written in, in teaching order. */
export const allLessons = (
  values(import.meta.glob('/src/content/scenarios/invest/lessons/*.json', { eager: true, import: 'default' })) as AnyLesson[]
).sort((a, b) => a.order - b.order);

/** Card-style lessons (depth picker, cards, quiz). */
export const lessons = allLessons.filter((l): l is Lesson => l.kind === 'lesson');

/** TryHackMe-style rooms (numbered tasks, typed answers, hints, points). */
export const rooms = allLessons.filter((l): l is Room => l.kind === 'room');

export const checks = values(
  import.meta.glob('/src/content/scenarios/invest/checks/*.json', { eager: true, import: 'default' }),
).flat() as CheckItem[];

export const glossary = values(
  import.meta.glob('/src/content/scenarios/invest/glossary/*.json', { eager: true, import: 'default' }),
).flat() as GlossaryEntry[];

const stringFiles = import.meta.glob('/src/content/i18n/en/invest_*.json', { eager: true, import: 'default' }) as Record<
  string,
  Strings
>;

/** Full key (namespace + key) -> English text. */
export const strings: Strings = {};
for (const [file, bundle] of Object.entries(stringFiles)) {
  const ns = file.split('/').pop()!.replace('.json', '');
  for (const [key, text] of Object.entries(bundle)) strings[`${ns}.${key}`] = text;
}

export const knownConcepts = new Set([...conceptData.concepts.existing, ...conceptData.concepts.proposed]);
export const knownMisconceptions = new Set([
  ...conceptData.misconceptions.existing,
  ...conceptData.misconceptions.proposed,
]);

export const checkById = new Map(checks.map((c) => [c.id, c]));
export const glossaryById = new Map(glossary.map((g) => [g.id, g]));
export const lessonById = new Map(allLessons.map((l) => [l.id, l]));
