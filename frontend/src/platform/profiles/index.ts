/**
 * Player profiles on a shared device: create, list, unlock with picture-PIN,
 * switch player. Owner: P5.
 */
import { ulid } from 'ulid';
import { create } from 'zustand';
import { db, type Accessibility, type Profile } from '../storage/db';
import { DEVICE_SCOPE, getSetting, setSetting } from '../storage';
import { DEFAULT_LANGUAGE, setLanguage } from '../i18n';

export const MAX_PIN_ATTEMPTS = 3;
export const LOCKOUT_MS = 30_000;

/** What the avatar grid needs. No PIN data leaves this module. */
export type ProfileSummary = Pick<Profile, 'pid' | 'displayName' | 'avatarId' | 'language' | 'a11y' | 'classCode' | 'classStatus'>;

export type NewProfile = {
  displayName: string;
  avatarId: string;
  /** Picture IDs tapped in order, e.g. ['mango', 'kite', 'bus', 'star']. */
  pinPictures: string[];
  language: Profile['language'];
  a11y: Accessibility;
  classCode: string | null;
  /** Set to 'valid' when the code was confirmed online during setup. */
  classStatus?: Profile['classStatus'];
};

export type UnlockResult = { ok: true } | { ok: false; lockedForMs: number; attemptsLeft: number };

const ACTIVE_KEY = 'activePid';

/** The player currently using the app, for screens that need to react to it. */
export const useActiveProfile = create<{ profile: ProfileSummary | null; loaded: boolean }>(() => ({
  profile: null,
  loaded: false,
}));

function toSummary(p: Profile): ProfileSummary {
  const { pid, displayName, avatarId, language, a11y, classCode, classStatus } = p;
  return { pid, displayName, avatarId, language, a11y, classCode, classStatus };
}

function toHex(bytes: ArrayBuffer | Uint8Array): string {
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** The PIN itself is never stored, only a salted PBKDF2 hash. */
async function hashPin(pictures: string[], saltHex: string): Promise<string> {
  const salt = new Uint8Array(saltHex.match(/../g)!.map((h) => parseInt(h, 16)));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pictures.join('-')), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 100_000 }, key, 256);
  return toHex(bits);
}

export async function createProfile(input: NewProfile): Promise<ProfileSummary> {
  const now = Date.now();
  const pinSalt = toHex(crypto.getRandomValues(new Uint8Array(16)));
  const profile: Profile = {
    pid: ulid(),
    displayName: input.displayName.trim(),
    avatarId: input.avatarId,
    language: input.language,
    a11y: input.a11y,
    classCode: input.classCode ? input.classCode.toUpperCase() : null,
    classStatus: input.classCode ? (input.classStatus ?? 'pending') : 'none',
    pinSalt,
    pinHash: await hashPin(input.pinPictures, pinSalt),
    failedAttempts: 0,
    lockedUntil: 0,
    createdAt: now,
    lastActiveAt: now,
  };
  await db.profiles.add(profile);
  await setSetting(DEVICE_SCOPE, ACTIVE_KEY, profile.pid);
  useActiveProfile.setState({ profile: toSummary(profile), loaded: true });
  return toSummary(profile);
}

/** For the avatar grid, most recently active first. */
export async function listProfiles(): Promise<ProfileSummary[]> {
  const rows = await db.profiles.orderBy('lastActiveAt').reverse().toArray();
  return rows.map(toSummary);
}

export async function unlockProfile(pid: string, pinPictures: string[], now = Date.now()): Promise<UnlockResult> {
  const profile = await db.profiles.get(pid);
  if (!profile) throw new Error(`Unknown profile ${pid}`);

  if (profile.lockedUntil > now) {
    return { ok: false, lockedForMs: profile.lockedUntil - now, attemptsLeft: 0 };
  }

  if ((await hashPin(pinPictures, profile.pinSalt)) === profile.pinHash) {
    await db.profiles.update(pid, { failedAttempts: 0, lockedUntil: 0, lastActiveAt: now });
    await setSetting(DEVICE_SCOPE, ACTIVE_KEY, pid);
    useActiveProfile.setState({ profile: toSummary(profile), loaded: true });
    return { ok: true };
  }

  const failedAttempts = profile.failedAttempts + 1;
  if (failedAttempts >= MAX_PIN_ATTEMPTS) {
    await db.profiles.update(pid, { failedAttempts: 0, lockedUntil: now + LOCKOUT_MS });
    return { ok: false, lockedForMs: LOCKOUT_MS, attemptsLeft: 0 };
  }
  await db.profiles.update(pid, { failedAttempts });
  return { ok: false, lockedForMs: 0, attemptsLeft: MAX_PIN_ATTEMPTS - failedAttempts };
}

export async function getActiveProfile(): Promise<ProfileSummary | null> {
  const pid = await getSetting<string>(DEVICE_SCOPE, ACTIVE_KEY);
  const profile = pid ? await db.profiles.get(pid) : undefined;
  return profile ? toSummary(profile) : null;
}

/** Loads the active player into useActiveProfile. Call once at app start. */
export async function loadActiveProfile(): Promise<ProfileSummary | null> {
  const profile = await getActiveProfile();
  useActiveProfile.setState({ profile, loaded: true });
  return profile;
}

/** Back to the avatar grid. */
export async function switchPlayer(): Promise<void> {
  await setSetting(DEVICE_SCOPE, ACTIVE_KEY, null);
  useActiveProfile.setState({ profile: null, loaded: true });
}

/** Facilitator-approved PIN reset (UC-FAC-04). */
export async function resetPin(pid: string, pinPictures: string[]): Promise<void> {
  const pinSalt = toHex(crypto.getRandomValues(new Uint8Array(16)));
  await db.profiles.update(pid, { pinSalt, pinHash: await hashPin(pinPictures, pinSalt), failedAttempts: 0, lockedUntil: 0 });
}

export async function setClassStatus(pid: string, classStatus: Profile['classStatus']): Promise<void> {
  await db.profiles.update(pid, { classStatus });
}

/**
 * Every screen follows whoever is signed in: the language is the student's,
 * not the phone's, so two students sharing a phone can read in different ones.
 * Call once at app start. Returns a function that stops following.
 *
 * A language with no strings on the device is refused by setLanguage, so a
 * student whose pack has not been downloaded keeps English rather than
 * landing in a screen of raw keys (UC-PLAT-04).
 */
export function followProfileLanguage(): () => void {
  const apply = (language: string | undefined) => setLanguage((language as Parameters<typeof setLanguage>[0]) ?? DEFAULT_LANGUAGE);
  apply(useActiveProfile.getState().profile?.language);
  return useActiveProfile.subscribe((state, previous) => {
    if (state.profile?.language !== previous.profile?.language) apply(state.profile?.language);
  });
}
