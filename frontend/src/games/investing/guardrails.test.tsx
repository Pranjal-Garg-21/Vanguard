/**
 * Guardrail tests for the whole investing section (the plan's snapshot rules):
 *  1. Every investing route shows the simulation banner, before and after it has loaded.
 *  2. Every investing route in the router is covered by this test (so a new route cannot skip rule 1).
 *  3. Projected amounts are only shown through RangeDisplay or FanChart, never as a lone number.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { act, type ReactElement } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';
import { InvestOrScam } from './invest-or-scam';
import { LessonList, LessonPlayer } from './lessons';
import { MutualFund } from './mutual-fund';
import { StockMarket } from './stock-market';
import { TimeMachine } from './time-machine';
import { t } from '@/platform';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const ROUTES: { path: string; pattern: string; element: ReactElement }[] = [
  { path: '/learn/invest', pattern: '/learn/invest', element: <LessonList /> },
  { path: '/learn/invest/time-machine', pattern: '/learn/invest/time-machine', element: <TimeMachine /> },
  { path: '/learn/invest/stock-market', pattern: '/learn/invest/stock-market', element: <StockMarket /> },
  { path: '/learn/invest/mutual-fund', pattern: '/learn/invest/mutual-fund', element: <MutualFund /> },
  { path: '/learn/invest/invest-or-scam', pattern: '/learn/invest/invest-or-scam', element: <InvestOrScam /> },
  { path: '/learn/invest/lesson_risk', pattern: '/learn/invest/:lessonId', element: <LessonPlayer /> },
  { path: '/learn/invest/game_chai_price', pattern: '/learn/invest/:lessonId', element: <LessonPlayer /> },
  { path: '/learn/invest/not-a-real-room', pattern: '/learn/invest/:lessonId', element: <LessonPlayer /> },
];

let container: HTMLDivElement | null = null;
afterEach(() => {
  container?.remove();
  container = null;
});

async function mount(path: string, pattern: string, element: ReactElement) {
  container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path={pattern} element={element} />
        </Routes>
      </MemoryRouter>,
    );
  });
  return { text: () => container!.textContent ?? '', root, settle: () => act(async () => void (await new Promise((r) => setTimeout(r, 60)))) };
}

describe('every investing route shows the simulation banner', () => {
  it.each(ROUTES)('$path', async ({ path, pattern, element }) => {
    const page = await mount(path, pattern, element);
    expect(page.text(), 'while loading').toContain(t('investui.banner'));
    await page.settle();
    expect(page.text(), 'once loaded').toContain(t('investui.banner'));
    await act(async () => page.root.unmount());
  });
});

describe('no investing route is missing from the test above', () => {
  it('covers every /learn/invest route in the router', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/app/router.tsx'), 'utf8');
    const inRouter = [...source.matchAll(/path:\s*'(\/learn\/invest[^']*)'/g)].map((m) => m[1]!);
    expect(inRouter.length).toBeGreaterThan(4);
    const covered = new Set(ROUTES.map((r) => r.pattern));
    for (const path of inRouter) expect(covered.has(path), `route ${path} has no banner test`).toBe(true);
  });
});

/** All .ts/.tsx files under a folder, skipping tests. */
function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.(ts|tsx)$/.test(name) && !/\.test\./.test(name) ? [full] : [];
  });
}

describe('projected amounts are never shown as a lone number', () => {
  const files = sourceFiles(resolve(process.cwd(), 'src/games/investing')).filter((f) => f.endsWith('.tsx'));

  it('scans a useful number of screens', () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it('no screen formats a percentile or a median directly (use RangeDisplay or FanChart)', () => {
    const offenders = files.filter((f) => /\b(money|formatRupees|fmtPrice|price|signedMoney)\([^)]*\.(median|p5|p95)\b/.test(readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
  });

  it('RangeDisplay always takes a low and a high, so it cannot show one number', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/ui/RangeDisplay.tsx'), 'utf8');
    expect(source).toMatch(/low: number;/);
    expect(source).toMatch(/high: number;/);
    expect(source).toMatch(/median: number;/);
  });
});
