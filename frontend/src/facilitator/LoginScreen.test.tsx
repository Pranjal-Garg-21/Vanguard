// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./data', () => ({
  supabaseOrThrow: () => ({ auth: { signInWithOtp: async () => ({ error: null }), verifyOtp: async () => ({ error: null }) } }),
}));

import { LoginScreen } from './LoginScreen';

let host: HTMLDivElement;
let root: Root;
beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

/** Types into a React input the way a browser does: set the value, then fire `input`. */
function type(input: HTMLInputElement, value: string) {
  const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
  set.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

async function openCodeStep(): Promise<HTMLInputElement> {
  await act(async () => root.render(<MemoryRouter><LoginScreen /></MemoryRouter>));
  const email = host.querySelector('input[type="email"]') as HTMLInputElement;
  await act(async () => type(email, 'a@b.org'));
  await act(async () => host.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
  return host.querySelector('input[inputmode="numeric"]') as HTMLInputElement;
}

describe('the facilitator code box', () => {
  it('keeps every digit typed one at a time', async () => {
    const box = await openCodeStep();
    let typed = '';
    for (const digit of '123456') {
      typed += digit;
      await act(async () => type(box, typed));
    }
    expect(box.value).toBe('123456');
  });

  it('keeps only the digits of a pasted code with spaces', async () => {
    const box = await openCodeStep();
    const paste = new Event('paste', { bubbles: true, cancelable: true }) as Event & { clipboardData: { getData: () => string } };
    paste.clipboardData = { getData: () => ' 123 456\n' };
    await act(async () => box.dispatchEvent(paste));
    expect(box.value).toBe('123456');
  });
});
