/** Loads every phone script from content/scenarios/safe. Add a JSON file there and it appears here. Owner: P5. */
import type { Scenario } from './logic/types';

const files = import.meta.glob<Scenario>('../../../content/scenarios/safe/*.json', { eager: true, import: 'default' });

const scenarios = Object.values(files).sort((a, b) => a.id.localeCompare(b.id));

export function listScenarios(): Scenario[] {
  return scenarios;
}

export function getScenario(id: string): Scenario | undefined {
  return scenarios.find((s) => s.id === id);
}

import inboxPool from '../../../content/scenarios/safe/pools/inbox_pool.json';
import { buildInboxDay, type InboxOptions, type PoolItem } from './logic/inbox';

/** The message pool for the Scam Inbox. */
export const INBOX_POOL = inboxPool as unknown as PoolItem[];

/** A fresh inbox day. The same seed always gives the same day. */
export function inboxDay(options: InboxOptions): Scenario {
  return buildInboxDay(INBOX_POOL, options);
}
