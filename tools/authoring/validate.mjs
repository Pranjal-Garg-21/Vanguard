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

/**
 * The shared list may be an array of IDs, an array of `{id, …}` objects, or an
 * object map. All three have appeared as the file has grown.
 */
const idSet = (value) => {
  if (Array.isArray(value)) {
    return new Set(value.map((v) => (typeof v === 'string' ? v : v?.id)).filter(Boolean));
  }
  return new Set(Object.keys(value ?? {}));
};

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
    const namespace = file.split(/[\\/]/).pop().replace('.json', '');
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

// A file under a `pools/` folder is a bag of items a script draws from (the
// Scam Inbox pool, the UPI check questions), not a script, so it has no id of
// its own. Its text keys are still checked.
const isPool = (file) => rel(file).split(/[\\/]/).includes('pools');

/**
 * Not every JSON file under content/scenarios is a script a verb plays. A
 * pillar may keep its own concept registry, a section manifest, or the
 * configuration a whole simulator runs on (the market's companies, a fund's
 * NAV path). Those have no id and no cards, and checking them as scripts only
 * produces noise. Their text keys are still collected.
 */
const SCRIPT_FIELDS = ['id', 'verb', 'cards', 'steps', 'module', 'items', 'jars'];
const isScenario = (data) =>
  !Array.isArray(data) && typeof data === 'object' && SCRIPT_FIELDS.some((field) => data[field] !== undefined);

/**
 * The bucket and card rules below describe P3's two-bucket Triage. Other verbs
 * sort differently — Invest, Gamble or Scam? has three buckets named as plain
 * strings and answers in `answer` — so they are checked by their own owner.
 */
const isTriage = (data) => Array.isArray(data.buckets) && data.buckets.every((b) => b && typeof b === 'object');

for (const file of scenarioFiles) {
  const where = rel(file);
  const scenario = readJson(file);
  if (!scenario) continue;

  if (!isScenario(scenario)) {
    collectKeys(scenario, where);
    continue;
  }

  if (!scenario.id && !isPool(file)) err(where, 'missing "id"');
  // The folder under content/scenarios is the pillar, so a file only needs the
  // field when it sits somewhere else or disagrees with its folder. The Safe
  // pillar has two folders: scenarios/safe holds Stay Safe phone scripts and
  // scenarios/protect holds Everyday Money games, because Stay Safe loads its
  // folder with a glob and the two file shapes are different.
  const folderPillar = rel(file).split(/[\\/]/).at(4);
  const samePillar = (a, b) => a === b || (a === 'safe' && b === 'protect') || (a === 'protect' && b === 'safe');
  if (!scenario.pillar && !folderPillar) warn(where, 'missing "pillar"');
  if (scenario.pillar && folderPillar && !samePillar(scenario.pillar, folderPillar)) {
    warn(where, `pillar "${scenario.pillar}" but the file sits in ${folderPillar}/`);
  }

  if (scenario.verb && !VERBS.has(scenario.verb)) {
    err(where, `unknown verb "${scenario.verb}" — expected one of [${[...VERBS]}]`);
  }

  // A bucket needs an id and a labelKey. Triage renders `labelKey`, so a
  // bucket that only has `textKey` typechecks as content and renders blank.
  for (const bucket of (isTriage(scenario) ? scenario.buckets : [])) {
    if (!bucket.id) err(where, 'a bucket has no id');
    if (!bucket.labelKey) {
      err(where, `bucket "${bucket.id}": needs a labelKey${bucket.textKey ? ' (found textKey)' : ''}`);
    }
  }
  if (isTriage(scenario) && scenario.buckets.length !== 2) {
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
    if (isTriage(scenario)) validateCard(card, scenario, where);
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
// 3b. Story scripts
//
// GAME_DESIGN asks this validator to check that every say/label key exists,
// every minigame id is registered, and every concept is in concepts.json.
// ---------------------------------------------------------------------------

/** A mini-game is "registered" if a scenario file declares it. */
const registeredGames = new Set();
for (const file of scenarioFiles) {
  const scenario = readJson(file);
  if (scenario?.id) registeredGames.add(scenario.id);
}

/** Fields in a story step whose value is an i18n key. */
const STEP_KEY_FIELDS = ['say', 'prompt', 'label', 'toast', 'objective'];

function walkStory(steps, where) {
  if (!Array.isArray(steps)) return;
  for (const step of steps) {
    if (!step || typeof step !== 'object') continue;

    for (const field of STEP_KEY_FIELDS) {
      const value = step[field];
      if (typeof value === 'string' && !referencedKeys.has(value)) {
        referencedKeys.set(value, where);
      }
    }
    if (typeof step.concept === 'string' && !knownConcepts.has(step.concept)) {
      err(where, `story teaches unknown concept "${step.concept}"`);
    }
    if (typeof step.minigame === 'string' && !registeredGames.has(step.minigame)) {
      err(where, `story calls unregistered mini-game "${step.minigame}"`);
    }
    if (step.log?.misconception && !knownMisconceptions.has(step.log.misconception)) {
      err(where, `unknown misconception "${step.log.misconception}"`);
    }

    for (const field of ['then', 'else', 'win', 'lose', 'do']) {
      if (Array.isArray(step[field])) walkStory(step[field], where);
    }
    if (Array.isArray(step.choice)) {
      for (const option of step.choice) {
        if (typeof option?.label === 'string' && !referencedKeys.has(option.label)) {
          referencedKeys.set(option.label, where);
        }
        if (option?.log?.misconception && !knownMisconceptions.has(option.log.misconception)) {
          err(where, `unknown misconception "${option.log.misconception}"`);
        }
        walkStory(option?.do, where);
      }
    }
  }
}

const storyFiles = walk(join(APP, 'content/story'), (f) => f.endsWith('.json'));
let storyScripts = 0;
for (const file of storyFiles) {
  const data = readJson(file);
  if (!data) continue;
  for (const [name, steps] of Object.entries(data)) {
    if (!Array.isArray(steps)) continue;
    storyScripts++;
    walkStory(steps, `${rel(file)}:${name}`);
  }
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
if (dynamicPrefixes.some((d) => d.prefix === 'concepts.')) {
  for (const concept of knownConcepts) {
    for (const part of ['title', 'body', 'example']) {
      if (!resolves(bundles.en.keys, `concepts.${concept}.${part}`)) {
        err('i18n', `concept "${concept}" has no ${part} (concepts.${concept}.${part})`);
      }
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

console.log('MoneyPath content validator\n');
console.log(`  concepts   ${knownConcepts.size} concepts, ${knownMisconceptions.size} misconceptions`);
console.log(`  scenarios  ${plural(scenarioFiles.length, 'file')}`);
console.log(`  story      ${plural(storyScripts, 'script')} in ${plural(storyFiles.length, 'file')}`);
console.log(`  games      ${plural(registeredGames.size, 'registered id')}`);
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
