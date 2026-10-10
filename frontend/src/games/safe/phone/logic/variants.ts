/**
 * Seeded variants of any script template. A template has {placeholders} in its
 * text; a spec lists the values each placeholder can take and where the
 * money lost should come from. Same seed, same variant. Pure. Owner: P5.
 */
import { makeRng } from './rng';
import type { Scenario } from './types';

export const inr = (n: number) => n.toLocaleString('en-IN');

export type VariantSpec = {
  /** Each key can take one of these values. Numbers are formatted as rupees in text. */
  pools: Record<string, readonly (string | number)[]>;
  /** Extra text values worked out from the picks (for example a new balance). */
  derive?: (picked: Record<string, string | number>) => Record<string, string | number>;
  /** Replace a name field on some surfaces with a template such as "{name} (saved number)". */
  names?: { surfaces: string[]; field: 'from' | 'caller' | 'fromName'; template: string }[];
  /** Actions whose money loss equals one of the picked numbers. */
  loss?: { surface: string; action: string; key: string }[];
};

const fill = (template: string, vars: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? `{${k}}`));

export function applyVariant(template: Scenario, seed: number, spec: VariantSpec, balance?: number): Scenario {
  const rng = makeRng(seed);
  const picked: Record<string, string | number> = {};
  for (const [key, pool] of Object.entries(spec.pools)) picked[key] = rng.pick(pool);

  const vars: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(picked)) vars[k] = typeof v === 'number' ? inr(v) : v;
  Object.assign(vars, spec.derive?.(picked) ?? {});

  const s = JSON.parse(JSON.stringify(template)) as Scenario;
  s.id = `${template.id}_${seed}`;
  s.vars = vars;
  if (balance !== undefined) s.phone.startBalance = balance;

  for (const step of s.steps) {
    const sf = step.surface as unknown as Record<string, unknown>;
    for (const n of spec.names ?? []) if (n.surfaces.includes(step.id) && n.field in sf) sf[n.field] = fill(n.template, vars);
    for (const l of spec.loss ?? []) {
      if (l.surface !== step.id) continue;
      const action = step.surface.actions?.find((a) => a.id === l.action);
      if (action) action.effects = { 'money.bank': -Number(picked[l.key]) };
    }
  }
  return s;
}
