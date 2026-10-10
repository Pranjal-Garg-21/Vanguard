/**
 * A call has two looks: a full-screen ring that takes over the phone (Act),
 * and a call transcript (Judge) opened from Recents.
 */
import { t } from '@/platform';
import { Icon } from '../Icon';
import { Button } from '@/ui';
import { Lensable, RichText, type ViewProps } from '../Text';
import type { Action, Surface } from '../logic/types';

type Call = Extract<Surface, { type: 'call' }>;

/** Buttons come from the script's actions, so which one is risky is data. */
export function IncomingCall({ surface, view, actions, onAct }: { surface: Call; view: ViewProps; actions: Action[]; onAct: (id: string) => void }) {
  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-between bg-gradient-to-b from-slate-800 to-slate-950 px-6 py-14 text-white">
      <div className="text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-white/60">{t('safe.ui.incoming')}</p>
        <p className="mt-3 text-2xl font-bold">
          <Lensable surface={surface} lens={surface.callerLens} view={view}>{surface.caller}</Lensable>
        </p>
      </div>
      <span className="flex h-24 w-24 animate-ring items-center justify-center rounded-full bg-brand text-brand-ink"><Icon name="phone" className="h-10 w-10" /></span>
      <div className="flex w-full flex-col gap-2">
        {actions.map((a) => (
          <Button key={a.id} variant="secondary" className="w-full" onClick={() => onAct(a.id)}>
            {t(a.labelKey)}
          </Button>
        ))}
      </div>
    </div>
  );
}

/** What the caller said, shown as a transcript so it works without audio. */
export function CallTranscript({ surface, view }: { surface: Call; view: ViewProps }) {
  return (
    <div className="p-4 text-phone-ink">
      <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-phone-muted"><Icon name="phone" className="h-3.5 w-3.5" />{t('safe.ui.incoming')}</p>
      <p className="mt-1 text-lg font-bold">
        <Lensable surface={surface} lens={surface.callerLens} view={view}>{surface.caller}</Lensable>
      </p>
      <div className="mt-3 rounded-2xl rounded-tl-sm bg-phone-bubble px-3.5 py-2.5 text-[15px] italic leading-relaxed">
        “<RichText segments={surface.lines} surface={surface} view={view} />”
      </div>
    </div>
  );
}
