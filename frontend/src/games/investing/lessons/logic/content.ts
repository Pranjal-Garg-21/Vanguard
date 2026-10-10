/**
 * Loads every investing lesson, check question and glossary entry from src/content.
 * Pure data loading (no React, no storage). Shared by the lesson screens and the validator test.
 *
 * Strings live in content/i18n/en/invest_<lesson>.json. The file name is the namespace,
 * so "hook" in invest_profit_loss.json is the key "invest_profit_loss.hook" (same as t()).
 */
import conceptData from '@/content/scenarios/invest/concepts.p4.json';
import type { CheckItem, GlossaryEntry, Lesson, Strings } from './types';

const values = (mods: Record<string, unknown>) => Object.values(mods);

export const lessons = (
  values(import.meta.glob('/src/content/scenarios/invest/lessons/*.json', { eager: true, import: 'default' })) as Lesson[]
).sort((a, b) => a.order - b.order);

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
export const lessonById = new Map(lessons.map((l) => [l.id, l]));
