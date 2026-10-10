import { useSyncExternalStore } from 'react';
import { audio } from './engine';

/** The current sound settings; re-renders when they change. */
export function useAudioSettings() {
  return useSyncExternalStore(
    (fn) => audio.subscribe(fn),
    () => audio.settings,
  );
}
