/** Display info for each red-flag kind. Text lives in content/i18n/en/safe.json. Owner: P5. */
import type { TellKind } from './logic/types';
import type { IconName } from '@/ui';

export const TELL_META: Record<TellKind, { icon: IconName; nameKey: string; hintKey: string }> = {
  urgency: { icon: 'clock', nameKey: 'safe.tell.urgency.name', hintKey: 'safe.tell.urgency.hint' },
  too_good: { icon: 'gift', nameKey: 'safe.tell.too_good.name', hintKey: 'safe.tell.too_good.hint' },
  asks_secret: { icon: 'key', nameKey: 'safe.tell.asks_secret.name', hintKey: 'safe.tell.asks_secret.hint' },
  pretends: { icon: 'user', nameKey: 'safe.tell.pretends.name', hintKey: 'safe.tell.pretends.hint' },
  secrecy: { icon: 'eyeOff', nameKey: 'safe.tell.secrecy.name', hintKey: 'safe.tell.secrecy.hint' },
  odd_link: { icon: 'link', nameKey: 'safe.tell.odd_link.name', hintKey: 'safe.tell.odd_link.hint' },
  pulls_money: { icon: 'rupee', nameKey: 'safe.tell.pulls_money.name', hintKey: 'safe.tell.pulls_money.hint' },
};
