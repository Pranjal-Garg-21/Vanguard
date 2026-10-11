/**
 * Route wrapper for the Arcade. Owner: P3.
 *
 * TODO(P1): read the real character from the active profile once the persona
 * classifier lands. Until then the Arcade runs on a sandbox character, which
 * is harmless — §6.4 says Arcade play never touches a LifePath character
 * anyway, so nothing here can be lost.
 *
 * The character picker is temporary scaffolding for the same reason: persona
 * filtering is the thing most likely to break quietly, and this is currently
 * the only way to exercise it. Remove it when the real persona arrives.
 */

import { useState } from 'react';

import type { Persona } from '@/core/types';
import { TopNav } from '@/ui';
import { EverydayArcade } from './EverydayArcade';

type Sample = { id: string; label: string; note: string; persona: Persona };

const SAMPLES: Sample[] = [
  {
    id: 'school-dependent',
    label: 'Ravi · 17 · school, allowance',
    note: 'Under 18, so the bank asks for a guardian ID and never a PAN card.',
    persona: {
      lifeStage: 'school_student',
      circumstance: 'dependent',
      moneyPersonality: 'spender',
      maturity: 'starter',
      age: 17,
    },
  },
  {
    id: 'school-contributor',
    label: 'Lakshmi · 17 · school, helps at home',
    note: 'Household share and a sibling’s school fee appear in the card pool.',
    persona: {
      lifeStage: 'school_student',
      circumstance: 'family_contributor',
      moneyPersonality: 'supporter',
      maturity: 'starter',
      age: 17,
    },
  },
  {
    id: 'college-scholarship',
    label: 'Sana · 19 · college, scholarship',
    note: 'Over 18, so the PAN card appears and the guardian ID does not.',
    persona: {
      lifeStage: 'college_student',
      circumstance: 'dependent',
      moneyPersonality: 'saver',
      maturity: 'builder',
      age: 19,
    },
  },
  {
    id: 'earner-contributor',
    label: 'Priya · 21 · first salary, supports family',
    note: 'Earner cards: petrol for work, a gas cylinder, a parent’s check-up.',
    persona: {
      lifeStage: 'first_earner',
      circumstance: 'family_contributor',
      moneyPersonality: 'supporter',
      maturity: 'builder',
      age: 21,
    },
  },
];

export function ArcadeRoute() {
  const [index, setIndex] = useState(0);
  const [seed, setSeed] = useState(1);
  const sample = SAMPLES[index] ?? SAMPLES[0]!;

  return (
    <div className="min-h-dvh bg-bg text-ink">
      <TopNav />
      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6">
        {/* Temporary picker, one row on a wide screen. */}
        <aside className="flex flex-col gap-3 rounded-xl border border-dashed border-line-strong p-3 lg:flex-row lg:items-end">
          <div className="flex flex-col gap-1 lg:w-80">
            <label className="text-xs font-bold uppercase tracking-wide text-muted" htmlFor="sample">
              Playing as
            </label>
            <select
              id="sample"
              className="min-h-11 rounded-lg border border-line-strong bg-surface-2 px-3 text-ink"
              value={index}
              onChange={(e) => setIndex(Number(e.currentTarget.value))}
            >
              {SAMPLES.map((s, i) => (
                <option key={s.id} value={i}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <p className="flex-1 text-sm text-ink-soft">{sample.note}</p>
          <button
            type="button"
            className="min-h-11 rounded-lg border border-line-strong bg-surface-2 px-4 font-bold text-ink hover:border-brand hover:text-brand"
            onClick={() => setSeed((s) => s + 1)}
          >
            Reshuffle (seed {seed})
          </button>
        </aside>

        <EverydayArcade key={`${sample.id}-${seed}`} persona={sample.persona} seed={seed} />
      </main>
    </div>
  );
}
