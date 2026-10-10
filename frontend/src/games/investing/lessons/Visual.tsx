/**
 * Pictures for lesson cards (ids are listed in logic/explore.ts). Emoji scenes for now;
 * the design kit can swap in illustrations without touching any lesson.
 */
import type { ReactNode } from 'react';

const SCENES: Record<string, ReactNode> = {
  samosa_stall: <span>🥟 🧑‍🍳 🪙</span>,
  tea_stall: <span>☕ 🏪 🧾</span>,
  piggy_bank: <span>🐷 🪙 📈</span>,
  mango_trees: (
    <span className="flex items-end justify-center gap-6">
      <span>🌳<span className="block text-2xl">🥭🥭</span></span>
      <span>🌳🌱<span className="block text-2xl">🥭🥭🥭🥭</span></span>
    </span>
  ),
};

export function Visual({ id }: { id?: string | undefined }) {
  if (!id || !SCENES[id]) return null;
  return (
    <div aria-hidden="true" className="mb-3 text-center text-5xl leading-tight">
      {SCENES[id]}
    </div>
  );
}
