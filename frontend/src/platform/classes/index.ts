/**
 * Class code checks for the student setup flow. Owner: P5.
 */
import { getSupabase } from '../supabase/client';

export type ClassCheck =
  | { status: 'valid'; name: string }
  | { status: 'invalid' }
  /** Offline or Supabase not configured: accept now, confirm at next sync. */
  | { status: 'unchecked' };

export const JOIN_CODE_LENGTH = 6;

export function normaliseJoinCode(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, JOIN_CODE_LENGTH);
}

export async function checkClassCode(code: string): Promise<ClassCheck> {
  const supabase = getSupabase();
  if (!supabase || (typeof navigator !== 'undefined' && !navigator.onLine)) return { status: 'unchecked' };

  const { data, error } = await supabase.rpc('check_join_code', { code: normaliseJoinCode(code) });
  if (error) return { status: 'unchecked' };
  const row = (data as { name: string }[] | null)?.[0];
  return row ? { status: 'valid', name: row.name } : { status: 'invalid' };
}
