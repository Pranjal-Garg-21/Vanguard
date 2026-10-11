/**
 * Avatars and picture-PIN images, drawn with the shared icon set (see ui/Icon).
 * The ids are stored in profiles and PIN hashes, so they never change; only the
 * drawing does. P4 may swap in illustrations later.
 */
import type { IconName } from '@/ui';

export const AVATARS = [
  { id: 'avatar_01', icon: 'graduation' },
  { id: 'avatar_02', icon: 'book' },
  { id: 'avatar_03', icon: 'heart' },
  { id: 'avatar_04', icon: 'code' },
  { id: 'avatar_05', icon: 'wrench' },
  { id: 'avatar_06', icon: 'chef' },
  { id: 'avatar_07', icon: 'palette' },
  { id: 'avatar_08', icon: 'sprout' },
  { id: 'avatar_09', icon: 'flask' },
  { id: 'avatar_10', icon: 'school' },
  { id: 'avatar_11', icon: 'rocket' },
  { id: 'avatar_12', icon: 'star' },
] as const satisfies readonly { id: string; icon: IconName }[];

export function avatarIcon(id: string): IconName {
  return AVATARS.find((a) => a.id === id)?.icon ?? 'user';
}

export const PIN_PICTURES = [
  { id: 'mango', icon: 'citrus' },
  { id: 'kite', icon: 'wind' },
  { id: 'bus', icon: 'bus' },
  { id: 'star', icon: 'star' },
  { id: 'elephant', icon: 'cat' },
  { id: 'flower', icon: 'flower' },
  { id: 'chai', icon: 'coffee' },
  { id: 'cricket', icon: 'trophy' },
  { id: 'peacock', icon: 'bird' },
  { id: 'cycle', icon: 'bike' },
  { id: 'moon', icon: 'moon' },
  { id: 'balloon', icon: 'cloud' },
] as const satisfies readonly { id: string; icon: IconName }[];

export const PIN_LENGTH = 4;

export const LANGUAGES = [
  { id: 'en', native: 'English', english: 'English' },
  { id: 'te', native: 'తెలుగు', english: 'Telugu' },
  { id: 'hi', native: 'हिन्दी', english: 'Hindi' },
  { id: 'ur', native: 'اردو', english: 'Urdu' },
] as const;
