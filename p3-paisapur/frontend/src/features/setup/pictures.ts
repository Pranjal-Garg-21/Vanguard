/** Avatars and picture-PIN images. Emoji for now; P4 swaps in illustrations. */

export const AVATARS = [
  { id: 'avatar_01', emoji: '🧑🏽‍🎓' },
  { id: 'avatar_02', emoji: '👩🏽‍🎓' },
  { id: 'avatar_03', emoji: '🧕🏽' },
  { id: 'avatar_04', emoji: '👨🏽‍💻' },
  { id: 'avatar_05', emoji: '👩🏽‍🔧' },
  { id: 'avatar_06', emoji: '🧑🏽‍🍳' },
  { id: 'avatar_07', emoji: '👩🏽‍🎨' },
  { id: 'avatar_08', emoji: '🧑🏽‍🌾' },
  { id: 'avatar_09', emoji: '👨🏽‍🔬' },
  { id: 'avatar_10', emoji: '👩🏽‍🏫' },
  { id: 'avatar_11', emoji: '🧑🏽‍🚀' },
  { id: 'avatar_12', emoji: '🦸🏽' },
] as const;

export function avatarEmoji(id: string): string {
  return AVATARS.find((a) => a.id === id)?.emoji ?? '🙂';
}

export const PIN_PICTURES = [
  { id: 'mango', emoji: '🥭' },
  { id: 'kite', emoji: '🪁' },
  { id: 'bus', emoji: '🚌' },
  { id: 'star', emoji: '⭐' },
  { id: 'elephant', emoji: '🐘' },
  { id: 'flower', emoji: '🌸' },
  { id: 'chai', emoji: '🍵' },
  { id: 'cricket', emoji: '🏏' },
  { id: 'peacock', emoji: '🦚' },
  { id: 'cycle', emoji: '🚲' },
  { id: 'moon', emoji: '🌙' },
  { id: 'balloon', emoji: '🎈' },
] as const;

export const PIN_LENGTH = 4;

export const LANGUAGES = [
  { id: 'en', native: 'English', english: 'English' },
  { id: 'te', native: 'తెలుగు', english: 'Telugu' },
  { id: 'hi', native: 'हिन्दी', english: 'Hindi' },
  { id: 'ur', native: 'اردو', english: 'Urdu' },
] as const;
