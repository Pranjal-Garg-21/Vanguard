/**
 * Text that can be inspected. With the Scam Lens off it reads like a normal
 * message (links are tappable). With the lens on, EVERY inspectable part gets
 * the same outline, whether it is a red flag or not, so the outline never
 * gives the answer away. Debrief mode highlights the real red flags.
 */
import type { ReactNode } from 'react';
import { t } from '@/platform';
import { Icon } from './Icon';
import type { Lens, Segment, Surface } from './logic/types';

export type ViewProps = {
  lensOn: boolean;
  /** After the run: red flags are highlighted. */
  debrief?: boolean;
  /** Lens ids already inspected on this surface. */
  inspected: string[];
  onInspect: (lensId: string) => void;
  /** Runs a script action (used by tappable links). */
  onAct: (actionId: string) => void;
  /** Action already taken, if any. */
  resolved?: string;
  timersOff?: boolean;
  remainingMs?: number;
  /** Values for {placeholders} in this script's text. */
  vars?: Record<string, string | number>;
};

function lensOf(surface: Surface, id?: string): Lens | undefined {
  return id ? surface.lens?.find((l) => l.id === id) : undefined;
}

const OUTLINE = 'rounded-sm outline-2 outline-offset-2 outline-dashed outline-phone-link/70';

/** Wraps any part of a surface (sender, URL…) so the lens can inspect it. */
export function Lensable({ surface, lens, view, children }: { surface: Surface; lens?: string; view: ViewProps; children: ReactNode }) {
  const def = lensOf(surface, lens);
  if (!def) return <>{children}</>;
  const flagged = view.debrief && def.tell;
  const done = view.inspected.includes(def.id);
  if (!view.lensOn && !view.debrief) return <>{children}</>;
  return (
    <button
      type="button"
      onClick={() => view.onInspect(def.id)}
      aria-label={t('safe.ui.lens')}
      className={`inline cursor-help text-left ${flagged ? 'rounded bg-bad/20 px-0.5 font-semibold text-bad underline decoration-bad decoration-wavy' : OUTLINE} ${done && !flagged ? 'bg-phone-link/10' : ''}`}
    >
      {children}
    </button>
  );
}

export function RichText({ segments, surface, view }: { segments: Segment[]; surface: Surface; view: ViewProps }) {
  return (
    <>
      {segments.map((seg, i) => {
        const text = t(seg.k, view.vars);
        const isLink = seg.action && !view.resolved && !view.debrief;
        const inner = isLink ? (
          <span className={view.lensOn ? '' : 'font-medium text-phone-link underline'}>{text}</span>
        ) : (
          <>{text}</>
        );
        if (seg.lens && (view.lensOn || view.debrief)) {
          return <Lensable key={i} surface={surface} lens={seg.lens} view={view}>{inner}</Lensable>;
        }
        if (isLink) {
          return (
            <button key={i} type="button" onClick={() => view.onAct(seg.action as string)} className="inline text-left">
              {inner}
            </button>
          );
        }
        return <span key={i}>{text}</span>;
      })}
    </>
  );
}

/** Shows what the last inspected thing really is. */
export function LensReading({ surface, lensId, vars }: { surface: Surface; lensId: string | null; vars?: ViewProps['vars'] }) {
  const def = lensOf(surface, lensId ?? undefined);
  if (!def) return null;
  const tell = surface.tells?.find((x) => x.id === def.tell);
  return (
    <div role="status" className={`mt-3 rounded-lg border-l-4 p-3 text-sm ${tell ? 'border-bad bg-bad/10' : 'border-phone-link bg-phone-link/10'}`}>
      <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-phone-muted"><Icon name="search" className="h-3.5 w-3.5" />{t('safe.ui.lensReveal')}</p>
      <p className="mt-1 text-phone-ink">{t(def.revealKey, vars)}</p>
      <p className={`mt-1 flex items-center gap-1 text-xs font-bold ${tell ? 'text-bad' : 'text-phone-muted'}`}>{tell && <Icon name="flag" className="h-3.5 w-3.5" />}{tell ? t('safe.ui.lensFound') : t('safe.ui.lensNothing')}</p>
    </div>
  );
}
