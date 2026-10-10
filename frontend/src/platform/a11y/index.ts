/**
 * Accessibility settings a student picks at setup, applied everywhere.
 * Owner: P5.
 *
 *   largeText      bigger letters across the app (the root text size grows, so everything scales)
 *   reduceMotion   no animations: confetti, sliding banners, pulsing calls and counting numbers
 *   timersOff      handled by the games: countdowns show but never run out
 *   audio          read-aloud, owned by P3's audio pipeline
 *
 * The first two are applied here as attributes on <html>, which index.css reads.
 * Games ask `useAccessibility()` for the rest.
 */
import type { Accessibility } from '../storage/db';
import { loadActiveProfile, useActiveProfile } from '../profiles';

export const DEFAULT_ACCESSIBILITY: Accessibility = { audio: false, largeText: false, reduceMotion: false, timersOff: false };

/** The active player's settings, or the defaults when nobody is signed in. */
export function useAccessibility(): Accessibility {
  return useActiveProfile((s) => s.profile?.a11y) ?? DEFAULT_ACCESSIBILITY;
}

/** Sets the attributes the stylesheet uses. Safe to call at any time, including from the setup screen as a live preview. */
export function applyAccessibility(a11y: Pick<Accessibility, 'largeText' | 'reduceMotion'>, root: HTMLElement = document.documentElement): void {
  root.dataset.largeText = String(a11y.largeText);
  root.dataset.reduceMotion = String(a11y.reduceMotion);
}

/**
 * True when animations should be skipped: the student chose "less movement",
 * or their phone's own setting asks for it. Used by code that animates in
 * JavaScript (confetti, number counters, vibration).
 */
export function prefersReducedMotion(): boolean {
  if (typeof document === 'undefined') return false;
  if (document.documentElement.dataset.reduceMotion === 'true') return true;
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}

let started = false;

/** Loads the active player and keeps the page in step with their settings. Call once at app start. */
export function startAccessibility(): void {
  if (started || typeof document === 'undefined') return;
  started = true;
  const sync = () => applyAccessibility(useActiveProfile.getState().profile?.a11y ?? DEFAULT_ACCESSIBILITY);
  useActiveProfile.subscribe(sync);
  void loadActiveProfile().then(sync);
}
