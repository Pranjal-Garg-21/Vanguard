/**
 * Platform services: the only code that touches IndexedDB, the network or
 * Supabase. Import from '@/platform', not from its subfolders.
 * Owner: P5 (i18n and audio: P3).
 */

export * from './storage';
export * from './profiles';
export * from './telemetry';
export * from './sync';
export * from './i18n';
export * from './i18n/hooks';
export * from './classes';
export { getSupabase, isSupabaseConfigured } from './supabase/client';
export type { Accessibility, Profile } from './storage/db';
export type { GameEvent, GameEventInput, GameMode, StageId } from '@shared/telemetry/event.ts';
