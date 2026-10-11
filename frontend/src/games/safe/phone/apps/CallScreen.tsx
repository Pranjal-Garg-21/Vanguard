/**
 * A call has three looks: a ringing screen that takes over the phone, an
 * in-call screen with what the caller says and the student's options (both
 * Act mode), and a transcript opened from Recents (Judge and inbox).
 */
import type { ReactNode } from 'react';
import { t } from '@/platform';
import { Button, Icon } from '@/ui';
import { Lensable, RichText, type ViewProps } from '../Text';
import type { Action, Surface } from '../logic/types';

type Call = Extract<Surface, { type: 'call' }>;

/** Buttons come from the script's actions, so which one is risky is data. */
export function IncomingCall({ surface, view, actions, onAct, lensNode, after, onContinue, continueLabel }: { surface: Call; view: ViewProps; actions: Action[]; onAct: (id: string) => void; lensNode?: ReactNode; after?: ReactNode; onContinue?: () => void; continueLabel?: string }) {
  const secs = view.remainingMs === undefined ? null : Math.ceil(view.remainingMs / 1000);
  if (surface.ring) {
    return (
      <div className="absolute inset-0 z-30 flex flex-col items-center justify-between bg-gradient-to-b from-slate-800 to-slate-950 px-6 py-14 text-white">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-white/60">{t('safe.ui.incoming')}</p>
          <p className="mt-3 text-2xl font-bold">
            <Lensable surface={surface} lens={surface.callerLens} view={view}>{surface.caller}</Lensable>
          </p>
        </div>
        <span className="flex h-24 w-24 animate-ring items-center justify-center rounded-full bg-brand text-brand-ink"><Icon name="phone" className="h-10 w-10" /></span>
        {after ? (
          <div className="w-full space-y-3 text-phone-ink">
            {after}
            {onContinue && <Button className="w-full" onClick={onContinue}>{continueLabel}</Button>}
          </div>
        ) : (
          <div className="flex w-full flex-col gap-2">
            {actions.map((a) => (
              <Button key={a.id} variant="secondary" className="w-full" onClick={() => onAct(a.id)}>{t(a.labelKey)}</Button>
            ))}
          </div>
        )}
        {lensNode && !after && <div className="mt-3 w-full text-phone-ink">{lensNode}</div>}
      </div>
    );
  }
  return (
    <div className="absolute inset-0 z-30 flex flex-col overflow-y-auto bg-gradient-to-b from-slate-800 to-slate-950 px-5 py-6 text-white">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-brand-ink"><Icon name="phone" className="h-5 w-5" /></span>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-white/60">{t('safe.ui.inCall')}</p>
          <p className="font-bold">
            <Lensable surface={surface} lens={surface.callerLens} view={view}>{surface.caller}</Lensable>
          </p>
        </div>
      </div>
      {secs !== null && !view.resolved && (
        <p className="mt-3 flex items-center gap-1.5 font-mono text-sm font-bold text-amber-300">
          <Icon name="clock" className="h-4 w-4" />
          {t('safe.ui.timer', { s: secs })}
          {view.timersOff && <span className="font-sans text-xs font-normal text-white/60"> {t('safe.ui.timersOff')}</span>}
        </p>
      )}
      <div className="mt-4 rounded-2xl rounded-ss-sm bg-white/10 px-4 py-3 text-[15px] leading-relaxed">
        <RichText segments={surface.lines} surface={surface} view={view} />
      </div>
      {lensNode && !after && <div className="mt-3 text-phone-ink">{lensNode}</div>}
      {after ? (
        <div className="mt-auto space-y-3 pt-5 text-phone-ink">
          {after}
          {onContinue && <Button className="w-full" onClick={onContinue}>{continueLabel}</Button>}
        </div>
      ) : (
        <div className="mt-auto flex flex-col gap-2 pt-5">
          {actions.map((a) => (
            <Button key={a.id} variant="secondary" className="w-full" onClick={() => onAct(a.id)}>{t(a.labelKey)}</Button>
          ))}
        </div>
      )}
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
      <div className="mt-3 rounded-2xl rounded-ss-sm bg-phone-bubble px-3.5 py-2.5 text-[15px] italic leading-relaxed">
        &ldquo;<RichText segments={surface.lines} surface={surface} view={view} />&rdquo;
      </div>
    </div>
  );
}
