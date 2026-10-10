import { describe, it, expect } from 'vitest';
import { fillTemplate, runCalcs, type Computed } from './calc';
import { EXPLORE_WIDGETS, VISUALS } from './explore';
import { glossary, glossaryById, knownConcepts, knownMisconceptions, rooms, strings } from './content';
import { checkNumberAnswer, expectedDisplay, roomPoints, roomQuestions } from './room';
import type { LessonBlock, Room } from './types';

const glossaryIds = new Set(glossaryById.keys());
const MAX_SENTENCE_WORDS = 22;
const MAX_DEFINITION_WORDS = 15;
const MAX_CARD_WORDS = 45; // one card = one idea, readable in about 20 seconds
const MAX_STEP_WORDS = 20;
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
    expect(rooms.length).toBeGreaterThan(0);
    expect(new Set(rooms.map((l) => l.id)).size).toBe(rooms.length);
    expect(new Set(rooms.map((l) => l.order)).size).toBe(rooms.length);
  });
});

// ---------------------------------------------------------------------------
// Rooms (TryHackMe-style)
// ---------------------------------------------------------------------------

/** Every string key a room uses, in reading order. */
function roomKeys(room: Room): string[] {
  const keys = [room.titleKey, room.blurbKey];
  for (const task of room.tasks) {
    keys.push(task.titleKey);
    for (const b of task.blocks) {
      if (b.textKey) keys.push(b.textKey);
      keys.push(...(b.stepKeys ?? []));
      if (b.explore) keys.push(b.explore.promptKey);
    }
    for (const q of task.questions) {
      keys.push(q.promptKey, q.explainKey);
      if (q.hintKey) keys.push(q.hintKey);
      for (const o of q.options ?? []) keys.push(o.textKey, ...(o.feedbackKey ? [o.feedbackKey] : []));
    }
  }
  return keys;
}

/**
 * True when `answer` appears in `text` as a whole number, not as part of a bigger one.
 * "12" is found in "12 years" but not in "₹12,400", "112" or "12%". Written amounts like "₹150" match as written.
 */
function appearsAsNumber(text: string, answer: string): boolean {
  const escaped = answer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const startsPlain = /^\d/.test(answer);
  const before = startsPlain ? '(?<![\\d,.₹-])' : '';
  const after = /%$/.test(answer) ? '(?![\\d,.])' : '(?![\\d%]|[,.]\\d)';
  return new RegExp(`${before}${escaped}${after}`).test(text);
}

/** The text a student reads in a task before answering (cards, steps, lab instruction). */
function teachingText(blocks: LessonBlock[], ctx: Record<string, Computed>): string {
  return blocks
    .flatMap((b) => [b.textKey, ...(b.stepKeys ?? []), b.explore?.promptKey])
    .filter((k): k is string => Boolean(k))
    .map((k) => fillTemplate(strings[k] ?? '', ctx))
    .join(' ');
}

describe.each(rooms.map((r) => [r.id, r] as const))('room %s', (_id, room) => {
  const ctx = () => runCalcs(room.vars, room.calcs);
  const questions = roomQuestions(room);

  it('has a sensible shape', () => {
    expect(room.kind).toBe('room');
    expect(room.pillar).toBe('invest');
    expect(['easy', 'medium', 'hard']).toContain(room.difficulty);
    expect(room.tasks.length).toBeGreaterThanOrEqual(4);
    expect(room.tasks.length).toBeLessThanOrEqual(8);
    expect(room.estMinutes).toBeLessThanOrEqual(15);
    expect(new Set(room.tasks.map((t) => t.id)).size).toBe(room.tasks.length);
    expect(roomPoints(room)).toBeGreaterThanOrEqual(100);
    expect(roomPoints(room)).toBeLessThanOrEqual(200);
  });

  it('uses only known concept and misconception ids', () => {
    for (const c of room.concepts) expect(knownConcepts.has(c), `unknown concept ${c}`).toBe(true);
    for (const m of room.misconceptions) expect(knownMisconceptions.has(m), `unknown misconception ${m}`).toBe(true);
    for (const q of questions) expect(knownConcepts.has(q.concept), `${q.id}: unknown concept ${q.concept}`).toBe(true);
    for (const t of room.tasks) for (const b of t.blocks) for (const m of b.misconceptions ?? []) expect(room.misconceptions).toContain(m);
  });

  it('every task teaches something and asks something', () => {
    for (const t of room.tasks) {
      expect(t.blocks.length, `${t.id} has no teaching`).toBeGreaterThan(0);
      expect(t.questions.length, `${t.id} has no questions`).toBeGreaterThan(0);
    }
    expect(new Set(questions.map((q) => q.id)).size, 'question ids must be unique').toBe(questions.length);
    expect(questions.some((q) => q.kind === 'number')).toBe(true);
    expect(questions.some((q) => q.kind === 'choice')).toBe(true);
  });

  it('every string exists, fills in, and is short enough to read', () => {
    const c = ctx();
    for (const key of roomKeys(room)) render(key, c, `${room.id} ${key}`);
    for (const t of room.tasks) {
      for (const b of t.blocks) {
        if (b.textKey && b.type !== 'formula') {
          expect(words(fillTemplate(strings[b.textKey]!, c)), `${t.id}: card too long`).toBeLessThanOrEqual(MAX_CARD_WORDS);
        }
        if (b.type === 'steps') {
          expect(b.stepKeys!.length).toBeGreaterThanOrEqual(2);
          for (const k of b.stepKeys!) expect(words(fillTemplate(strings[k]!, c)), `${t.id}: step too long`).toBeLessThanOrEqual(MAX_STEP_WORDS);
        }
      }
    }
  });

  it('is hands-on: has an explore lab, known widgets, and a picture for every analogy', () => {
    const c = ctx();
    const blocks = room.tasks.flatMap((t) => t.blocks);
    const explores = blocks.filter((b) => b.type === 'explore');
    expect(explores.length, 'a room needs at least one explore lab').toBeGreaterThan(0);
    for (const b of explores) {
      expect((EXPLORE_WIDGETS as readonly string[]).includes(b.explore!.widget), `unknown widget ${b.explore!.widget}`).toBe(true);
      for (const [name, ref] of Object.entries(b.explore!.params)) {
        expect(ref.startsWith('$') && c[ref.slice(1)], `explore param ${name} -> ${ref} does not resolve`).toBeTruthy();
      }
    }
    for (const b of blocks) {
      if (b.type === 'analogy') expect(b.visual, 'analogy needs a visual').toBeTruthy();
      if (b.visual) expect((VISUALS as readonly string[]).includes(b.visual), `unknown visual ${b.visual}`).toBe(true);
    }
  });

  it('number questions: answer exists, hint exists, and the checker accepts the right answer in several formats', () => {
    const c = ctx();
    for (const q of questions.filter((x) => x.kind === 'number')) {
      expect(q.answer && c[q.answer], `${q.id}: answer calc ${q.answer} does not exist`).toBeTruthy();
      expect(['rupees', 'percent', 'number']).toContain(q.unit);
      expect(q.hintKey, `${q.id}: number questions need a hint`).toBeTruthy();
      const raw = c[q.answer!]!.raw;
      const shown = expectedDisplay(raw, q.unit);
      const rounded = String(Math.round(shown * 100) / 100);
      expect(checkNumberAnswer(rounded, raw, q.unit, q.tolerance), `${q.id}: "${rounded}" should be accepted`).toBe('correct');
      expect(checkNumberAnswer(String(shown + 7), raw, q.unit, q.tolerance), `${q.id}: a wrong number should be rejected`).toBe('wrong');
    }
  });

  it('choice questions: 3 or 4 options, one right answer, named traps carry specific feedback', () => {
    const c = ctx();
    for (const q of questions.filter((x) => x.kind === 'choice')) {
      const opts = q.options ?? [];
      expect(opts.length, `${q.id}: needs 3 or 4 options`).toBeGreaterThanOrEqual(3);
      expect(opts.length).toBeLessThanOrEqual(4);
      expect(opts.map((o) => o.id)).toContain(q.correct);
      const texts = opts.map((o) => fillTemplate(strings[o.textKey]!, c));
      expect(new Set(texts).size, `${q.id}: two options read the same`).toBe(texts.length);
      for (const o of opts) {
        if (o.misconception) {
          expect(o.feedbackKey, `${q.id}/${o.id}: a misconception option needs feedbackKey`).toBeTruthy();
          expect(o.id).not.toBe(q.correct);
          expect(knownMisconceptions.has(o.misconception), `unknown misconception ${o.misconception}`).toBe(true);
        }
      }
    }
  });

  it('never gives away an answer in the reading that comes before it', () => {
    const c = ctx();
    room.tasks.forEach((task, i) => {
      const reading = teachingText(room.tasks.slice(0, i + 1).flatMap((t) => t.blocks), c);
      for (const q of task.questions.filter((x) => x.kind === 'number')) {
        const answerText = c[q.answer!]!.text;
        expect(
          appearsAsNumber(reading, answerText),
          `${q.id}: the answer "${answerText}" appears in the reading at or before ${task.id}`,
        ).toBe(false);
      }
    });
  });

  it('its glossary terms exist', () => {
    for (const g of room.glossary) expect(glossaryIds.has(g), `unknown glossary term ${g}`).toBe(true);
    for (const t of room.tasks) for (const b of t.blocks) for (const term of b.terms ?? []) expect(glossaryIds.has(term), `unknown term ${term}`).toBe(true);
  });
});

describe('glossary', () => {
  it('has unique ids and short, plain definitions', () => {
    expect(glossaryIds.size).toBe(glossary.length);
    for (const g of glossary) {
      str(g.termKey, g.id);
      const def = str(g.defKey, g.id);
      expect(words(def), `definition of ${g.id} too long`).toBeLessThanOrEqual(MAX_DEFINITION_WORDS);
      expect(rooms.some((l) => l.id === g.lesson), `glossary ${g.id} points to unknown lesson ${g.lesson}`).toBe(true);
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
    for (const r of rooms) roomKeys(r).forEach((k) => used.add(k));
    const orphans = Object.keys(strings).filter((k) => !used.has(k));
    expect(orphans).toEqual([]);
  });
});

describe('appearsAsNumber (the spoiler checker)', () => {
  it('finds a whole number and a written amount', () => {
    expect(appearsAsNumber('doubles in 12 years', '12')).toBe(true);
    expect(appearsAsNumber('profit is ₹150 here', '₹150')).toBe(true);
    expect(appearsAsNumber('a return of 60%', '60%')).toBe(true);
    expect(appearsAsNumber('a loss of -₹50', '-₹50')).toBe(true);
  });
  it('does not mistake a number for part of a bigger one', () => {
    expect(appearsAsNumber('total ₹12,400', '12')).toBe(false);
    expect(appearsAsNumber('it is 112 days', '12')).toBe(false);
    expect(appearsAsNumber('a rate of 8%', '8')).toBe(false);
    expect(appearsAsNumber('about 12.5 years', '12')).toBe(false);
    expect(appearsAsNumber('₹1,50,000', '₹150')).toBe(false);
    expect(appearsAsNumber('a return of 160%', '60%')).toBe(false);
  });
});
