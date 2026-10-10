/**
 * Does each mini-game actually render? Owner: P3.
 *
 * Typechecking cannot catch a missing string key, a content field that is not
 * where the component looks for it, or a crash on first paint — and those are
 * exactly what breaks when content and code move. This mounts every registered
 * game for real, in jsdom, through the same i18n the app uses.
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { MiniGameContext, MiniGameResult } from '@/core/types';
import { newLife } from '@/core/engine';
import { contextFromLife } from '../adapter';
import { everydayGames } from './registry';

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const ctx = (over: Partial<MiniGameContext> = {}): MiniGameContext => ({
  persona: {
    lifeStage: 'school_student',
    circumstance: 'dependent',
    moneyPersonality: 'saver',
    maturity: 'starter',
    age: 17,
  },
  level: 1,
  seed: 7,
  stateSlice: {},
  mode: 'arcade',
  ...over,
});

let host: HTMLDivElement;
let root: Root;

beforeEach(() => {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

const buttons = () => [...host.querySelectorAll('button')];
const click = (el: Element) => act(() => el.dispatchEvent(new MouseEvent('click', { bubbles: true })));
const byText = (text: string) => buttons().find((b) => b.textContent?.includes(text));

/**
 * `t()` returns the key itself when a string is missing, so an unresolved key
 * shows up in the DOM as "pb02.jar.needs" rather than "Needs". Matching the
 * namespaces we own keeps this precise: a plain dotted word would also catch
 * an ordinary sentence running into the next element's text.
 */
const NAMESPACES = [
  'pb01', 'pb02', 'pb03', 'bank01', 'bank02', 'br01', 'sm02', 'sm03',
  'safe10', 'verb', 'common', 'arcade', 'concepts', 'misconception', 'goal',
  'errors', 'story',
];
const RAW_KEY = new RegExp(`\\b(?:${NAMESPACES.join('|')})\\.[a-z0-9_.]+`, 'gi');

function rawKeysIn(text: string): string[] {
  return [...text.matchAll(RAW_KEY)].map((m) => m[0]);
}

describe('every mini-game renders', () => {
  for (const game of everydayGames) {
    it(`${game.id} paints without crashing`, () => {
      act(() => root.render(<game.Component ctx={ctx()} onComplete={() => {}} />));
      const text = host.textContent ?? '';
      expect(text.length, `${game.id} rendered nothing`).toBeGreaterThan(10);
      expect(rawKeysIn(text), `${game.id} shows unresolved keys`).toEqual([]);
      expect(buttons().length, `${game.id} has no way to continue`).toBeGreaterThan(0);
    });
  }

  it('renders every game at level 3 too', () => {
    for (const game of everydayGames) {
      act(() => root.render(<game.Component ctx={ctx({ level: 3 })} onComplete={() => {}} />));
      expect(host.textContent?.length, game.id).toBeGreaterThan(10);
    }
  });
});

describe('Document Hunt can actually be played', () => {
  it('runs from the room to a finished result', () => {
    let result: MiniGameResult | null = null;
    const game = everydayGames.find((g) => g.id === 'document-hunt')!;

    act(() => root.render(<game.Component ctx={ctx()} onComplete={(r) => (result = r)} />));

    // The prompt mentions the scholarship; the board is behind a Continue.
    expect(host.textContent).toContain('bank account in your name');

    // Pick up the Aadhaar card, then put it in the folder.
    const aadhaar = byText('Aadhaar');
    expect(aadhaar, 'the room should show the Aadhaar card').toBeTruthy();
    click(aadhaar!);
    const folder = byText('Bank folder');
    expect(folder, 'there should be a folder to put it in').toBeTruthy();
    click(folder!);

    // It belongs there, so it stays rather than bouncing back.
    expect(byText('Aadhaar')).toBeFalsy();

    click(byText('Check my folder')!);
    click(byText('Continue')!);

    expect(result, 'the game should have reported a result').not.toBeNull();
    expect(result!.conceptDeltas.kyc).toBeGreaterThan(0);
    expect(result!.summaryKey).toBe('bank01.summary');
  });

  it('bounces a document that is not yours, with a reason', () => {
    const game = everydayGames.find((g) => g.id === 'document-hunt')!;
    act(() => root.render(<game.Component ctx={ctx()} onComplete={() => {}} />));

    const sibling = byText("brother's ID");
    expect(sibling, "the room should show the brother's ID").toBeTruthy();
    click(sibling!);
    click(byText('Bank folder')!);

    // Still on the table, and the reason is spoken aloud.
    expect(byText("brother's ID")).toBeTruthy();
    expect(host.textContent).toContain('The bank needs yours');
  });
});

describe('opened from inside the Paisapur story', () => {
  // The story does not build a MiniGameContext by hand: it passes a real
  // LifeState through games/adapter. This is that path, short of mounting the
  // whole game screen — if the adapter ever stops producing something the
  // games can read, this fails rather than the player hitting a blank overlay.
  const lives = [
    { label: 'school student on an allowance', life: newLife(1) },
    { label: 'college student helping in the shop', life: { ...newLife(2), lifeStage: 'college' as const, source: 'shop' as const } },
    { label: 'later in the year, with savings', life: { ...newLife(3), month: 7, chapter: 4, cash: 900, pot: 2500 } },
  ];

  for (const { label, life } of lives) {
    it(`every game opens for a ${label}`, () => {
      const storyCtx = contextFromLife(life, { level: 1 });
      expect(storyCtx.mode).toBe('lifepath');
      for (const game of everydayGames) {
        act(() => root.render(<game.Component key={game.id} ctx={storyCtx} onComplete={() => {}} />));
        const text = host.textContent ?? '';
        expect(text.length, `${game.id} rendered nothing`).toBeGreaterThan(10);
        expect(rawKeysIn(text), `${game.id} shows unresolved keys`).toEqual([]);
      }
    });
  }

  it('asks a school-age character for a guardian ID, and an older one for PAN', () => {
    const hunt = everydayGames.find((g) => g.id === 'document-hunt')!;
    // Keyed, because mounting the same component twice otherwise keeps the
    // first deck — which is exactly why the real mounts are keyed too.
    const show = (ctxValue: MiniGameContext, key: string) =>
      act(() => root.render(<hunt.Component key={key} ctx={ctxValue} onComplete={() => {}} />));

    show(contextFromLife(newLife(1)), 'school');
    expect(host.textContent, 'under 18 opens a minor account').toContain("guardian's ID");
    expect(host.textContent).not.toContain('PAN card');

    const college = { ...newLife(1), lifeStage: 'college' as const };
    show(contextFromLife(college, { level: 2 }), 'college');
    expect(host.textContent, 'over 18 is asked for PAN').toContain('PAN card');
    expect(host.textContent, 'over 18 does not need a guardian').not.toContain("guardian's ID");
  });
});
