import * as finance from '@/core/market/finance';
import { formatRupees, formatValue } from '@/core/market';
import type { CalcDef, VarDef } from './types';

export { formatRupees, formatValue };

const helpers: Record<string, (...a: number[]) => number> = {
  add: (a, b) => a + b,
  sub: (a, b) => a - b,
  mul: (a, b) => a * b,
  div: (a, b) => a / b,
  identity: (a) => a,
  sum: (...n) => n.reduce((a, b) => a + b, 0),
  min: (...n) => Math.min(...n),
  max: (...n) => Math.max(...n),
  abs: (a) => Math.abs(a),
  floor: (a) => Math.floor(a),
  ceil: (a) => Math.ceil(a),
};

type Fn = (...a: number[]) => number;
export const lookup = (name: string): Fn => {
  const fn = helpers[name] ?? ((finance as unknown) as Record<string, Fn>)[name];
  if (typeof fn !== 'function') throw new Error(`Unknown calc function: ${name}`);
  return fn;
};

export interface Computed {
  raw: number;
  text: string;
}

/** Evaluate vars and calcs in order. Returns each name's raw value and its display text. */
export function runCalcs(vars: Record<string, VarDef> = {}, calcs: CalcDef[] = []): Record<string, Computed> {
  const out: Record<string, Computed> = {};
  for (const [name, v] of Object.entries(vars)) {
    out[name] = { raw: v.value, text: formatValue(v.value, v.fmt, v.round ?? 0) };
  }
  for (const c of calcs) {
    const args = c.args.map((a) => {
      if (typeof a === 'number') return a;
      if (!a.startsWith('$')) throw new Error(`Bad arg "${a}" in calc ${c.id}`);
      const ref = out[a.slice(1)];
      if (!ref) throw new Error(`Calc ${c.id} refers to unknown or later name ${a}`);
      return ref.raw;
    });
    const raw = lookup(c.fn)(...args);
    out[c.id] = { raw, text: formatValue(raw, c.fmt, c.round ?? 0) };
  }
  return out;
}

export const placeholders = (text: string): string[] => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1] ?? '');

/** Replace {name} with its display text. Throws on an unknown name so a typo cannot reach a student. */
export function fillTemplate(text: string, ctx: Record<string, Computed>): string {
  return text.replace(/\{(\w+)\}/g, (_, name: string) => {
    const hit = ctx[name];
    if (!hit) throw new Error(`Unknown placeholder {${name}} in: ${text}`);
    return hit.text;
  });
}
