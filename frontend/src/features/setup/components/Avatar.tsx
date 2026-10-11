import { Icon } from '@/ui';
import { AVATARS, avatarIcon } from '../pictures';

const TINTS = ['bg-brand/20 text-brand', 'bg-info/20 text-info', 'bg-xp/20 text-xp', 'bg-warn/20 text-warn'] as const;

/** A player's avatar: an icon in a tinted circle. The same everywhere, from the dashboard to the PIN screen. */
export function Avatar({ id, className = 'h-12 w-12', iconClassName = 'h-6 w-6' }: { id: string; className?: string; iconClassName?: string }) {
  const index = Math.max(0, AVATARS.findIndex((a) => a.id === id));
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-full ${TINTS[index % TINTS.length]} ${className}`}>
      <Icon name={avatarIcon(id)} className={iconClassName} />
    </span>
  );
}
