/**
 * Reads public settings from .env.local. Owner: P5.
 * The app must run without them (offline development, "play without a class"),
 * so missing values give null instead of throwing.
 */

export type SupabaseEnv = { url: string; anonKey: string };

export function getSupabaseEnv(): SupabaseEnv | null {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anonKey || url.includes('your-project-ref')) return null;
  return { url, anonKey };
}
