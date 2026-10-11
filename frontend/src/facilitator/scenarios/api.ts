/** Saving and loading a class's custom scenarios, as the signed-in facilitator (row-level security applies). */
import type { CustomInbox } from '@shared/custom/scenario.ts';
import { supabaseOrThrow } from '../data';

export type ScenarioRow = {
  id: string;
  class_id: string;
  title: string;
  brief: string;
  concept: string;
  language: string;
  body: CustomInbox;
  status: 'draft' | 'published';
  version: number;
  updated_at: string;
};

const COLUMNS = 'id, class_id, title, brief, concept, language, body, status, version, updated_at';

export async function listScenarios(classId: string): Promise<ScenarioRow[]> {
  const { data, error } = await supabaseOrThrow().from('custom_scenarios').select(COLUMNS).eq('class_id', classId).order('updated_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data as ScenarioRow[] | null) ?? [];
}

export type SaveInput = { id?: string; classId: string; title: string; brief: string; concept: string; language: string; body: CustomInbox; status: 'draft' | 'published' };

export async function saveScenario(input: SaveInput): Promise<ScenarioRow> {
  const sb = supabaseOrThrow();
  const fields = { title: input.title.trim(), brief: input.brief.trim(), concept: input.concept, language: input.language.trim() || 'en', body: input.body, status: input.status };
  const query = input.id
    ? sb.from('custom_scenarios').update(fields).eq('id', input.id).select(COLUMNS).single()
    : sb.from('custom_scenarios').insert({ ...fields, class_id: input.classId }).select(COLUMNS).single();
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data as ScenarioRow;
}

export async function setStatus(id: string, status: 'draft' | 'published'): Promise<void> {
  const { error } = await supabaseOrThrow().from('custom_scenarios').update({ status }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteScenario(id: string): Promise<void> {
  const { error } = await supabaseOrThrow().from('custom_scenarios').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
