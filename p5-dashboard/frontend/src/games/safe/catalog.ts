/**
 * The Stay Safe simulators and the ways to play each one. Data only: the hub
 * screen reads this to draw the picker and the learning path, and decides how
 * to launch each entry. Owner: P5.
 */
import type { IconName } from './phone/Icon';
import type { SimulatorId } from './phone/logic/types';

export type EntryKind = 'upi-full' | 'collect' | 'qr' | 'inbox-day' | 'scenario' | 'template';

export type CatalogEntry = {
  id: string;
  kind: EntryKind;
  titleKey: string;
  briefKey: string;
  /** Label on the card: how this entry plays. */
  tag: 'full' | 'quick' | 'single';
  level: 1 | 2 | 3;
  /** Use case ID logged with every event. */
  activity: string;
  /** Fallback concept for events. */
  concept: string;
  /** For 'scenario': the script ID in content/scenarios/safe. For 'template': the key in specs.ts. */
  scenarioId?: string;
};

export type Simulator = {
  id: SimulatorId;
  titleKey: string;
  blurbKey: string;
  icon: IconName;
  entries: CatalogEntry[];
};

const entry = (e: Omit<CatalogEntry, 'titleKey'> & { titleKey?: string }): CatalogEntry => ({ titleKey: `safe.hub.entry.${e.id}`, ...e });

export const SIMULATORS: Simulator[] = [
  {
    id: 'upi',
    titleKey: 'safe.hub.upi.title',
    blurbKey: 'safe.hub.upi.blurb',
    icon: 'wallet',
    entries: [
      entry({ id: 'upi_full', kind: 'upi-full', briefKey: 'safe.upi.brief', tag: 'full', level: 1, activity: 'UC-SAFE-01', concept: 'upi_collect' }),
      entry({ id: 'collect', kind: 'collect', briefKey: 'safe.collect01.brief', tag: 'quick', level: 1, activity: 'UC-SAFE-01', concept: 'upi_collect' }),
      entry({ id: 'wrong_transfer', kind: 'template', scenarioId: 'wrong_transfer', briefKey: 'safe.wt.brief', tag: 'quick', level: 2, activity: 'UC-SAFE-01', concept: 'wrong_transfer' }),
      entry({ id: 'qr', kind: 'qr', briefKey: 'safe.qr01.brief', tag: 'quick', level: 2, activity: 'UC-SAFE-01', concept: 'qr_scam' }),
    ],
  },
  {
    id: 'inbox',
    titleKey: 'safe.hub.inbox.title',
    blurbKey: 'safe.hub.inbox.blurb',
    icon: 'mail',
    entries: [
      entry({ id: 'inbox_day', kind: 'inbox-day', briefKey: 'safe.inbox.brief', tag: 'full', level: 2, activity: 'UC-SAFE-03', concept: 'red_flags' }),
      entry({ id: 'kyc', kind: 'scenario', scenarioId: 'kyc_expiry_01', briefKey: 'safe.kyc01.brief', tag: 'single', level: 1, activity: 'UC-SAFE-03', concept: 'fake_kyc' }),
    ],
  },
  {
    id: 'hunter',
    titleKey: 'safe.hub.hunter.title',
    blurbKey: 'safe.hub.hunter.blurb',
    icon: 'search',
    entries: [entry({ id: 'hunter', kind: 'scenario', scenarioId: 'inbox_judge_01', briefKey: 'safe.inbox01.brief', tag: 'full', level: 1, activity: 'UC-SAFE-04', concept: 'red_flags' })],
  },
  {
    id: 'call',
    titleKey: 'safe.hub.call.title',
    blurbKey: 'safe.hub.call.blurb',
    icon: 'phone',
    entries: [
      entry({ id: 'customer_care', kind: 'scenario', scenarioId: 'customer_care', briefKey: 'safe.cc.brief', tag: 'single', level: 2, activity: 'UC-SAFE-05', concept: 'fake_support' }),
      entry({ id: 'digital_arrest', kind: 'template', scenarioId: 'digital_arrest', briefKey: 'safe.da.brief', tag: 'single', level: 3, activity: 'UC-SAFE-05', concept: 'authority_impersonation' }),
    ],
  },
  {
    id: 'chat',
    titleKey: 'safe.hub.chat.title',
    blurbKey: 'safe.hub.chat.blurb',
    icon: 'chat',
    entries: [entry({ id: 'hacked_friend', kind: 'template', scenarioId: 'hacked_friend', briefKey: 'safe.hf.brief', tag: 'single', level: 2, activity: 'UC-SAFE-05', concept: 'account_takeover' })],
  },
  {
    id: 'loan',
    titleKey: 'safe.hub.loan.title',
    blurbKey: 'safe.hub.loan.blurb',
    icon: 'rupee',
    entries: [entry({ id: 'loan_trap', kind: 'scenario', scenarioId: 'loan_trap', briefKey: 'safe.ln.brief', tag: 'single', level: 2, activity: 'UC-SAFE-06', concept: 'loan_app' })],
  },
  {
    id: 'rescue',
    titleKey: 'safe.hub.rescue.title',
    blurbKey: 'safe.hub.rescue.blurb',
    icon: 'shield',
    entries: [entry({ id: 'rescue_mission', kind: 'scenario', scenarioId: 'rescue_mission', briefKey: 'safe.rm.brief', tag: 'single', level: 1, activity: 'UC-SAFE-10', concept: 'fraud_recovery' })],
  },
];

/** The recommended order: easy and common first, hard and rare later. Like a learning path. */
export const PATH = ['upi_full', 'collect', 'inbox_day', 'hunter', 'wrong_transfer', 'kyc', 'hacked_friend', 'customer_care', 'qr', 'loan_trap', 'digital_arrest', 'rescue_mission'];

export const getSimulator = (id: string) => SIMULATORS.find((s) => s.id === id);
export const getEntry = (sim: Simulator, id: string) => sim.entries.find((e) => e.id === id);
export const findEntry = (id: string) => {
  for (const sim of SIMULATORS) {
    const e = sim.entries.find((x) => x.id === id);
    if (e) return { sim, entry: e };
  }
  return undefined;
};
/** Entry IDs by simulator, for the simulator badges. */
export const CATALOGUE: Record<string, string[]> = Object.fromEntries(SIMULATORS.map((s) => [s.id, s.entries.map((e) => e.id)]));
