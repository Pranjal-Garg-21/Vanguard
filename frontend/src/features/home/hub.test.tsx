/**
 * The three doors on the dashboard. Owner: P3.
 *
 * Every one of these has been wrong at some point: a card that said "Coming
 * soon" over a page that existed, a Play button that was disabled while the
 * game was finished, counts typed in by hand that drifted from the content.
 * So this mounts the hub for real and checks where the links go, that the
 * numbers come from the content, and that a saved year is read back.
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import { saveGame } from '@/platform';
import { resetDb, createTestProfile } from '@/test/fixtures';
import { HomeHub } from '@/features/home/HomeHub';

declare global { // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
let root: Root;
beforeEach(async () => {
  await resetDb();
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});
afterEach(() => { act(() => root.unmount()); host.remove(); });

const render = async (pid: string) =>
  act(async () => { root.render(<MemoryRouter><HomeHub pid={pid} /></MemoryRouter>); });

const links = () => [...host.querySelectorAll('a')].map((a) => a.getAttribute('href'));

describe('the dashboard hub', () => {
  it('offers three doors and no raw keys', async () => {
    const p = await createTestProfile({});
    await render(p.pid);
    expect(links()).toEqual(expect.arrayContaining(['/play', '/learn', '/safe']));
    expect(host.textContent).not.toMatch(/\b(home|landing)\.[a-z0-9_.]+/i);
    expect(host.textContent).toContain('Start your year');
  });

  it('shows where a saved year got to', async () => {
    const p = await createTestProfile({});
    await saveGame(p.pid, 'paisapur', { v: 1, life: { chapter: 3, month: 7, cash: 240, bank: { balance: 1000 } } });
    await render(p.pid);
    await act(async () => void (await new Promise((r) => setTimeout(r, 0))));
    expect(host.textContent).toContain('Continue your year');
    expect(host.textContent).toContain('3 / 6');
    expect(host.textContent).toContain('₹1,240');
  });

  it('counts the real lessons and simulators', async () => {
    const p = await createTestProfile({});
    await render(p.pid);
    expect(host.textContent).toMatch(/1[0-9] rooms/);
    expect(host.textContent).toMatch(/[0-9] simulators/);
  });
});
