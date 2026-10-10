/**
 * The phone frame: status bar, notification banner, content area and a bottom
 * bar (Back / Home / Scam Lens). It is presentational. On a small screen it
 * drops the bezel and fills the width, because students already hold a phone.
 */
import type { ReactNode } from 'react';
import { t } from '@/platform';
import { Icon } from './Icon';

export function formatClock(startTime: string, nowMs: number, rate = 1 / 60): string {
  const [h = '0', m = '0'] = startTime.split(':');
  const total = (Number(h) * 60 + Number(m) + Math.floor((nowMs / 1000) * rate)) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

export type PhoneShellProps = {
  clock: string;
  lensOn: boolean;
  onToggleLens: () => void;
  onBack?: () => void;
  onHome?: () => void;
  banner?: ReactNode;
  children: ReactNode;
  /** Hide the bottom bar (compact single-message mode). */
  compact?: boolean;
  /** Fill the height like a full room but without the Back / Home / Lens bar. */
  bare?: boolean;
  /** Changes when the screen changes, so the new screen starts at the top. */
  scrollKey?: string;
};

export function PhoneShell({ clock, lensOn, onToggleLens, onBack, onHome, banner, children, compact, bare, scrollKey }: PhoneShellProps) {
  const full = !compact;
  return (
    <div className={`mx-auto w-full max-w-[420px] ${full ? 'h-full' : ''}`}>
      <div className={`${full ? 'h-full' : ''} lg:rounded-[2.5rem] lg:border-[10px] lg:border-phone-bezel lg:bg-phone-bezel lg:shadow-[0_0_0_2px_var(--color-line-strong),0_30px_60px_-20px_rgb(0_0_0/0.7)]`}>
      <div className={`relative flex flex-col overflow-hidden rounded-2xl bg-phone-screen text-phone-ink lg:rounded-[1.8rem] ${compact ? 'h-[460px]' : 'h-full min-h-[480px]'} ${lensOn ? 'ring-2 ring-brand' : ''}`}>
        <div className="flex items-center justify-between bg-phone-card px-4 py-1.5 text-xs font-semibold text-phone-ink" aria-label={t('safe.ui.clock')}>
          <span className="tabular-nums">{clock}</span>
          <span aria-hidden className="flex items-center gap-1.5 text-phone-muted"><Icon name="signal" className="h-3.5 w-3.5" /><Icon name="battery" className="h-4 w-4" /></span>
        </div>
        {banner}
        <div key={scrollKey} className="relative min-h-0 flex-1 overflow-y-auto">{children}</div>
        {!compact && !bare && (
          <nav className="flex items-center justify-between border-t border-phone-line bg-phone-card px-3 py-2">
            <button type="button" onClick={onBack} disabled={!onBack} className="min-h-11 min-w-11 rounded-lg text-sm font-semibold text-phone-muted disabled:opacity-30" aria-label={t('safe.ui.back')}>
              <Icon name="back" className="mx-auto h-5 w-5" />
            </button>
            <button type="button" onClick={onHome} disabled={!onHome} className="min-h-11 min-w-11 rounded-lg text-sm font-semibold text-phone-muted disabled:opacity-30" aria-label={t('safe.ui.home')}>
              <Icon name="home" className="mx-auto h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={onToggleLens}
              aria-pressed={lensOn}
              className={`flex min-h-11 items-center gap-1.5 rounded-full px-4 text-sm font-bold transition ${lensOn ? 'bg-brand text-brand-ink' : 'bg-phone-bubble text-phone-ink hover:bg-phone-line'}`}
            >
              <Icon name="search" className="h-4 w-4" /> {t('safe.ui.lens')}
            </button>
          </nav>
        )}
      </div>
      </div>
    </div>
  );
}
