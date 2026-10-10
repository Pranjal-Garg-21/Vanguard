#!/usr/bin/env node
/**
 * Content validator — P3 (work_division P3.2).
 *
 * Deliberately dependency-free plain JavaScript: it runs on a bare Node 20
 * with no install step, so it can gate CI from day one and anyone on the team
 * can run it on their own content before pushing.
 *
 * Run from the repository root:
 *
 *   node tools/authoring/validate.mjs            # errors fail, warnings print
 *   node tools/authoring/validate.mjs --strict   # warnings fail too
 *
 * What it checks (Implementation.md 6.3, 14.6):
 *   1. every content and bundle JSON parses
 *   2. concept and misconception IDs exist in the concept list
 *   3. verbs are real verbs
 *   4. effect paths resolve against the GameState shape in 6.1
 *   5. every key referenced by content exists in the English bundle
 *   6. every English key exists in every other shipped language
 *   7. every t() call in source has a key
 *   8. the content rules the plan states in prose but cannot enforce itself
 */

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
/** Everything the validator reads lives under the Vite app. */
const APP = join(ROOT, 'frontend', 'src');
const STRICT = process.argv.includes('--strict');

const errors = [];
const warnings = [];
const err = (where, msg) => errors.push({ where, msg });
const warn = (where, msg) => warnings.push({ where, msg });

const rel = (p) => relative(ROOT, p);

function walk(dir, test, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p, test, out);
    else if (test(entry)) out.push(p);
  }
  return out;
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (e) {
    err(rel(path), `invalid JSON: ${e.message}`);
    return null;
  }
}

/** Keys beginning with _ are authoring notes, never shipped strings. */
const isMeta = (key) => key.startsWith('_');

// ---------------------------------------------------------------------------
// 1. Concept list
// ---------------------------------------------------------------------------

const CONCEPTS = join(APP, 'content/concepts.json');

if (!existsSync(CONCEPTS)) err('concepts', 'no content/concepts.json found');
const conceptData = existsSync(CONCEPTS) ? readJson(CONCEPTS) : null;

/** The shared list is an array of IDs; an object map is also accepted. */
const idSet = (value) =>
  new Set(Array.isArray(value) ? value : Object.keys(value ?? {}));

const knownConcepts = idSet(conceptData?.concepts);
const knownMisconceptions = idSet(conceptData?.misconceptions);

// ---------------------------------------------------------------------------
// 2. Language bundles
// ---------------------------------------------------------------------------

const LOCALES = ['en', 'te', 'hi', 'ur'];
const I18N_DIR = join(APP, 'content/i18n');

/**
 * Bundles live in `content/i18n/<lang>/<namespace>.json` and may nest. The key
 * is the namespace plus the path, matching platform/i18n at runtime.
 */
function flattenInto(prefix, node, file, merged, origin) {
  for (const [key, value] of Object.entries(node)) {
    if (isMeta(key)) continue;
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      flattenInto(path, value, file, merged, origin);
      continue;
    }
    if (typeof value !== 'string') {
      err(rel(file), `key "${path}" must be a string, got ${typeof value}`);
      continue;
    }
    if (merged[path] !== undefined) {
      err(rel(file), `duplicate key "${path}" (also in ${origin[path]})`);
    }
    merged[path] = value;
    origin[path] = rel(file);
  }
}

function loadBundle(locale) {
  const dir = join(I18N_DIR, locale);
  const files = walk(dir, (f) => f.endsWith('.json'));
  const merged = {};
  const origin = {};
  for (const file of files) {
    const data = readJson(file);
    if (!data) continue;
    const namespace = file.split('/').pop().replace('.json', '');
    flattenInto(namespace, data, file, merged, origin);
  }
  return { keys: merged, files: files.length };
}

const bundles = {};
for (const locale of LOCALES) bundles[locale] = loadBundle(locale);

if (bundles.en.files === 0) err('i18n', 'no English bundle found in src/content/i18n');

const PLURAL_SUFFIXES = ['zero', 'one', 'two', 'few', 'many', 'other'];
const stripPlural = (key) =>
  key.replace(new RegExp(`\\.(${PLURAL_SUFFIXES.join('|')})$`), '');

/** A key resolves if it exists exactly, or as any nested plural variant. */
function resolves(bundleKeys, key) {
  if (bundleKeys[key] !== undefined) return true;
  return PLURAL_SUFFIXES.some((s) => bundleKeys[`${key}.${s}`] !== undefined);
}

// ---------------------------------------------------------------------------
// 3. Content files
// ---------------------------------------------------------------------------

const VERBS = new Set([
  'choose', 'allocate', 'commit', 'triage', 'rank', 'predict', 'judge', 'act_in_situ',
]);

/**
 * Valid effect-path roots, from the GameState in Implementation.md 6.1.
 * `.add` suffixes follow the `money.debt.add` convention in 6.3.
 */
const EFFECT_PATHS = [
  'money.cash', 'money.bank',
  'money.savingsJars.needs', 'money.savingsJars.wants',
  'money.savingsJars.future', 'money.savingsJars.emergency',
  'money.debt.add', 'money.investments.add',
  'money.commitments.add', 'money.monthlyIncome',
  'human.peaceOfMind', 'human.trust', 'human.safety',
  'meta.stage', 'meta.simMonth',
];
const effectPathValid = (path) =>
  EFFECT_PATHS.includes(path) ||
  path.startsWith('meta.flags.') ||
  path.startsWith('meta.goals.');

/** Every content field whose value is an i18n key. */
const KEY_FIELDS = [
  'textKey', 'labelKey', 'explainKey', 'contextKey', 'promptKey',
  'audioKey', 'revealKey', 'summaryKey', 'triggerKey', 'hookKey',
  'titleKey', 'footerKey', 'chooseKey', 'missedPaymentKey',
];

const referencedKeys = new Map(); // key -> where

function collectKeys(node, where) {
  if (Array.isArray(node)) {
    for (const item of node) collectKeys(item, where);
    return;
  }
  if (!node || typeof node !== 'object') return;

  for (const [field, value] of Object.entries(node)) {
    if (isMeta(field)) continue;
    if (KEY_FIELDS.includes(field) && typeof value === 'string') {
      if (!referencedKeys.has(value)) referencedKeys.set(value, where);
    } else {
      collectKeys(value, where);
    }
  }
}

function validateCard(card, scenario, where) {
  const bucketIds = (scenario.buckets ?? []).map((b) => b.id);

  if (card.correctBucket !== undefined && card.correctBucket !== null) {
    if (bucketIds.length && !bucketIds.includes(card.correctBucket)) {
      err(where, `card "${card.id}": correctBucket "${card.correctBucket}" is not one of [${bucketIds}]`);
    }
  } else if (!card.explainKey) {
    // An ambiguous card with nothing to say produces a blank summary panel.
    err(where, `card "${card.id}": ambiguous (no correctBucket) so it must have an explainKey`);
  }

  if (card.recontext) {
    if (!card.recontext.contextKey) {
      err(where, `card "${card.id}": recontext needs a contextKey`);
    }
    const rb = card.recontext.correctBucket;
    if (rb != null && bucketIds.length && !bucketIds.includes(rb)) {
      err(where, `card "${card.id}": recontext correctBucket "${rb}" is not one of [${bucketIds}]`);
    }
  }

  for (const concept of Object.keys(card.concepts ?? {})) {
    if (!knownConcepts.has(concept)) {
      err(where, `card "${card.id}": unknown concept "${concept}"`);
    }
  }
  for (const [concept, target] of Object.entries(card.concepts ?? {})) {
    if (typeof target !== 'number' || target < 0 || target > 1) {
      err(where, `card "${card.id}": concept "${concept}" target must be between 0 and 1, got ${target}`);
    }
  }

  if (card.misconception && !knownMisconceptions.has(card.misconception)) {
    err(where, `card "${card.id}": unknown misconception "${card.misconception}"`);
  }

  if (card.minLevel !== undefined && ![1, 2, 3].includes(card.minLevel)) {
    err(where, `card "${card.id}": minLevel must be 1, 2 or 3`);
  }
}

function validateEffects(effects, where, label) {
  for (const path of Object.keys(effects ?? {})) {
    if (!effectPathValid(path)) {
      err(where, `${label}: effect path "${path}" does not exist on GameState (6.1)`);
    }
  }
}

const scenarioFiles = walk(join(APP, 'content/scenarios'), (f) => f.endsWith('.json'));

for (const file of scenarioFiles) {
  const where = rel(file);
  const scenario = readJson(file);
  if (!scenario) continue;

  if (!scenario.id) err(where, 'missing "id"');
  if (!scenario.pillar) warn(where, 'missing "pillar"');

  if (scenario.verb && !VERBS.has(scenario.verb)) {
    err(where, `unknown verb "${scenario.verb}" — expected one of [${[...VERBS]}]`);
  }

  // A bucket needs an id and a labelKey. Triage renders `labelKey`, so a
  // bucket that only has `textKey` typechecks as content and renders blank.
  for (const bucket of scenario.buckets ?? []) {
    if (!bucket.id) err(where, 'a bucket has no id');
    if (!bucket.labelKey) {
      err(where, `bucket "${bucket.id}": needs a labelKey${bucket.textKey ? ' (found textKey)' : ''}`);
    }
  }
  if (scenario.buckets && scenario.buckets.length !== 2) {
    err(where, `expected exactly 2 buckets, found ${scenario.buckets.length}`);
  }

  const ids = new Set();
  for (const card of scenario.cards ?? []) {
    if (!card.id) {
      err(where, 'a card has no id');
      continue;
    }
    if (ids.has(card.id)) err(where, `duplicate card id "${card.id}"`);
    ids.add(card.id);
    validateCard(card, scenario, where);
  }

  validateEffects(scenario.effects, where, scenario.id);
  for (const option of scenario.module?.play?.options ?? []) {
    validateEffects(option.effects, where, `option "${option.id}"`);
    for (const concept of Object.keys(option.concepts ?? {})) {
      if (!knownConcepts.has(concept)) {
        err(where, `option "${option.id}": unknown concept "${concept}"`);
      }
    }
    if (option.misconception && !knownMisconceptions.has(option.misconception)) {
      err(where, `option "${option.id}": unknown misconception "${option.misconception}"`);
    }
  }

  for (const concept of scenario.concepts ?? []) {
    if (!knownConcepts.has(concept)) err(where, `unknown concept "${concept}"`);
  }

  collectKeys(scenario, where);
}

// ---------------------------------------------------------------------------
// 4. t() calls in source
// ---------------------------------------------------------------------------

const sourceFiles = walk(
  APP,
  (f) => (f.endsWith('.ts') || f.endsWith('.tsx')) && !f.endsWith('.test.ts'),
);

/**
 * Keys built at runtime, e.g. t(`concept.${id}`). We cannot know which key is
 * produced, but we do know the literal prefix, so any bundle key starting with
 * it counts as referenced. Without this, every dynamically addressed key looks
 * dead and the unused count becomes noise nobody reads.
 */
const dynamicPrefixes = [];

for (const file of sourceFiles) {
  const src = readFileSync(file, 'utf8');
  // t('key') and setWarning('verb.x.y')-style literals that look like keys.
  for (const m of src.matchAll(/\bt\(\s*'([a-zA-Z0-9_.]+)'/g)) {
    if (!referencedKeys.has(m[1])) referencedKeys.set(m[1], rel(file));
  }
  for (const m of src.matchAll(/'((?:verb|common)\.[a-zA-Z0-9_.]+)'/g)) {
    if (!referencedKeys.has(m[1])) referencedKeys.set(m[1], rel(file));
  }
  for (const m of src.matchAll(/\bt\(\s*`([a-zA-Z0-9_.]*)\$\{/g)) {
    if (m[1]) dynamicPrefixes.push({ prefix: m[1], where: rel(file) });
  }
}

const dynamicallyReferenced = (key) =>
  dynamicPrefixes.some((d) => key.startsWith(d.prefix));

// ---------------------------------------------------------------------------
// 5. Key coverage
// ---------------------------------------------------------------------------

for (const [key, where] of referencedKeys) {
  if (!resolves(bundles.en.keys, key)) {
    err(where, `string key "${key}" is referenced but missing from the English bundle`);
  }
}

const englishKeys = Object.keys(bundles.en.keys);

for (const locale of LOCALES) {
  if (locale === 'en') continue;
  if (bundles[locale].files === 0) {
    warn('i18n', `no ${locale} bundle yet — ${englishKeys.length} keys untranslated`);
    continue;
  }
  const missing = englishKeys.filter((k) => bundles[locale].keys[k] === undefined);
  if (missing.length) {
    warn(
      'i18n',
      `${locale}: ${missing.length}/${englishKeys.length} keys missing, e.g. ${missing.slice(0, 3).join(', ')}`,
    );
  }
  const extra = Object.keys(bundles[locale].keys).filter(
    (k) => bundles.en.keys[k] === undefined,
  );
  if (extra.length) {
    err('i18n', `${locale} has ${extra.length} keys not in English: ${extra.slice(0, 3).join(', ')}`);
  }
}

/**
 * Dynamic prefixes make a key "used" without proving it exists. For the two
 * label namespaces the UI builds by ID, check the other direction: every known
 * concept and misconception must have a label, or a mastery map and an Arcade
 * result will render a raw ID at the student.
 */
if (dynamicPrefixes.some((d) => d.prefix === 'concept.')) {
  for (const concept of knownConcepts) {
    if (!resolves(bundles.en.keys, `concept.${concept}`)) {
      err('i18n', `concept "${concept}" has no label key "concept.${concept}"`);
    }
  }
}
if (dynamicPrefixes.some((d) => d.prefix === 'misconception.')) {
  for (const m of knownMisconceptions) {
    if (!resolves(bundles.en.keys, `misconception.${m}`)) {
      err('i18n', `misconception "${m}" has no label key "misconception.${m}"`);
    }
  }
}

const unusedEnglish = englishKeys.filter((k) => {
  const base = stripPlural(k);
  return (
    !referencedKeys.has(k) && !referencedKeys.has(base) && !dynamicallyReferenced(k)
  );
});

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

console.log('PaisaPath content validator\n');
console.log(`  concepts   ${knownConcepts.size} concepts, ${knownMisconceptions.size} misconceptions`);
console.log(`  scenarios  ${plural(scenarioFiles.length, 'file')}`);
console.log(`  english    ${plural(englishKeys.length, 'key')} in ${plural(bundles.en.files, 'file')}`);
console.log(`  referenced ${plural(referencedKeys.size, 'key')} from content and source`);
if (dynamicPrefixes.length) {
  const prefixes = [...new Set(dynamicPrefixes.map((d) => `${d.prefix}*`))];
  console.log(`  dynamic    ${prefixes.join(', ')}`);
}
if (unusedEnglish.length) {
  console.log(`  unused     ${plural(unusedEnglish.length, 'English key')} with no reference`);
}
console.log();

for (const { where, msg } of warnings) console.log(`  warn  ${where}: ${msg}`);
if (warnings.length) console.log();
for (const { where, msg } of errors) console.log(`  FAIL  ${where}: ${msg}`);
if (errors.length) console.log();

if (errors.length === 0 && (warnings.length === 0 || !STRICT)) {
  console.log(`PASS — ${plural(errors.length, 'error')}, ${plural(warnings.length, 'warning')}`);
  process.exit(0);
}
console.log(`FAIL — ${plural(errors.length, 'error')}, ${plural(warnings.length, 'warning')}`);
process.exit(1);
