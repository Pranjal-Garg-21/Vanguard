/** Loads and saves a player's Stay Safe progress through the platform storage API. Owner: P5. */
import { getActiveProfile, loadGame, saveGame } from '@/platform';
import { emptyProgress, type Progress } from './logic/progress';

const SLOT = 'safe-progress';

export async function loadProgress(): Promise<Progress> {
  const profile = await getActiveProfile();
  if (!profile) return emptyProgress();
  const saved = await loadGame<Progress>(profile.pid, SLOT);
  return saved && saved.v === 1 ? { ...emptyProgress(), ...saved } : emptyProgress();
}

export async function saveProgress(progress: Progress): Promise<void> {
  const profile = await getActiveProfile();
  if (profile) await saveGame(profile.pid, SLOT, progress);
}
