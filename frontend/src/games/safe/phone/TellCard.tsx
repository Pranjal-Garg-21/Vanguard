import { t } from '@/platform';
import { Icon } from './Icon';
import { TELL_META } from './tells';
import type { TellKind } from './logic/types';

/** A collectible red-flag card. Locked until the student spots that kind of sign. */
export function TellCard({ kind, found, isNew }: { kind: TellKind; found: boolean; isNew?: boolean }) {
  const meta = TELL_META[kind];
  return (
    <div className={`relative flex items-center gap-3 rounded-xl border p-3 ${found ? 'border-brand/60 bg-brand/10' : 'border-line bg-surface opacity-60'}`}>
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${found ? 'bg-brand/20 text-brand' : 'bg-surface-3 text-muted'}`}>
        <Icon name={found ? meta.icon : 'lock'} className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-bold text-ink">{t(meta.nameKey)}</p>
        <p className="text-xs text-muted">{t(meta.hintKey)}</p>
      </div>
      {isNew && <span className="absolute -top-2 right-2 rounded bg-brand px-1.5 py-0.5 text-[10px] font-bold uppercase text-brand-ink">{t('safe.ui.newCard')}</span>}
    </div>
  );
}
