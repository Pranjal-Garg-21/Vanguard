import { t } from '@/platform';
import { TELL_META } from './tells';
import type { TellKind } from './logic/types';
import { Icon } from '@/ui';

/**
 * A collectible red-flag card in one of three states:
 *   found      spotted in this run (lit, with a "New card" tag when it is the first time)
 *   collected  spotted in an earlier room (softly lit, tagged "Collected")
 *   locked     not spotted yet, with a hint on how to unlock it
 */
export function TellCard({ kind, found, collected, isNew }: { kind: TellKind; found: boolean; collected?: boolean; isNew?: boolean }) {
  const meta = TELL_META[kind];
  const lit = found || !!collected;
  const tag = isNew ? t('safe.ui.newCard') : !found && collected ? t('safe.ui.cardCollected') : null;
  return (
    <div className={`relative flex items-center gap-3 rounded-xl border p-3 ${found ? 'border-brand/60 bg-brand/10' : collected ? 'border-brand/30 bg-surface' : 'border-line bg-surface'}`}>
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${found ? 'bg-brand/20 text-brand' : collected ? 'bg-brand/10 text-brand/80' : 'bg-surface-3 text-muted'}`}>
        <Icon name={lit ? meta.icon : 'lock'} className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className={`text-sm font-bold ${lit ? 'text-ink' : 'text-ink-soft'}`}>{t(meta.nameKey)}</p>
        <p className="text-xs text-muted">{t(meta.hintKey)}</p>
        {!lit && <p className="mt-0.5 text-[11px] font-medium text-info">{t('safe.ui.cardUnlock')}</p>}
      </div>
      {tag && <span className={`absolute -top-2 end-2 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${isNew ? 'bg-brand text-brand-ink' : 'bg-surface-3 text-ink-soft'}`}>{tag}</span>}
    </div>
  );
}
