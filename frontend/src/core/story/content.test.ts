/**
 * Content checks: every key, ID and reference in the Paisapur story, maps,
 * concepts and quiz bank must point at something real. A typo in a JSON file
 * fails here instead of showing a raw key in the game.
 */
import { describe, expect, it } from 'vitest';
import { newLife, type Action } from '@/core/engine';
import { buildingAt, LEGEND, tileAt, type MapDef } from '@/core/world';
import { PAISAPUR } from '@/core/world/paisapur';
import { AUTOS, BADGES, CONCEPTS, MISCONCEPTIONS, PANELS, QUIZ, SCRIPTS } from './content';
import { DUELS } from './duel';
import { evalCond, walkSteps, type Step } from './index';

type Bundle = { [key: string]: string | Bundle };
const bundles = import.meta.glob<Bundle>('../../content/i18n/en/*.json', { eager: true, import: 'default' });
const strings = new Set<string>();
function flatten(prefix: string, b: Bundle) {
  for (const [k, v] of Object.entries(b)) {
    if (typeof v === 'string') strings.add(`${prefix}.${k}`);
    else flatten(`${prefix}.${k}`, v);
  }
}
for (const [file, b] of Object.entries(bundles)) flatten(file.split('/').pop()!.replace('.json', ''), b);

const conceptIds = new Set(CONCEPTS.map((c) => c.id));
const quizIds = new Set(QUIZ.map((q) => q.id));
const state = newLife(1);
const parses = (cond: string) => () => evalCond(cond, state);
const ACTIONS: Action['type'][] = [
  'setup', 'work', 'shock', 'setSip', 'gain', 'spend', 'openAccount', 'enableUpi', 'deposit', 'withdraw',
  'setAutoSave', 'buy', 'openDeposit', 'takeLoan', 'repayLoan', 'buyAsset', 'sellAsset', 'buyBond',
  'buyInsurance', 'scamLoss', 'meter', 'flag', 'badge', 'chapter', 'objective', 'seeConcept', 'learn', 'advanceMonth',
  'buyGoal', 'toPot', 'adjustIncome',
];

describe('story scripts', () => {
  const problems: string[] = [];
  const key = (where: string, k: string) => {
    if (!strings.has(k)) problems.push(`${where}: missing string ${k}`);
  };

  for (const [id, steps] of Object.entries(SCRIPTS)) {
    walkSteps(steps, (s: Step) => {
      const where = `script ${id}`;
      if ('say' in s) key(where, s.say);
      if ('who' in s && s.who) key(where, `who.${s.who}`);
      if ('choice' in s) {
        if (s.prompt) key(where, s.prompt);
        for (const o of s.choice) {
          key(where, o.label);
          if (o.when) expect(parses(o.when), `${where} ${o.when}`).not.toThrow();
          if (o.log && !conceptIds.has(o.log.concept)) problems.push(`${where}: unknown concept ${o.log.concept}`);
          if (o.log?.misconception && !MISCONCEPTIONS.includes(o.log.misconception)) problems.push(`${where}: unknown misconception ${o.log.misconception}`);
        }
      }
      if ('if' in s) expect(parses(s.if), `${where} ${s.if}`).not.toThrow();
      if ('objective' in s) key(where, s.objective);
      if ('toast' in s) key(where, s.toast);
      if ('concept' in s && !conceptIds.has(s.concept)) problems.push(`${where}: unknown concept ${s.concept}`);
      if ('quiz' in s) for (const q of s.quiz) if (!quizIds.has(q)) problems.push(`${where}: unknown quiz ${q}`);
      if ('open' in s && !(PANELS as readonly string[]).includes(s.open)) problems.push(`${where}: unknown panel ${s.open}`);
      if ('call' in s && !SCRIPTS[s.call]) problems.push(`${where}: unknown script ${s.call}`);
      if ('badge' in s && !(BADGES as readonly string[]).includes(s.badge)) problems.push(`${where}: unknown badge ${s.badge}`);
      if ('do' in s && !('once' in s) && !ACTIONS.includes(s.do.type)) problems.push(`${where}: unknown action ${s.do.type}`);
      if ('duel' in s && !DUELS.some((d) => d.id === s.duel)) problems.push(`${where}: unknown duel ${s.duel}`);
      if ('checkpoint' in s) key(where, s.checkpoint);
    });
  }

  it('reference only real strings, concepts, quizzes, panels and scripts', () => {
    expect(problems).toEqual([]);
  });

  it('have auto scripts that exist, with valid conditions', () => {
    for (const a of AUTOS) {
      expect(SCRIPTS[a.script], a.script).toBeDefined();
      expect(parses(a.when)).not.toThrow();
      if (a.map) expect(PAISAPUR.maps[a.map], a.map).toBeDefined();
    }
  });
});

describe('scam duels', () => {
  it('have every line, option, tactic name and tell, and exactly one counter per round', () => {
    for (const d of DUELS) {
      expect(conceptIds.has(d.concept), d.id).toBe(true);
      expect(strings.has(`duel.foe.${d.foe}`), d.foe).toBe(true);
      for (const r of d.rounds) {
        expect(r.options.filter((o) => o.effect === 'counter').length, `${d.id}.${r.tactic}`).toBe(1);
        for (const k of [`duel.${d.id}.${r.tactic}.line`, `duel.tactic.${r.tactic}`, `duel.tell.${r.tactic}`, ...r.options.map((o) => `duel.${d.id}.${r.tactic}.${o.id}`)]) {
          expect(strings.has(k), k).toBe(true);
        }
      }
    }
  });
});

describe('concepts and quiz', () => {
  it('every concept has a title, body and example', () => {
    for (const c of CONCEPTS) {
      for (const part of ['title', 'body', 'example']) expect(strings.has(`concepts.${c.id}.${part}`), `${c.id}.${part}`).toBe(true);
    }
  });

  it('every quiz question has text, options, an answer and a why', () => {
    for (const q of QUIZ) {
      expect(conceptIds.has(q.concept), q.id).toBe(true);
      expect(q.options).toContain(q.answer);
      for (const part of ['q', 'why', ...q.options]) expect(strings.has(`quiz.${q.id}.${part}`), `${q.id}.${part}`).toBe(true);
      for (const m of Object.values(q.misconceptions ?? {})) expect(MISCONCEPTIONS).toContain(m);
    }
  });

  it('every concept is taught somewhere in the story', () => {
    const taught = new Set<string>();
    for (const steps of Object.values(SCRIPTS)) walkSteps(steps, (s) => 'concept' in s && taught.add(s.concept));
    expect(CONCEPTS.filter((c) => !taught.has(c.id)).map((c) => c.id)).toEqual([]);
  });
});

describe('maps', () => {
  const walkable = (m: MapDef, x: number, y: number) => {
    const t = tileAt(PAISAPUR, m, x, y);
    return !!t && !t.solid && !buildingAt(PAISAPUR, m, x, y);
  };

  for (const m of Object.values(PAISAPUR.maps)) {
    it(`${m.id} is valid`, () => {
      expect(new Set(m.rows.map((r) => r.length)).size).toBe(1);
      for (const r of m.rows) for (const ch of r) expect(LEGEND.tiles[ch], `${m.id} tile "${ch}"`).toBeDefined();
      expect(strings.has(m.name), m.name).toBe(true);
      for (const b of m.buildings ?? []) {
        expect(LEGEND.stamps[b.stamp], b.stamp).toBeDefined();
        if (b.to) expect(PAISAPUR.maps[b.to], b.to).toBeDefined();
        if (b.closed) expect(strings.has(b.closed), b.closed).toBe(true);
        if (b.when) expect(parses(b.when)).not.toThrow();
      }
      for (const w of m.warps ?? []) {
        const to = PAISAPUR.maps[w.to]!;
        expect(to, w.to).toBeDefined();
        expect(walkable(to, w.tx, w.ty), `${m.id} warp → ${w.to} ${w.tx},${w.ty}`).toBe(true);
      }
      for (const n of m.npcs ?? []) {
        expect(SCRIPTS[n.script], `${m.id} npc ${n.id} script ${n.script}`).toBeDefined();
        expect(LEGEND.sprites[n.sprite], n.sprite).toBeDefined();
        expect(walkable(m, n.x, n.y) || tileAt(PAISAPUR, m, n.x, n.y)?.layers.length, `${n.id} position`).toBeTruthy();
        if (n.when) expect(parses(n.when)).not.toThrow();
      }
      for (const s of m.signs ?? []) expect(strings.has(s.text!), s.text).toBe(true);
      for (const o of m.objects ?? []) expect(SCRIPTS[o.script!], `${m.id} object ${o.script}`).toBeDefined();
      for (const b of m.blockers ?? []) if (b.text) expect(strings.has(b.text), b.text).toBe(true);
      if (m.entry) expect(walkable(m, m.entry.x, m.entry.y), `${m.id} entry`).toBe(true);
      if (m.interior) expect(PAISAPUR.exits[m.id], `${m.id} has a door outside`).toBeDefined();
    });
  }

  it('interior exits lead to walkable tiles', () => {
    for (const [id, pos] of Object.entries(PAISAPUR.exits)) {
      expect(walkable(PAISAPUR.maps[pos.map]!, pos.x, pos.y), `exit of ${id}`).toBe(true);
    }
  });
});
