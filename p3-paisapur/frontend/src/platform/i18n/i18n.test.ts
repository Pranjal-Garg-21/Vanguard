import { afterEach, describe, expect, it } from 'vitest';

import {
  formatRupees,
  getLanguage,
  registerStrings,
  setLanguage,
  setMissingKeyHandler,
  t,
  isRtl,
} from './index';

afterEach(() => {
  setLanguage('en');
  setMissingKeyHandler(() => {});
});

describe('money formatting', () => {
  it('groups in lakhs, the way an Indian price tag does', () => {
    expect(formatRupees(125000)).toBe('₹1,25,000');
    expect(formatRupees(5280)).toBe('₹5,280');
    expect(formatRupees(800)).toBe('₹800');
  });

  it('keeps Indian grouping after switching to Urdu', () => {
    // ur-IN groups in thousands and would render ₹125,000, so the numeric
    // locale is pinned. This is the regression that guards that decision.
    registerStrings('ur', { 'common.continue': 'جاری رکھیں' });
    setLanguage('ur');
    expect(formatRupees(125000)).toBe('₹1,25,000');
    expect(isRtl('ur')).toBe(true);
  });
});

describe('t()', () => {
  it('still resolves the strings the setup screens already use', () => {
    // P5 wrote these before the real loader existed; replacing the stub must
    // not break them, including single-brace {placeholders}.
    expect(t('setup.welcome.title')).toBe('MoneyPath');
    expect(t('setup.steps.progress', { current: 2, total: 5 })).toBe('Step 2 of 5');
  });

  it('formats ₹ amounts inside a string', () => {
    expect(t('verb.allocate.remaining', { amount: 3500 })).toContain('₹3,500');
  });

  it('picks the right plural', () => {
    expect(t('verb.commit.n_months', { count: 1 })).toBe('1 month');
    expect(t('verb.commit.n_months', { count: 7 })).toBe('7 months');
  });

  it('shows the key itself when a string is missing, never a blank', () => {
    const missing: string[] = [];
    setMissingKeyHandler((key) => missing.push(key));
    expect(t('nope.not.here')).toBe('nope.not.here');
    expect(missing).toContain('nope.not.here');
  });

  it('leaves an unknown placeholder visible rather than blanking it', () => {
    registerStrings('en', { 'test.greet': 'Hello {name}' });
    expect(t('test.greet')).toBe('Hello {name}');
    expect(t('test.greet', { name: 'Sana' })).toBe('Hello Sana');
  });
});

describe('switching language', () => {
  it('falls back to English for a key the pack is missing', () => {
    registerStrings('te', { 'common.continue': 'కొనసాగించు' });
    setLanguage('te');
    expect(t('common.continue')).toBe('కొనసాగించు');
    // Not translated yet, so English shows rather than a raw key.
    expect(t('verb.rank.check_order')).toBe('Check my order');
  });

  it('refuses to switch to a pack that is not on the device', () => {
    // UC-PLAT-04: keep the current language and download at the next
    // connection, rather than showing a screen of raw key names.
    expect(setLanguage('hi')).toBe(false);
    expect(getLanguage()).toBe('en');
  });
});
