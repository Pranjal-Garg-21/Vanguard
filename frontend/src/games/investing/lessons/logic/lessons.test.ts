import { describe, it, expect } from 'vitest';
import { fillTemplate, runCalcs, type Computed } from './calc';
import { EXPLORE_WIDGETS, VISUALS } from './explore';
import { checkById, checks, glossary, glossaryById, knownConcepts, knownMisconceptions, lessons, strings } from './content';

const glossaryIds = new Set(glossaryById.keys());
const MAX_SENTENCE_WORDS = 22;
const MAX_DEFINITION_WORDS = 15;
const MAX_CARD_WORDS = 45; // one card = one idea, readable in about 20 seconds
const MAX_STEP_WORDS = 20;
const NEEDS_TEXT = ['hook', 'define', 'analogy', 'note', 'worked', 'tradeoff', 'misconception', 'formula'];
const used = new Set<string>();

function str(key: string | undefined, where: string): string {
  if (!key) throw new Error(`Missing key in ${where}`);
  used.add(key);
  const s = strings[key];
  if (s === undefined) throw new Error(`String key not found: "${key}" (${where})`);
  return s;
}

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
const sentences = (s: string) => s.replace(/\*\*/g, '').split(/(?<=[.!?])\s+/).filter(Boolean);

function expectReadable(text: string, where: string) {
  for (const sentence of sentences(text)) {
    expect(words(sentence), `${where}: sentence too long: "${sentence}"`).toBeLessThanOrEqual(MAX_SENTENCE_WORDS);
  }
}

function render(key: string, ctx: Record<string, Computed>, where: string): string {
  const out = fillTemplate(str(key, where), ctx);
  expect(out, `${where}: unresolved braces`).not.toMatch(/[{}]/);
  expectReadable(out, where);
  return out;
}

describe('lessons exist', () => {
  it('has at least one lesson, with unique ids and order', () => {
    expect(lessons.length).toBeGreaterThan(0);
    expect(new Set(lessons.map((l) => l.id)).size).toBe(lessons.length);
    expect(new Set(lessons.map((l) => l.order)).size).toBe(lessons.length);
  });
});

describe.each(lessons.map((l) => [l.id, l] as const))('lesson %s', (_id, lesson) => {
  const ctx = () => runCalcs(lesson.vars, lesson.calcs);
  const has = (t: string) => lesson.blocks.some((b) => b.type === t);

  it('has the required parts', () => {
    expect(lesson.kind).toBe('lesson');
    expect(lesson.pillar).toBe('invest');
    for (const t of ['hook', 'define', 'analogy', 'predict', 'tradeoff', 'misconception', 'jargon']) {
      expect(has(t), `missing ${t} block`).toBe(true);
    }
    expect(lesson.estMinutes).toBeLessThanOrEqual(5);
  });

  it('uses only known concept and misconception ids', () => {
    expect(lesson.concepts.length).toBeGreaterThan(0);
    for (const c of lesson.concepts) expect(knownConcepts.has(c), `unknown concept ${c}`).toBe(true);
    for (const m of lesson.misconceptions) expect(knownMisconceptions.has(m), `unknown misconception ${m}`).toBe(true);
    for (const b of lesson.blocks) {
      for (const m of b.misconceptions ?? []) expect(lesson.misconceptions).toContain(m);
    }
  });

  it('every number computes, and every text key exists and renders cleanly', () => {
    const c = ctx();
    render(lesson.titleKey, c, `${lesson.id} title`);
    render(lesson.blurbKey, c, `${lesson.id} blurb`);
    for (const [i, b] of lesson.blocks.entries()) {
      const where = `${lesson.id} block ${i} (${b.type})`;
      if (b.textKey) {
        const text = render(b.textKey, c, where);
        if (b.type !== 'formula') {
          expect(words(text), `${where}: card too long (max ${MAX_CARD_WORDS} words)`).toBeLessThanOrEqual(MAX_CARD_WORDS);
        }
      }
      if (b.type === 'steps') {
        expect(b.stepKeys && b.stepKeys.length >= 2 && b.stepKeys.length <= 6, `${where}: steps needs 2 to 6 lines`).toBe(true);
        for (const k of b.stepKeys ?? []) {
          expect(words(render(k, c, where)), `${where}: step too long`).toBeLessThanOrEqual(MAX_STEP_WORDS);
        }
      }
      if (b.type === 'explore') render(b.explore!.promptKey, c, where);
      if (b.predict) {
        render(b.predict.questionKey, c, where);
        render(b.predict.reveal.explainKey, c, where);
        if (b.predict.input.kind === 'options') {
          for (const o of b.predict.input.options) render(o.textKey, c, where);
          expect(b.predict.input.options.map((o) => o.id)).toContain(b.predict.input.correct);
        }
      }
      if (NEEDS_TEXT.includes(b.type)) expect(b.textKey, `${where} needs textKey`).toBeTruthy();
    }
  });

  it('predict reveals sit inside an honest range and inside the slider', () => {
    const c = ctx();
    for (const b of lesson.blocks) {
      const p = b.predict;
      if (!p || p.input.kind !== 'slider') continue;
      expect(p.reveal.actual && p.reveal.rangeLow && p.reveal.rangeHigh, 'slider predicts need actual + range').toBeTruthy();
      const actual = c[p.reveal.actual!]!.raw;
      const lo = c[p.reveal.rangeLow!]!.raw;
      const hi = c[p.reveal.rangeHigh!]!.raw;
      expect(lo).toBeLessThanOrEqual(actual);
      expect(actual).toBeLessThanOrEqual(hi);
      expect(actual).toBeGreaterThanOrEqual(p.input.min);
      expect(actual).toBeLessThanOrEqual(p.input.max);
    }
  });

  it('has levels in order: formulas only at L3, worked numbers at L2 or higher', () => {
    for (const b of lesson.blocks) {
      if (b.type === 'formula') expect(b.minLevel).toBe(3);
      if (b.type === 'worked' || b.type === 'steps') expect(b.minLevel).toBeGreaterThanOrEqual(2);
    }
  });

  it('is interactive: has something to do, not only to read', () => {
    const c = ctx();
    const explores = lesson.blocks.filter((b) => b.type === 'explore');
    expect(explores.length, 'needs at least one explore block').toBeGreaterThan(0);
    for (const b of explores) {
      expect((EXPLORE_WIDGETS as readonly string[]).includes(b.explore!.widget), `unknown widget ${b.explore!.widget}`).toBe(true);
      for (const [name, ref] of Object.entries(b.explore!.params)) {
        expect(ref.startsWith('$') && c[ref.slice(1)], `explore param ${name} -> ${ref} does not resolve`).toBeTruthy();
      }
    }
  });

  it('has a picture for every analogy, and only known pictures', () => {
    for (const b of lesson.blocks) {
      if (b.type === 'analogy') expect(b.visual, 'analogy needs a visual').toBeTruthy();
      if (b.visual) expect((VISUALS as readonly string[]).includes(b.visual), `unknown visual ${b.visual}`).toBe(true);
    }
  });

  it('its glossary terms and check items exist', () => {
    for (const g of lesson.glossary) expect(glossaryIds.has(g), `unknown glossary term ${g}`).toBe(true);
    for (const b of lesson.blocks) for (const t of b.terms ?? []) expect(glossaryIds.has(t), `unknown term ${t}`).toBe(true);
    for (const id of lesson.check) {
      const item = checkById.get(id);
      expect(item, `unknown check ${id}`).toBeTruthy();
      expect(item!.lesson).toBe(lesson.id);
    }
  });

  it('has enough good check items', () => {
    const items = lesson.check.map((id) => checkById.get(id)!);
    expect(items.length).toBeGreaterThanOrEqual(3);
    expect(items.some((i) => i.level >= 2 && (i.calcs ?? []).some((c) => c.id === 'answer')), 'needs a calculation item').toBe(true);
    expect(items.some((i) => i.options.some((o) => o.misconception)), 'needs a misconception distractor').toBe(true);
  });
});

describe.each(checks.map((c) => [c.id, c] as const))('check item %s', (_id, item) => {
  it('is well formed', () => {
    expect(item.options.length).toBeGreaterThanOrEqual(3);
    expect(item.options.length).toBeLessThanOrEqual(4);
    expect(new Set(item.options.map((o) => o.id)).size).toBe(item.options.length);
    expect(item.options.map((o) => o.id)).toContain(item.correct);
    expect(knownConcepts.has(item.concept), `unknown concept ${item.concept}`).toBe(true);
    for (const o of item.options) {
      if (o.misconception) {
        expect(o.feedbackKey, `option ${o.id} tests a misconception, so it needs feedbackKey`).toBeTruthy();
        expect(o.id).not.toBe(item.correct);
        expect(knownMisconceptions.has(o.misconception), `unknown misconception ${o.misconception}`).toBe(true);
      }
    }
  });

  it('renders cleanly and the right answer is never equal to a wrong one', () => {
    const c = runCalcs(item.vars, item.calcs);
    render(item.stemKey, c, `${item.id} stem`);
    const why = render(item.whyKey, c, `${item.id} why`);
    expect(sentences(why).length, 'why should be at most 3 sentences').toBeLessThanOrEqual(3);
    for (const o of item.options) {
      if (o.feedbackKey) {
        const fb = render(o.feedbackKey, c, `${item.id} feedback ${o.id}`);
        expect(sentences(fb).length, 'feedback should be short').toBeLessThanOrEqual(2);
      }
    }
    const rendered = new Map(item.options.map((o) => [o.id, render(o.textKey, c, `${item.id} option ${o.id}`)]));
    const right = rendered.get(item.correct)!;
    for (const [id, text] of rendered) if (id !== item.correct) expect(text, `option ${id} duplicates the right answer`).not.toBe(right);
    if ((item.calcs ?? []).some((x) => x.id === 'answer')) {
      expect(strings[item.options.find((o) => o.id === item.correct)!.textKey]).toContain('{answer}');
    }
  });
});

describe('glossary', () => {
  it('has unique ids and short, plain definitions', () => {
    expect(glossaryIds.size).toBe(glossary.length);
    for (const g of glossary) {
      str(g.termKey, g.id);
      const def = str(g.defKey, g.id);
      expect(words(def), `definition of ${g.id} too long`).toBeLessThanOrEqual(MAX_DEFINITION_WORDS);
      expect(lessons.some((l) => l.id === g.lesson), `glossary ${g.id} points to unknown lesson ${g.lesson}`).toBe(true);
    }
  });
});

describe('strings hygiene', () => {
  it('has no unused keys', () => {
    // make sure everything reachable has been "used" by the checks above
    for (const g of glossary) {
      used.add(g.termKey);
      used.add(g.defKey);
    }
    for (const l of lessons) {
      const c = runCalcs(l.vars, l.calcs);
      used.add(l.titleKey);
      used.add(l.blurbKey);
      for (const b of l.blocks) {
        if (b.textKey) render(b.textKey, c, 'hygiene');
        b.stepKeys?.forEach((k) => used.add(k));
        if (b.explore) used.add(b.explore.promptKey);
        if (b.predict) {
          used.add(b.predict.questionKey);
          used.add(b.predict.reveal.explainKey);
          if (b.predict.input.kind === 'options') b.predict.input.options.forEach((o) => used.add(o.textKey));
        }
      }
    }
    for (const c of checks) {
      used.add(c.stemKey);
      used.add(c.whyKey);
      c.options.forEach((o) => {
        used.add(o.textKey);
        if (o.feedbackKey) used.add(o.feedbackKey);
      });
    }
    const orphans = Object.keys(strings).filter((k) => !used.has(k));
    expect(orphans).toEqual([]);
  });
});
