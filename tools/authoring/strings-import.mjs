#!/usr/bin/env node
/**
 * Reads a translator's tab-separated sheet back into the string files.
 * Owner: P3.
 *
 *   node tools/authoring/strings-import.mjs te translations/te.tsv
 *   node tools/authoring/strings-import.mjs te translations/te.tsv --dry-run
 *
 * It refuses a sheet that would break the app rather than writing it and
 * letting a student find out:
 *
 * - A {placeholder} dropped or renamed would show a student the literal word
 *   "{amount}" instead of their money, so a row that loses one is an error.
 * - About forty strings end with a space because they are one piece of a
 *   message that the Scam Lens splits. A spreadsheet eats that space. It is
 *   put back, and reported, rather than being left to break the sentence.
 * - A key that is not in the English files is a typo or a stale row; it is
 *   reported and skipped, never written.
 *
 * Writes one file per namespace, matching the English layout, so a reviewer
 * can diff te/safe.json against en/safe.json line for line.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { isAbsolute, join, relative } from 'node:path';

const ROOT = process.cwd();
const I18N = join(ROOT, 'frontend', 'src', 'content', 'i18n');
const LANGUAGES = ['te', 'hi', 'ur'];
const PLURAL = ['zero', 'one', 'two', 'few', 'many', 'other'];

const language = process.argv[2];
const sheetPath = process.argv[3];
const dryRun = process.argv.includes('--dry-run');

if (!LANGUAGES.includes(language) || !sheetPath) {
  console.error(`Usage: node tools/authoring/strings-import.mjs <${LANGUAGES.join('|')}> <sheet.tsv> [--dry-run]`);
  process.exit(2);
}

function flatten(prefix, value, into) {
  for (const [key, child] of Object.entries(value)) {
    if (key.startsWith('_')) continue;
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof child === 'string') into.set(path, child);
    else flatten(path, child, into);
  }
}

const english = new Map();
for (const file of readdirSync(join(I18N, 'en')).filter((f) => f.endsWith('.json')).sort()) {
  flatten(file.replace('.json', ''), JSON.parse(readFileSync(join(I18N, 'en', file), 'utf8')), english);
}

const placeholders = (text) => [...text.matchAll(/\{\s*(\w+)[^}]*\}/g)].map((m) => m[0]).sort();

const errors = [];
const repaired = [];
const skipped = [];
const translated = new Map();

const sheet = readFileSync(isAbsolute(sheetPath) ? sheetPath : join(ROOT, sheetPath), 'utf8');
const lines = sheet.split(/\r?\n/).filter((l) => l.trim() !== '');
const header = (lines[0] ?? '').split('\t').map((h) => h.trim().toLowerCase());
const keyAt = header.indexOf('key');
const textAt = header.indexOf('translation');
if (keyAt === -1 || textAt === -1) {
  console.error('The sheet needs a "key" column and a "translation" column in its first row.');
  process.exit(1);
}

for (const [i, line] of lines.slice(1).entries()) {
  const cells = line.split('\t');
  const key = (cells[keyAt] ?? '').trim();
  let text = cells[textAt] ?? '';
  const where = `row ${i + 2} (${key || 'no key'})`;
  if (!key || text.trim() === '') continue;

  const source = english.get(key);
  // A plural form a language needs but English does not is fine, as long as
  // its siblings exist: Urdu may want "few" where English has only "other".
  const last = key.split('.').at(-1);
  const sibling = PLURAL.includes(last) && PLURAL.some((f) => english.has(`${key.slice(0, -(last.length + 1))}.${f}`));
  if (source === undefined && !sibling) {
    skipped.push(`${where}: not a key in the English files`);
    continue;
  }

  const reference = source ?? english.get(`${key.slice(0, -(last.length + 1))}.other`) ?? '';
  const want = placeholders(reference);
  const got = placeholders(text);
  if (want.join(' ') !== got.join(' ')) {
    errors.push(`${where}: English has ${want.join(' ') || '(none)'}, the translation has ${got.join(' ') || '(none)'}`);
    continue;
  }

  if (reference !== reference.trimEnd() && text === text.trimEnd()) {
    text = `${text} `;
    repaired.push(`${where}: put back the space at the end`);
  }

  translated.set(key, text);
}

for (const line of skipped) console.log(`  skip  ${line}`);
for (const line of repaired) console.log(`  fix   ${line}`);
for (const line of errors) console.log(`  FAIL  ${line}`);

if (errors.length > 0) {
  console.log(`\nFAIL — ${errors.length} row${errors.length === 1 ? '' : 's'} would break a screen. Nothing was written.`);
  process.exit(1);
}

/** Flat keys back into the nested shape the English files use. */
function nest(entries) {
  const out = {};
  for (const [key, value] of entries) {
    const parts = key.split('.');
    let node = out;
    for (const part of parts.slice(0, -1)) {
      if (typeof node[part] !== 'object' || node[part] === null) node[part] = {};
      node = node[part];
    }
    node[parts.at(-1)] = value;
  }
  return out;
}

const byNamespace = new Map();
for (const [key, value] of translated) {
  const namespace = key.split('.')[0];
  if (!byNamespace.has(namespace)) byNamespace.set(namespace, []);
  // The namespace is the file name, so it is not repeated inside the file.
  byNamespace.get(namespace).push([key.slice(namespace.length + 1), value]);
}

const dir = join(I18N, language);
if (!dryRun && !existsSync(dir)) mkdirSync(dir, { recursive: true });

for (const [namespace, entries] of [...byNamespace].sort()) {
  const file = join(dir, `${namespace}.json`);
  const body = JSON.stringify(nest(entries), null, 2) + '\n';
  if (!dryRun) writeFileSync(file, body);
  console.log(`  ${dryRun ? 'would write' : 'wrote'}  ${relative(ROOT, file)} (${entries.length})`);
}

const missing = [...english.keys()].filter((k) => !translated.has(k)).length;
console.log(
  `\nPASS — ${translated.size} of ${english.size} strings in ${language}` +
    (missing ? `, ${missing} still in English` : ', complete') +
    `. Run \`node tools/authoring/validate.mjs\` next.`,
);
