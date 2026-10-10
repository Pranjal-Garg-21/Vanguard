/** Checks a script is well formed before it ships. Pure; returns a list of problems. Owner: P5. */
import type { Scenario } from './types';

export function validateScenario(s: Scenario): string[] {
  const errors: string[] = [];
  const stepIds = new Set(s.steps.map((x) => x.id));
  if (stepIds.size !== s.steps.length) errors.push('duplicate step ids');

  const unlockable = new Set<string>();
  for (const step of s.steps) for (const a of step.surface.actions ?? []) for (const u of a.unlocks ?? []) unlockable.add(u);

  for (const step of s.steps) {
    const { id, surface, at } = step;
    const lensIds = new Set((surface.lens ?? []).map((l) => l.id));
    const tellIds = new Set((surface.tells ?? []).map((t) => t.id));

    if (at === undefined && !unlockable.has(id)) errors.push(`${id}: never appears (no "at" and nothing unlocks it)`);
    for (const l of surface.lens ?? []) if (l.tell && !tellIds.has(l.tell)) errors.push(`${id}: lens ${l.id} points to missing tell ${l.tell}`);
    for (const t of surface.tells ?? []) {
      if (![...(surface.lens ?? [])].some((l) => l.tell === t.id)) errors.push(`${id}: tell ${t.id} can never be found (no lens uses it)`);
    }

    const segments = 'body' in surface ? surface.body : 'lines' in surface ? surface.lines : [];
    const actionIds = new Set((surface.actions ?? []).map((a) => a.id));
    for (const seg of segments) {
      if (seg.lens && !lensIds.has(seg.lens)) errors.push(`${id}: text uses missing lens ${seg.lens}`);
      if (seg.action && !actionIds.has(seg.action)) errors.push(`${id}: text links to missing action ${seg.action}`);
    }
    const headLens = 'fromLens' in surface ? surface.fromLens : 'callerLens' in surface ? surface.callerLens : 'urlLens' in surface ? surface.urlLens : undefined;
    if (headLens && !lensIds.has(headLens)) errors.push(`${id}: header uses missing lens ${headLens}`);

    for (const a of surface.actions ?? []) for (const u of a.unlocks ?? []) if (!stepIds.has(u)) errors.push(`${id}: action ${a.id} unlocks missing step ${u}`);
    if (surface.timeout && !actionIds.has(surface.timeout.action)) errors.push(`${id}: timeout action ${surface.timeout.action} missing`);

    if (s.mode === 'judge' && !surface.verdict) errors.push(`${id}: judge item has no verdict`);
    if (s.mode === 'act' && (surface.actions ?? []).length === 0) errors.push(`${id}: act surface has no actions`);
  }

  if (s.mode === 'act') {
    const ends = s.steps.some((x) => x.surface.respond || (x.surface.actions ?? []).some((a) => a.end));
    if (!ends) errors.push('no action ends the run');
  }
  return errors;
}
