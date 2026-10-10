#!/usr/bin/env node
/**
 * Writes every English string to a tab-separated sheet for a translator, and
 * carries over whatever is already translated. Owner: P3.
 *
 *   node tools/authoring/strings-export.mjs te > te.tsv
 *   node tools/authoring/strings-export.mjs te translations/te.tsv
 *
 * Open the file in any spreadsheet, fill the "translation" column, save as
 * tab-separated, and run strings-import.mjs. Nothing else in the sheet matters
 * to the importer, so a translator may add columns of their own.
 *
 * Tab-separated rather than comma-separated on purpose: the strings are full
 * of commas and quotes, and none contains a tab or a newline (checked below).
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { isAbsolute, join, relative } from 'node:path';

const ROOT = process.cwd();
const I18N = join(ROOT, 'frontend', 'src', 'content', 'i18n');
const LANGUAGES = ['te', 'hi', 'ur'];
const PLURAL = ['zero', 'one', 'two', 'few', 'many', 'other'];

const language = process.argv[2];
const outPath = process.argv[3];

if (!LANGUAGES.includes(language)) {
  console.error(`Usage: node tools/authoring/strings-export.mjs <${LANGUAGES.join('|')}> [out.tsv]`);
  process.exit(2);
}

/** Nested bundle -> flat "namespace.a.b" -> string. Authoring notes (_keys) are skipped. */
function flatten(prefix, value, into) {
  for (const [key, child] of Object.entries(value)) {
    if (key.startsWith('_')) continue;
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof child === 'string') into.set(path, child);
    else flatten(path, child, into);
  }
}

function bundleFor(lang) {
  const dir = join(I18N, lang);
  const flat = new Map();
  if (!existsSync(dir)) return flat;
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.json')).sort()) {
    flatten(file.replace('.json', ''), JSON.parse(readFileSync(join(dir, file), 'utf8')), flat);
  }
  return flat;
}

const english = bundleFor('en');
const existing = bundleFor(language);

const placeholders = (text) => [...text.matchAll(/\{\s*(\w+)[^}]*\}/g)].map((m) => m[0]);

/**
 * What a translator has to be careful about on this row. A trailing space is
 * invisible in a spreadsheet, so it is called out rather than left to be
 * noticed; the importer puts it back either way.
 */
/**
 * A key is a plural form only when a sibling carries another form: "other" on
 * its own is an ordinary word ("Everything else" lives at category.other).
 */
function isPluralForm(key, keys) {
  const last = key.split('.').at(-1);
  if (!PLURAL.includes(last)) return false;
  const parent = key.slice(0, -(last.length + 1));
  return PLURAL.some((form) => form !== last && keys.has(`${parent}.${form}`));
}

function notes(key, text, keys) {
  const out = [];
  const found = placeholders(text);
  if (found.length) out.push(`keep exactly: ${found.join(' ')}`);
  if (text !== text.trimEnd()) out.push('ends with a space — it is joined to the next line');
  if (isPluralForm(key, keys)) {
    out.push(`plural form "${key.split('.').at(-1)}" — add rows for any extra forms your language needs`);
  }
  return out.join('; ');
}

const rows = [['key', 'english', 'translation', 'notes']];
for (const [key, text] of english) {
  if (text.includes('\t') || text.includes('\n')) {
    console.error(`FAIL ${key}: contains a tab or newline, which a tab-separated sheet cannot carry`);
    process.exit(1);
  }
  rows.push([key, text, existing.get(key) ?? '', notes(key, text, english)]);
}

const tsv = rows.map((r) => r.join('\t')).join('\n') + '\n';
if (outPath) {
  const target = isAbsolute(outPath) ? outPath : join(ROOT, outPath);
  writeFileSync(target, tsv);
  const done = [...english.keys()].filter((k) => existing.has(k)).length;
  console.log(`${relative(ROOT, target)}: ${rows.length - 1} strings, ${done} already translated`);
} else {
  process.stdout.write(tsv);
}
