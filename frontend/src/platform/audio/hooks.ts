/**
 * React bindings for reading aloud. Owner: P3.
 *
 * A module store rather than a context, for the same reason as i18n: `speak()`
 * has to work outside React, and the linter keeps features out of
 * `@/platform/<subfolder>`.
 */
import { useEffect, useSyncExternalStore } from 'react';

import type { TVars } from '../i18n';
import { autoSpeak, clipFor, joinKeys, nowSpeaking, stopSpeaking, subscribeToSpeech } from './index';

/** The id of whatever is being read now, so a button can show it is playing. */
export function useSpeaking(): string | null {
  return useSyncExternalStore(subscribeToSpeech, nowSpeaking, () => null);
}

/**
 * Reads a screen when it opens, if "Read things aloud" is on, and stops when
 * the student leaves it. The keys are read as one sentence.
 *
 * The effect watches the text rather than the array, because callers rebuild
 * `keys` and `vars` on every render and the student should not hear the same
 * message start again because the parent re-rendered.
 */
export function useReadAloud(keys: string[], vars: TVars = {}, clipKey?: string): void {
  const text = joinKeys(keys, vars);
  const id = clipKey ?? keys.join('|');
  const clip = clipFor(keys, clipKey);
  useEffect(() => {
    autoSpeak(text, { id, clipKey: clip });
    return stopSpeaking;
  }, [text, id, clip]);
}
