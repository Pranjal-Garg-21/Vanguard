import { beforeEach, describe, expect, it } from 'vitest';
import { createTestProfile, resetDb } from '@/test/fixtures';
import { switchPlayer, useActiveProfile } from '../profiles';
import { applyAccessibility, DEFAULT_ACCESSIBILITY, prefersReducedMotion, startAccessibility } from './index';

const html = () => document.documentElement.dataset;

beforeEach(async () => {
  await resetDb();
  applyAccessibility(DEFAULT_ACCESSIBILITY);
  useActiveProfile.setState({ profile: null, loaded: false });
});

describe('applying settings to the page', () => {
  it('sets the attributes the stylesheet reads', () => {
    applyAccessibility({ largeText: true, reduceMotion: false });
    expect(html()).toMatchObject({ largeText: 'true', reduceMotion: 'false' });
    applyAccessibility({ largeText: false, reduceMotion: true });
    expect(html()).toMatchObject({ largeText: 'false', reduceMotion: 'true' });
  });

  it('reports reduced motion when the student chose less movement', () => {
    expect(prefersReducedMotion()).toBe(false);
    applyAccessibility({ largeText: false, reduceMotion: true });
    expect(prefersReducedMotion()).toBe(true);
  });

  it('also respects the phone\'s own reduce-motion setting', () => {
    const original = window.matchMedia;
    window.matchMedia = ((query: string) => ({ matches: query.includes('prefers-reduced-motion'), media: query })) as unknown as typeof window.matchMedia;
    expect(prefersReducedMotion()).toBe(true);
    window.matchMedia = original;
  });
});

describe('following the signed-in player', () => {
  it('applies their settings, and clears them when they switch player', async () => {
    startAccessibility();
    await createTestProfile({ a11y: { audio: false, largeText: true, reduceMotion: true, timersOff: true } });
    expect(html()).toMatchObject({ largeText: 'true', reduceMotion: 'true' });
    expect(useActiveProfile.getState().profile?.a11y.timersOff).toBe(true);

    await switchPlayer();
    expect(html()).toMatchObject({ largeText: 'false', reduceMotion: 'false' });
  });
});
