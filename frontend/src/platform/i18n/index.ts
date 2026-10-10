/**
 * Translation. Owner: P3.
 *
 * STUB so everyone can write t('key') from day one. It reads English bundles
 * from src/content/i18n/en/<namespace>.json, where a key "setup.title" lives
 * in setup.json as "title". P3 replaces this with the real loader (all
 * languages, plurals, ₹ formatting, RTL); keep the t() signature.
 */

export type Language = 'en' | 'te' | 'hi' | 'ur';

type Bundle = { [key: string]: string | Bundle };

const files = import.meta.glob<Bundle>('../../content/i18n/en/*.json', { eager: true, import: 'default' });

const strings = new Map<string, string>();

function flatten(prefix: string, bundle: Bundle) {
  for (const [key, value] of Object.entries(bundle)) {
    const path = `${prefix}.${key}`;
    if (typeof value === 'string') strings.set(path, value);
    else flatten(path, value);
  }
}

for (const [file, bundle] of Object.entries(files)) {
  flatten(file.split('/').pop()!.replace('.json', ''), bundle);
}

/**
 * Adds text at runtime, for example a facilitator's own scenarios. Same name and
 * signature as the loader on P3's branch. This stub keeps one table, so the
 * language argument is accepted but not used.
 */
export function registerStrings(_language: Language, flat: Record<string, string>): void {
  for (const [key, value] of Object.entries(flat)) strings.set(key, value);
}

/** Returns the English string with {placeholders} filled, or the key if missing. */
export function t(key: string, vars: Record<string, string | number> = {}): string {
  const template = strings.get(key) ?? key;
  return template.replace(/\{(\w+)\}/g, (_, name: string) => String(vars[name] ?? `{${name}}`));
}

export function isRtl(language: Language): boolean {
  return language === 'ur';
}
