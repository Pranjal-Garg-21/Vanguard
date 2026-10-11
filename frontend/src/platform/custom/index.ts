/** Scenarios a facilitator published for the student's class, saved on the phone by sync. Owner: P5. */
import type { CustomScenarioRow } from '@shared/custom/scenario.ts';
import { db } from '../storage/db';

export type { CustomScenarioRow } from '@shared/custom/scenario.ts';

/** The class's published scenarios, newest first. Empty when the student has no class or nothing is published. */
export async function listCustomScenarios(classCode: string | null | undefined): Promise<CustomScenarioRow[]> {
  if (!classCode) return [];
  const rows = await db.customScenarios.where('classCode').equals(classCode.toUpperCase()).toArray();
  return rows.sort((a, b) => b.version - a.version || a.title.localeCompare(b.title)).map(({ classCode: _c, updatedAt: _u, ...row }) => row);
}

export async function getCustomScenario(id: string): Promise<CustomScenarioRow | null> {
  const row = await db.customScenarios.get(id);
  if (!row) return null;
  const { classCode: _c, updatedAt: _u, ...rest } = row;
  return rest;
}
