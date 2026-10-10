/**
 * The four "Make it easy for you" settings a student picks at setup.
 * Owner: P5 (the settings), P3 (audio).
 *
 * They live on the profile, so they are per-student on a shared phone rather
 * than per-device. Nobody signed in means nothing is switched on.
 */
import { useActiveProfile } from '../profiles';
import type { Accessibility } from '../storage/db';

export const NO_ACCESSIBILITY: Accessibility = {
  audio: false,
  largeText: false,
  reduceMotion: false,
  timersOff: false,
};

/** Readable outside React, for code that is not a component. */
export function accessibility(): Accessibility {
  return useActiveProfile.getState().profile?.a11y ?? NO_ACCESSIBILITY;
}

/** `const { audio } = useAccessibility()` — re-renders when the player changes. */
export function useAccessibility(): Accessibility {
  return useActiveProfile((s) => s.profile?.a11y) ?? NO_ACCESSIBILITY;
}
