/** The real transport: calls the Supabase `ingest` function. Owner: P5. */
import type { IngestResponse } from '@shared/sync/protocol.ts';
import { getSupabase } from '../supabase/client';
import type { Transport } from './push';

export const supabaseTransport: Transport = async (request) => {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, status: null, message: 'not configured' };
  try {
    const { data, error } = await supabase.functions.invoke<IngestResponse>('ingest', { body: request });
    if (error) {
      const status = (error as { context?: { status?: number } }).context?.status ?? null;
      // No HTTP status means the browser could not reach the function at all (offline, blocked, or not deployed).
      const message = status === null ? 'Could not reach the ingest function. Check the phone is online and the function is deployed.' : error.message;
      return { ok: false, status, message };
    }
    if (!data) return { ok: false, status: null, message: 'empty response' };
    return { ok: true, data };
  } catch (e) {
    return { ok: false, status: null, message: e instanceof Error ? e.message : String(e) };
  }
};
