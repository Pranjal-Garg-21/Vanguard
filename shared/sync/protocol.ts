/**
 * Request and response shapes for the ingest function, shared by the
 * frontend sync engine and the backend. Owner: P5.
 */
import type { GameEvent } from '../telemetry/event.ts';

export const MAX_BATCH_SIZE = 200;

export type IngestRequest = {
  classCode: string;
  player: { pid: string; displayName: string };
  events: GameEvent[];
};

export type Unlock = {
  /** "S3", "arcade.investing", ... */
  target: string;
  /** ISO date the unlock applies from, or null for immediately. */
  fromDate: string | null;
};

export type IngestResponse = {
  accepted: string[];
  rejected: { eid: string; errors: string[] }[];
  unlocks: Unlock[];
  focus: string | null;
};
