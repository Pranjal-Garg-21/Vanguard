import { beforeEach, describe, expect, it } from 'vitest';
import { bannerFor, initPwaState, isIos, remember, remembered, REMEMBER_KEYS, usePwa, type PwaState } from './state';

const base: PwaState = { offlineReady: false, needRefresh: false, canInstall: false, installed: false, online: true, iosHint: false };
const none = { offlineReady: false, install: false };

beforeEach(() => {
  localStorage.clear();
  usePwa.setState(base);
});

describe('which banner to show', () => {
  it('shows nothing when everything is normal', () => expect(bannerFor(base, none)).toBeNull());

  it('puts an update first, then the one-time offline-ready message, then offline, then install', () => {
    const all: PwaState = { ...base, needRefresh: true, offlineReady: true, online: false, canInstall: true };
    expect(bannerFor(all, none)).toBe('update');
    expect(bannerFor({ ...all, needRefresh: false }, none)).toBe('offlineReady');
    expect(bannerFor({ ...all, needRefresh: false, offlineReady: false }, none)).toBe('offline');
    expect(bannerFor({ ...all, needRefresh: false, offlineReady: false, online: true }, none)).toBe('install');
  });

  it('does not show messages the student has dismissed', () => {
    expect(bannerFor({ ...base, offlineReady: true }, { offlineReady: true, install: false })).toBeNull();
    expect(bannerFor({ ...base, canInstall: true }, { offlineReady: false, install: true })).toBeNull();
  });

  it('never offers to install an app that is already installed', () => {
    expect(bannerFor({ ...base, canInstall: true, installed: true }, none)).toBeNull();
    expect(bannerFor({ ...base, iosHint: true, installed: true }, none)).toBeNull();
  });

  it('explains the manual steps on an iPhone', () => expect(bannerFor({ ...base, iosHint: true }, none)).toBe('ios'));
});

describe('starting state', () => {
  it('recognises an iPhone', () => {
    expect(isIos('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)')).toBe(true);
    expect(isIos('Mozilla/5.0 (Linux; Android 14)')).toBe(false);
  });

  it('shows the iPhone hint only until it is dismissed', () => {
    initPwaState('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)');
    expect(usePwa.getState().iosHint).toBe(true);
    remember(REMEMBER_KEYS.install);
    initPwaState('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)');
    expect(usePwa.getState().iosHint).toBe(false);
  });

  it('remembers choices on the device', () => {
    expect(remembered('x')).toBe(false);
    remember('x');
    expect(remembered('x')).toBe(true);
  });
});
