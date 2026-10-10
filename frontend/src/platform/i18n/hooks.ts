/**
 * React bindings for i18n. Owner: P3.
 *
 * A module-level store rather than a context provider, for two reasons: the
 * linter forbids `features/`, `games/` and `runtime/` from importing
 * `@/platform/<subfolder>`, so every consumer reaches these through
 * `@/platform`; and `t()` has to stay callable outside React, which P5's
 * screens already rely on.
 *
 * Changing language re-renders every subscriber, so no restart is needed
 * (UC-SYS-09).
 */

import { useCallback, useSyncExternalStore } from 'react';

import {
  getLanguage,
  isRtl,
  subscribeToLanguage,
  t,
  type Language,
  type TVars,
} from './index';

export function useLanguage(): Language {
  return useSyncExternalStore(subscribeToLanguage, getLanguage, getLanguage);
}

/**
 * `const t = useT()` — the same `t` as the module-level one, but the component
 * re-renders when the language changes.
 */
export function useT(): (key: string, vars?: TVars) => string {
  useLanguage();
  return useCallback((key: string, vars?: TVars) => t(key, vars), []);
}

export function useDirection(): { rtl: boolean; dir: 'rtl' | 'ltr' } {
  const language = useLanguage();
  return { rtl: isRtl(language), dir: isRtl(language) ? 'rtl' : 'ltr' };
}
