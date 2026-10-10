/**
 * What the student should be told about the offline app: ready for offline use,
 * a new version, install, and whether the phone is online. Plain state, no
 * browser registration here, so it can be tested. Owner: P5.
 */
import { create } from 'zustand';

export type PwaState = {
  /** The app files are saved on the phone, so it opens without internet. Shown once. */
  offlineReady: boolean;
  /** A newer version has been downloaded and is waiting. */
  needRefresh: boolean;
  /** The browser can show its own install prompt. */
  canInstall: boolean;
  /** The app is already installed or running from the home screen. */
  installed: boolean;
  online: boolean;
  /** iPhones have no install prompt, so we explain the manual steps. */
  iosHint: boolean;
};

export const usePwa = create<PwaState>(() => ({
  offlineReady: false,
  needRefresh: false,
  canInstall: false,
  installed: false,
  online: true,
  iosHint: false,
}));

export const isIos = (userAgent: string) => /iphone|ipad|ipod/i.test(userAgent);

/** True when the app runs from the home screen rather than in a browser tab. */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(display-mode: standalone)').matches === true || (navigator as { standalone?: boolean }).standalone === true;
}

const KEY_INSTALL = 'pp-install-dismissed';
const KEY_OFFLINE = 'pp-offline-ready-seen';

/** Remembered on the device. Safe when storage is blocked. */
export function remembered(key: string): boolean {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

export function remember(key: string): void {
  try {
    localStorage.setItem(key, '1');
  } catch {
    // Private mode or blocked storage: the message may show again, which is harmless.
  }
}

export const REMEMBER_KEYS = { install: KEY_INSTALL, offline: KEY_OFFLINE } as const;

/** Reads the starting facts from the browser. */
export function initPwaState(userAgent = typeof navigator === 'undefined' ? '' : navigator.userAgent): void {
  const installed = isStandalone();
  usePwa.setState({
    online: typeof navigator === 'undefined' ? true : navigator.onLine,
    installed,
    iosHint: !installed && isIos(userAgent) && !remembered(KEY_INSTALL),
  });
}

/** What the banner should show, most important first. `null` means nothing. */
export type BannerKind = 'update' | 'offlineReady' | 'offline' | 'install' | 'ios' | null;

export function bannerFor(s: PwaState, dismissed: { offlineReady: boolean; install: boolean }): BannerKind {
  if (s.needRefresh) return 'update';
  if (s.offlineReady && !dismissed.offlineReady) return 'offlineReady';
  if (!s.online) return 'offline';
  if (s.canInstall && !s.installed && !dismissed.install) return 'install';
  if (s.iosHint && !s.installed && !dismissed.install) return 'ios';
  return null;
}
