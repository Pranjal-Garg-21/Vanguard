#!/usr/bin/env node
/**
 * Translation checker. Compares a language's bundles with English, file by file.
 *
 *   node tools/authoring/i18n-check.mjs hi                 # every namespace
 *   node tools/authoring/i18n-check.mjs te setup home ui   # only these namespaces
 *
 * For every English string it checks that the translation exists, is not empty, keeps exactly the same
 * {placeholders} (a placeholder is code: {amount, rupees} must stay as it is), keeps the same number of ** bold
 * marks, and contains letters of the target script. It also flags keys that are not in English.
 * Exit code 1 when anything is wrong, so a translator can run it until clean.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const DIR = join(ROOT, 'frontend', 'src', 'content', 'i18n');

const [lang, ...only] = process.argv.slice(2);
if (!['hi', 'te', 'ur'].includes(lang)) {
  console.error('usage: i18n-check.mjs <hi|te|ur> [namespace ...]');
  process.exit(2);
}

const SCRIPT = {
  hi: /[ऀ-ॿ]/,
  te: /[ఀ-౿]/,
  ur: /[؀-ۿ]/,
}[lang];

function flatten(prefix, node, out) {
  for (const [key, value] of Object.entries(node)) {
    if (key.startsWith('_')) continue;
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object') flatten(path, value, out);
    else out[path] = value;
  }
  return out;
}

const parts = (s) => (String(s).match(/\{[^}]+\}/g) ?? []).sort().join('|');
const bold = (s) => (String(s).match(/\*\*/g) ?? []).length;
const letters = (s) => String(s).replace(/\{[^}]*\}/g, '').match(/[A-Za-z]{3,}/g) ?? [];

const files = readdirSync(join(DIR, 'en')).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5));
const namespaces = only.length ? only : files;

let problems = 0;
let strings = 0;
const report = [];
const note = (ns, key, msg) => {
  problems++;
  if (report.length < 40) report.push(`  ${ns}.${key}: ${msg}`);
};

for (const ns of namespaces) {
  if (!files.includes(ns)) {
    console.error(`no English namespace "${ns}"`);
    problems++;
    continue;
  }
  const en = flatten('', JSON.parse(readFileSync(join(DIR, 'en', `${ns}.json`), 'utf8')), {});
  const path = join(DIR, lang, `${ns}.json`);
  if (!existsSync(path)) {
    problems += Object.keys(en).length;
    report.push(`  ${ns}: file missing (${Object.keys(en).length} strings)`);
    continue;
  }
  let tr;
  try {
    tr = flatten('', JSON.parse(readFileSync(path, 'utf8')), {});
  } catch (e) {
    problems++;
    report.push(`  ${ns}: invalid JSON: ${e.message}`);
    continue;
  }
  for (const [key, source] of Object.entries(en)) {
    strings++;
    const out = tr[key];
    if (out === undefined) {
      note(ns, key, 'missing');
      continue;
    }
    if (typeof out !== 'string' || out.trim() === '') {
      note(ns, key, 'empty');
      continue;
    }
    if (parts(source) !== parts(out)) note(ns, key, `placeholders differ: ${parts(source)} vs ${parts(out)}`);
    if (bold(source) !== bold(out)) note(ns, key, 'number of ** marks differs');
    if (letters(source).length > 0 && !SCRIPT.test(out)) note(ns, key, `no ${lang} script in: ${out.slice(0, 50)}`);
  }
  for (const key of Object.keys(tr)) if (en[key] === undefined) note(ns, key, 'not in English');
}

console.log(`${lang}: ${strings} strings checked, ${problems} problem${problems === 1 ? '' : 's'}`);
for (const line of report) console.log(line);
if (problems > report.length) console.log(`  ... and ${problems - report.length} more`);
process.exit(problems ? 1 : 0);
