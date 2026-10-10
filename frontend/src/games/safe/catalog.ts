/**
 * The Stay Safe simulators and the ways to play each one. Data only: the hub
 * screen reads this to draw the picker, and decides how to launch each entry.
 * Owner: P5.
 */
import type { IconName } from './phone/Icon';
import type { SimulatorId } from './phone/logic/types';

export type EntryKind = 'upi-full' | 'collect' | 'qr' | 'inbox-day' | 'scenario';

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
  /** For kind 'scenario': the script ID in content/scenarios/safe. */
  scenarioId?: string;
};

export type Simulator = {
  id: SimulatorId;
  titleKey: string;
  blurbKey: string;
  icon: IconName;
  entries: CatalogEntry[];
};

export const SIMULATORS: Simulator[] = [
  {
    id: 'upi',
    titleKey: 'safe.hub.upi.title',
    blurbKey: 'safe.hub.upi.blurb',
    icon: 'wallet',
    entries: [
      { id: 'upi_full', kind: 'upi-full', titleKey: 'safe.hub.entry.upi_full', briefKey: 'safe.upi.brief', tag: 'full', level: 1, activity: 'UC-SAFE-01', concept: 'upi_collect' },
      { id: 'collect', kind: 'collect', titleKey: 'safe.hub.entry.collect', briefKey: 'safe.collect01.brief', tag: 'quick', level: 1, activity: 'UC-SAFE-01', concept: 'upi_collect' },
      { id: 'qr', kind: 'qr', titleKey: 'safe.hub.entry.qr', briefKey: 'safe.qr01.brief', tag: 'quick', level: 2, activity: 'UC-SAFE-01', concept: 'qr_scam' },
    ],
  },
  {
    id: 'inbox',
    titleKey: 'safe.hub.inbox.title',
    blurbKey: 'safe.hub.inbox.blurb',
    icon: 'mail',
    entries: [
      { id: 'inbox_day', kind: 'inbox-day', titleKey: 'safe.hub.entry.inbox_day', briefKey: 'safe.inbox.brief', tag: 'full', level: 2, activity: 'UC-SAFE-03', concept: 'red_flags' },
      { id: 'kyc', kind: 'scenario', scenarioId: 'kyc_expiry_01', titleKey: 'safe.hub.entry.kyc', briefKey: 'safe.kyc01.brief', tag: 'single', level: 1, activity: 'UC-SAFE-03', concept: 'fake_kyc' },
    ],
  },
  {
    id: 'hunter',
    titleKey: 'safe.hub.hunter.title',
    blurbKey: 'safe.hub.hunter.blurb',
    icon: 'search',
    entries: [
      { id: 'hunter', kind: 'scenario', scenarioId: 'inbox_judge_01', titleKey: 'safe.hub.entry.hunter', briefKey: 'safe.inbox01.brief', tag: 'full', level: 1, activity: 'UC-SAFE-04', concept: 'red_flags' },
    ],
  },
  { id: 'call', titleKey: 'safe.hub.call.title', blurbKey: 'safe.hub.call.blurb', icon: 'phone', entries: [] },
];

export const getSimulator = (id: string) => SIMULATORS.find((s) => s.id === id);
export const getEntry = (sim: Simulator, id: string) => sim.entries.find((e) => e.id === id);
