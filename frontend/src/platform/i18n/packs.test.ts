/**
 * Language packs are not in the app a student installs: the three translated
 * bundles are about 2.3 MB of JSON between them, and a student reads in one
 * language. These assertions are what stops that saving from quietly becoming
 * "Telugu never arrives".
 *
 * In its own file because the tests next door register strings by hand, which
 * would make a pack look as though it had already been downloaded.
 */
import { describe, expect, it } from 'vitest';
import { getLanguage, hasLanguage, loadedLanguages, loadLanguage, setLanguage, t } from './index';

describe('language packs', () => {
  it('ships English and nothing else', () => {
    expect(hasLanguage('en')).toBe(true);
    expect(loadedLanguages()).toEqual(['en']);
  });

  it('downloads a pack, then lets the app switch to it', async () => {
    expect(setLanguage('te')).toBe(false);

    expect(await loadLanguage('te')).toBe(true);
    expect(setLanguage('te')).toBe(true);
    expect(getLanguage()).toBe('te');
    // A real string from the pack, not the key and not the English.
    const translated = t('common.continue');
    expect(translated).not.toBe('common.continue');
    setLanguage('en');
  });

  it('asks for a pack once, however many screens want it', async () => {
    const first = loadLanguage('hi');
    const second = loadLanguage('hi');
    expect(first).toBe(second);
    await first;
    setLanguage('en');
  });

  it('is a no-op for English, which is already here', async () => {
    expect(await loadLanguage('en')).toBe(true);
  });
});
