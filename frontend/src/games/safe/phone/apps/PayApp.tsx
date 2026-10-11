/** A generic pay app (no real brand): balance, recent items and payment requests. Phase 5's UPI Simulator builds on it. */
import { t } from '@/platform';
import { Lensable, RichText, type ViewProps } from '../Text';
import type { Surface } from '../logic/types';
import { Icon } from '@/ui';

export const rupees = (n: number) => `₹${Math.abs(n).toLocaleString('en-IN')}`;

export function PayHome({ balance, lost, requests, onOpen }: { balance: number; lost: number; requests: { id: string; label: string }[]; onOpen: (id: string) => void }) {
  return (
    <div className="p-4 text-phone-ink">
      <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 p-5 text-white shadow-lg">
        <p className="text-xs font-medium uppercase tracking-wider text-white/70">{t('safe.ui.balance')}</p>
        <p className="mt-1 text-3xl font-bold tabular-nums">{rupees(balance)}</p>
        {lost > 0 && <p className="mt-1 text-xs font-bold text-red-200">−{rupees(lost)}</p>}
      </div>
      <p className="mb-2 mt-5 text-xs font-bold uppercase tracking-wider text-phone-muted">{t('safe.ui.history')}</p>
      {requests.length === 0 ? (
        <p className="rounded-lg bg-phone-card p-4 text-sm text-phone-muted">{t('safe.ui.noMessages')}</p>
      ) : (
        requests.map((r) => (
          <button key={r.id} type="button" onClick={() => onOpen(r.id)} className="mb-2 flex w-full items-center justify-between rounded-lg bg-phone-card p-3 text-start text-sm font-medium shadow-sm">
            {r.label}
            <Icon name="chevronRight" className="h-4 w-4 text-phone-muted" />
          </button>
        ))
      )}
    </div>
  );
}

export function PayRequestView({ surface, view }: { surface: Extract<Surface, { type: 'pay-request' }>; view: ViewProps }) {
  const secs = view.remainingMs === undefined ? null : Math.ceil(view.remainingMs / 1000);
  return (
    <div className="p-4 text-phone-ink">
      <div className="rounded-2xl bg-phone-card p-5 text-center shadow-md">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-lg font-bold text-indigo-700" aria-hidden>
          {surface.fromName.slice(0, 1)}
        </span>
        <p className="mt-3 text-3xl font-bold tabular-nums">{rupees(surface.amount)}</p>
        <p className="mt-1 text-xs text-phone-muted">{t(surface.noteKey, view.vars)}</p>
        <p className="mt-4 text-[15px] leading-relaxed">
          <RichText segments={surface.body} surface={surface} view={view} />
        </p>
      </div>
      {secs !== null && !view.resolved && (
        <p className="mt-3 text-center font-mono text-sm font-bold text-amber-600">
          <Lensable surface={surface} lens={surface.lens?.find((l) => l.id === 'timer')?.id} view={view}>
            <Icon name="clock" className="me-1 inline h-4 w-4 align-text-bottom" />{t('safe.ui.timer', { s: secs })}
          </Lensable>
          {view.timersOff && <span className="block text-xs font-normal text-phone-muted">{t('safe.ui.timersOff')}</span>}
        </p>
      )}
    </div>
  );
}
