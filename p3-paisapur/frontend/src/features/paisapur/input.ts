/**
 * Input: keyboard keys and the touch pad share one path. The on-screen
 * buttons send the same KeyboardEvents a keyboard would.
 * Keys: arrows/WASD move, Z/Enter/Space = A, X/Esc/Backspace = B, M/Tab = menu.
 */
import { useEffect, useRef } from 'react';

export const KEY_A = new Set(['z', 'Z', 'Enter', ' ']);
export const KEY_B = new Set(['x', 'X', 'Escape', 'Backspace']);
export const KEY_MENU = new Set(['m', 'M', 'Tab']);

/** Sends a key to the game, as if pressed on a keyboard. */
export function pressKey(key: string, type: 'keydown' | 'keyup' = 'keydown') {
  window.dispatchEvent(new KeyboardEvent(type, { key }));
}

/** Calls the latest handler for each key press while mounted (ignores auto-repeat). */
export function useKeys(handler: (key: string) => void, active = true) {
  const ref = useRef(handler);
  useEffect(() => {
    ref.current = handler;
  });
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.target instanceof HTMLInputElement) return;
      ref.current(e.key);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active]);
}
