/**
 * Facilitator data access and auth hooks. Owner: P5.
 * Everything here runs as the logged-in facilitator, so row-level security
 * limits results to their own classes.
 */
import { useEffect, useState } from 'react';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { getSupabase } from '@/platform';

export type FacilitatorRow = { id: string; display_name: string; ngo_id: string | null };

export type ClassRow = {
  id: string;
  name: string;
  centre: string | null;
  language: string;
  join_code: string;
  expected_size: number | null;
  focus: string | null;
  created_at: string;
};

export type PlayerRow = { pid: string; display_name: string; first_seen: string; last_sync: string | null };

export type EventRow = { pid: string; concept: string; correct: boolean | null; misconception: string | null; activity: string; ts: string };

export function supabaseOrThrow(): SupabaseClient {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase is not configured');
  return sb;
}

/** undefined while loading, null when signed out. */
export function useSession(): Session | null | undefined {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) {
      setSession(null);
      return;
    }
    sb.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = sb.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  return session;
}

/** The facilitators row for the logged-in user, or null if they aren't registered. */
export function useFacilitator(userId: string | undefined) {
  const [state, setState] = useState<{ loading: boolean; facilitator: FacilitatorRow | null }>({ loading: true, facilitator: null });

  useEffect(() => {
    if (!userId) return;
    supabaseOrThrow()
      .from('facilitators')
      .select('id, display_name, ngo_id')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data }) => setState({ loading: false, facilitator: data as FacilitatorRow | null }));
  }, [userId]);

  return state;
}

export const LANGUAGE_NAMES: Record<string, string> = { en: 'English', te: 'Telugu', hi: 'Hindi', ur: 'Urdu' };

export function joinUrl(code: string): string {
  return `${window.location.origin}/join/${code}`;
}

export function humanise(id: string): string {
  const text = id.replace(/_/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function timeAgo(iso: string | null): string {
  if (!iso) return 'never';
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.round(hours / 24)} d ago`;
}
