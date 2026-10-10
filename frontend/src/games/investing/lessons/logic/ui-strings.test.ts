import { describe, expect, it } from 'vitest';
import ui from '@/content/i18n/en/investui.json';

describe('room UI text', () => {
  it('never shows an example number in the answer box or the error message (it could be the answer)', () => {
    const texts = Object.entries(ui as Record<string, string>).filter(([k]) => k.startsWith('room.placeholder.') || k === 'room.invalid');
    expect(texts.length).toBeGreaterThanOrEqual(4);
    for (const [key, text] of texts) expect(text, key).not.toMatch(/\d/);
  });
});
