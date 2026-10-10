/**
 * The one Supabase client for the app. Owner: P5.
 * Nothing outside src/platform and src/facilitator should import supabase-js.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseEnv } from '../env';

let client: SupabaseClient | null | undefined;

/** Returns null when Supabase is not configured (see frontend/.env.example). */
export function getSupabase(): SupabaseClient | null {
  if (client !== undefined) return client;
  const env = getSupabaseEnv();
  client = env ? createClient(env.url, env.anonKey) : null;
  return client;
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseEnv() !== null;
}
