/**
 * Script fonts, loaded only for the language in use. Owner: P3.
 *
 * Latin is bundled eagerly in main.tsx because every screen needs it. Telugu,
 * Devanagari and Nastaliq are about 250 KB together, so a student who plays in
 * English never downloads them: a language's font is fetched the first time
 * that language is chosen, and the offline cache keeps it from then on.
 *
 * Without this the three scripts fall back to whatever the phone happens to
 * have, which on a low-end Android is often a missing-glyph box.
 */
import { getLanguage, subscribeToLanguage, type Language } from '@/platform';

const loaders: Record<Language, Array<() => Promise<unknown>>> = {
  en: [],
  te: [() => import('@fontsource/noto-sans-telugu/telugu-400.css'), () => import('@fontsource/noto-sans-telugu/telugu-700.css')],
  hi: [
    () => import('@fontsource/noto-sans-devanagari/devanagari-400.css'),
    () => import('@fontsource/noto-sans-devanagari/devanagari-700.css'),
  ],
  // Nastaliq has no useful bold, and one weight is already 160 KB.
  ur: [() => import('@fontsource/noto-nastaliq-urdu/arabic-400.css')],
};

const started = new Set<Language>();

/** Downloads the font for a language once. Safe to call on every change. */
export async function loadScriptFont(language: Language): Promise<void> {
  if (started.has(language)) return;
  started.add(language);
  try {
    await Promise.all(loaders[language].map((load) => load()));
  } catch {
    // A missing font is not worth breaking the screen for: the phone's own
    // font still renders the text, just less well.
    started.delete(language);
  }
}

/** Loads the current language's font and keeps up with later changes. */
export function startFonts(): () => void {
  void loadScriptFont(getLanguage());
  return subscribeToLanguage(() => void loadScriptFont(getLanguage()));
}
