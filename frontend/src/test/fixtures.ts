/**
 * Helpers for tests. Owner: P5.
 * Use resetDb() in beforeEach and createTestProfile() when a test needs an active player.
 */
import { db } from '@/platform/storage/db';
import { createProfile, type NewProfile } from '@/platform/profiles';

export const TEST_PIN = ['mango', 'kite', 'bus', 'star'];

export async function resetDb(): Promise<void> {
  await Promise.all(db.tables.map((table) => table.clear()));
}

export function createTestProfile(overrides: Partial<NewProfile> = {}) {
  return createProfile({
    displayName: 'Test player',
    avatarId: 'avatar_01',
    pinPictures: TEST_PIN,
    language: 'en',
    a11y: { audio: false, largeText: false, reduceMotion: false, timersOff: false },
    classCode: null,
    ...overrides,
  });
}
