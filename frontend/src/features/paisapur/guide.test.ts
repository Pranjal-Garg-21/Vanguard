import { describe, expect, it } from 'vitest';
import objectives from '@/content/i18n/en/objective.json';
import paisapur from '@/content/i18n/en/paisapur.json';

describe('the Help screen guide', () => {
  it('has where-to-go and steps for every objective the story can set', () => {
    const guide = paisapur.guide as Record<string, Record<string, string>>;
    for (const id of Object.keys(objectives)) {
      const g = guide[id];
      expect(g, `guide for objective.${id}`).toBeDefined();
      expect(g!.where).toBeTruthy();
      for (let i = 1; i <= Number(g!.n); i++) expect(g![`step${i}`], `${id} step${i}`).toBeTruthy();
    }
  });
});
