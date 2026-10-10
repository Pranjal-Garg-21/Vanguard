import { useCallback, useEffect, useState } from 'react';
import { createRun, reduce } from './logic/runner';
import type { RunAction, RunState, Scenario } from './logic/types';

const TICK_MS = 250;

/**
 * Drives a script in real time: wraps the pure runner in React state and
 * ticks the simulated clock while the run is live. Owner: P5.
 */
export function usePhoneRun(script: Scenario, opts: { timersOff?: boolean; paused?: boolean } = {}) {
  const [state, setState] = useState<RunState>(() => createRun(script, { timersOff: opts.timersOff }));
  const dispatch = useCallback((action: RunAction) => setState((s) => reduce(s, action)), []);

  const live = !state.ended && !opts.paused;
  useEffect(() => {
    if (!live) return;
    const id = window.setInterval(() => dispatch({ type: 'tick', ms: TICK_MS }), TICK_MS);
    return () => window.clearInterval(id);
  }, [live, dispatch]);

  return { state, dispatch };
}

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}

/** Short buzz for calls and notifications. Skipped when the student prefers reduced motion. */
export function buzz(pattern: number | number[]): void {
  if (prefersReducedMotion()) return;
  navigator.vibrate?.(pattern);
}
