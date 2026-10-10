/**
 * Translation. Owner: P3.
 *
 * Replaces the scaffold stub. The `t(key, vars)` signature is unchanged, so
 * every screen P5 already wrote keeps working, and `{placeholders}` still use
 * single braces.
 *
 * What is new on top of the stub:
 *   • all four languages, with per-key fallback to English
 *   • plurals through Intl.PluralRules
 *   • ₹ formatting with Indian digit grouping: {amount, rupees} → ₹1,25,000
 *   • language switching at runtime, with subscribers (see ./hooks)
 *   • a missing-key hook the content validator and tests can read
 *
 * Bundles live in `content/i18n/<lang>/<namespace>.json` and may nest; the key
 * is the namespace plus the path, so `setup.welcome.title` is `title` inside
 * `welcome` in `setup.json`.
 */

export type Language = 'en' | 'te' | 'hi' | 'ur';

export const LANGUAGES: Language[] = ['en', 'te', 'hi', 'ur'];
export const DEFAULT_LANGUAGE: Language = 'en';

type Bundle = { [key: string]: string | Bundle };

/** Urdu is the only right-to-left language in scope (UC-SYS-09). */
export function isRtl(language: Language): boolean {
  return language === 'ur';
}

export function direction(language: Language): 'rtl' | 'ltr' {
  return isRtl(language) ? 'rtl' : 'ltr';
}

// ---------------------------------------------------------------------------
// Loading
// ---------------------------------------------------------------------------

const files = import.meta.glob<Bundle>('../../content/i18n/*/*.json', {
  eager: true,
  import: 'default',
});

/** language -> flat key -> string */
const strings = new Map<Language, Map<string, string>>();

function flatten(prefix: string, bundle: Bundle, into: Map<string, string>) {
  for (const [key, value] of Object.entries(bundle)) {
    // Keys beginning with _ are authoring notes, never shipped strings.
    if (key.startsWith('_')) continue;
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') into.set(path, value);
    else flatten(path, value, into);
  }
}

for (const [file, bundle] of Object.entries(files)) {
  const parts = file.split('/');
  const fileName = parts.at(-1);
  const language = parts.at(-2) as Language | undefined;
  if (!fileName || !language || !LANGUAGES.includes(language)) continue;
  const namespace = fileName.replace('.json', '');

  let table = strings.get(language);
  if (!table) {
    table = new Map();
    strings.set(language, table);
  }
  flatten(namespace, bundle, table);
}

export function hasLanguage(language: Language): boolean {
  const table = strings.get(language);
  return table !== undefined && table.size > 0;
}

export function loadedLanguages(): Language[] {
  return LANGUAGES.filter(hasLanguage);
}

/** Used by tests and by the language-pack loader (UC-PLAT-04). */
export function registerStrings(language: Language, flat: Record<string, string>): void {
  let table = strings.get(language);
  if (!table) {
    table = new Map();
    strings.set(language, table);
  }
  for (const [key, value] of Object.entries(flat)) table.set(key, value);
  notify();
}

// ---------------------------------------------------------------------------
// Current language
// ---------------------------------------------------------------------------

let current: Language = DEFAULT_LANGUAGE;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

export function getLanguage(): Language {
  return current;
}

/**
 * Switch language. Refuses to move to a pack that is not on the device —
 * UC-PLAT-04 says we keep the current language and download at the next
 * connection, rather than dropping the student into a screen of raw keys.
 * Returns whether the switch happened.
 */
export function setLanguage(language: Language): boolean {
  if (language === current) return true;
  if (!hasLanguage(language)) return false;
  current = language;
  if (typeof document !== 'undefined') {
    document.documentElement.lang = language;
    document.documentElement.dir = direction(language);
  }
  notify();
  return true;
}

export function subscribeToLanguage(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// ---------------------------------------------------------------------------
// Numbers and money
// ---------------------------------------------------------------------------

/**
 * Amounts are formatted with one pinned tag in every language, deliberately.
 *
 * `-u-nu-latn` forces Western digits — Urdu would otherwise render Arabic-Indic
 * ones, which these students do not read on price tags. The grouping locale is
 * pinned to en-IN because ur-IN groups in thousands: it renders 125000 as
 * ₹125,000 rather than the ₹1,25,000 every Indian price tag uses. Verified on
 * Node 20 ICU; en, te and hi agree, only ur deviates.
 */
const NUMBER_TAG = 'en-IN-u-nu-latn';

const rupeeFormat = new Intl.NumberFormat(NUMBER_TAG, {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});

const numberFormat = new Intl.NumberFormat(NUMBER_TAG, { maximumFractionDigits: 0 });

/** 125000 → "₹1,25,000". Paise are dropped; no amount in the game has them. */
export function formatRupees(amount: number): string {
  return rupeeFormat.format(amount);
}

export function formatNumber(value: number): string {
  return numberFormat.format(value);
}

const INTL_TAG: Record<Language, string> = {
  en: 'en-IN',
  te: 'te-IN',
  hi: 'hi-IN',
  ur: 'ur-IN',
};

const pluralRules = new Map<Language, Intl.PluralRules>();

export function pluralCategory(count: number, language: Language = current): string {
  let rules = pluralRules.get(language);
  if (!rules) {
    rules = new Intl.PluralRules(INTL_TAG[language]);
    pluralRules.set(language, rules);
  }
  return rules.select(count);
}

// ---------------------------------------------------------------------------
// Lookup
// ---------------------------------------------------------------------------

export type TVars = Record<string, string | number>;

export type MissingKeyHandler = (key: string, language: Language) => void;

let onMissingKey: MissingKeyHandler = () => {};

/** Tests and the validator swap this for a collector. */
export function setMissingKeyHandler(handler: MissingKeyHandler): void {
  onMissingKey = handler;
}

function lookup(key: string, language: Language, vars?: TVars): string | undefined {
  const table = strings.get(language);
  if (!table) return undefined;

  // A plural key stores its variants as children: `n_months.one`, `.other`.
  if (vars && typeof vars.count === 'number') {
    const plural = table.get(`${key}.${pluralCategory(vars.count, language)}`);
    if (plural !== undefined) return plural;
  }
  return table.get(key);
}

/**
 * `{name}` inserts a value. `{amount, rupees}` formats it as ₹ with Indian
 * grouping, `{n, number}` groups without the symbol. An unknown placeholder is
 * left in place so a missing variable is visible rather than silently blank.
 */
function interpolate(template: string, vars: TVars): string {
  return template.replace(
    /\{\s*(\w+)\s*(?:,\s*(\w+)\s*)?\}/g,
    (whole, name: string, format?: string) => {
      const value = vars[name];
      if (value === undefined) return whole;
      if (format === 'rupees') return formatRupees(Number(value));
      if (format === 'number') return formatNumber(Number(value));
      return String(value);
    },
  );
}

/**
 * The English string, or the current language's, with `{placeholders}` filled.
 * Falls back to English, then to the key itself — a missing string shows up as
 * a visible key rather than an empty screen.
 */
export function t(key: string, vars: TVars = {}): string {
  let template = lookup(key, current, vars);

  if (template === undefined && current !== DEFAULT_LANGUAGE) {
    template = lookup(key, DEFAULT_LANGUAGE, vars);
    if (template !== undefined) onMissingKey(key, current);
  }

  if (template === undefined) {
    onMissingKey(key, current);
    return key;
  }

  return interpolate(template, vars);
}

/** ₹ helper for components that would otherwise reach for Intl themselves. */
export const rupees = formatRupees;
