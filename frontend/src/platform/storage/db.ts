/**
 * Local database on the student's phone (IndexedDB via Dexie). Owner: P5.
 * Only code inside src/platform may import this file. Everyone else uses the
 * storage, profiles and telemetry APIs.
 */
import Dexie, { type Table } from 'dexie';
import type { GameEvent } from '@shared/telemetry/event.ts';
import type { CustomScenarioRow } from '@shared/custom/scenario.ts';
import type { Unlock } from '@shared/sync/protocol.ts';

export type Accessibility = {
  audio: boolean;
  largeText: boolean;
  reduceMotion: boolean;
  timersOff: boolean;
};

export type Profile = {
  pid: string;
  displayName: string;
  avatarId: string;
  language: 'en' | 'te' | 'hi' | 'ur';
  a11y: Accessibility;
  classCode: string | null;
  /** 'pending' until the class code is confirmed by a sync. */
  classStatus: 'none' | 'pending' | 'valid' | 'invalid';
  pinHash: string;
  pinSalt: string;
  failedAttempts: number;
  lockedUntil: number;
  createdAt: number;
  lastActiveAt: number;
};

export type Save = { pid: string; slot: string; data: unknown; updatedAt: number };

/** Snapshot body belongs to P1; only the indexed fields are fixed here. */
export type StoredSnapshot = { id: string; pid: string; timelineId: string; data: unknown; createdAt: number };

/** 'rejected': the server said this event can never be accepted, so it is not retried. */
export type OutboxStatus = 'pending' | 'sending' | 'sent' | 'rejected';
export type OutboxEvent = GameEvent & { status: OutboxStatus; attempts: number };

export type Setting = { scope: string; key: string; value: unknown };

export type ContentMeta = { packId: string; version: string; updatedAt: number };

export type ClassInfo = { code: string; name: string | null; unlocks: Unlock[]; focus: string | null; updatedAt: number };

/** A scenario a facilitator published for the student's class, kept on the phone so it plays offline. */
export type StoredCustomScenario = CustomScenarioRow & { classCode: string; updatedAt: number };

export class MoneyDB extends Dexie {
  profiles!: Table<Profile, string>;
  saves!: Table<Save, [string, string]>;
  snapshots!: Table<StoredSnapshot, string>;
  outbox!: Table<OutboxEvent, string>;
  settings!: Table<Setting, [string, string]>;
  contentMeta!: Table<ContentMeta, string>;
  classCache!: Table<ClassInfo, string>;
  customScenarios!: Table<StoredCustomScenario, string>;

  // The device database keeps its original name (from before the rename to MoneyPath) so existing saves survive.
  constructor(name = 'paisapath') {
    super(name);
    this.version(1).stores({
      profiles: 'pid, classCode, lastActiveAt',
      saves: '[pid+slot], pid, updatedAt',
      snapshots: 'id, pid, [pid+timelineId]',
      outbox: 'eid, pid, status, [status+ts]',
      settings: '[scope+key]',
      contentMeta: 'packId',
      classCache: 'code',
    });
    // Version 2: scenarios made by the class facilitator.
    this.version(2).stores({ customScenarios: 'id, classCode' });
  }
}

export const db = new MoneyDB();
