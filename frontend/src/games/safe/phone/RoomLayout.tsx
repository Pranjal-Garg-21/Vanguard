import type { ReactNode } from 'react';
import { t } from '@/platform';

/**
 * A true split screen, like a TryHackMe room: tasks on the left half, the
 * simulated device on the right half, both the full height of the window.
 * On a phone the device comes first and the tasks fold into a drawer.
 * `top` is an optional strip above both halves.
 */
export function RoomLayout({ panel, children, drawerLabel, top }: { panel: ReactNode; children: ReactNode; drawerLabel: string; top?: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col lg:h-dvh lg:overflow-hidden">
      {top}
      <div className="grid min-h-0 flex-1 lg:grid-cols-2">
        <section className="min-w-0 lg:overflow-y-auto lg:border-r lg:border-line">
          <div className="hidden p-6 lg:block">{panel}</div>
          <details className="m-4 rounded-xl border border-line bg-surface p-4 lg:hidden">
            <summary className="cursor-pointer text-sm font-bold text-brand">{drawerLabel}</summary>
            <div className="mt-4">{panel}</div>
          </details>
        </section>

        <section className="device-stage order-first flex min-h-0 min-w-0 flex-col lg:order-last">
          <div className="flex items-center justify-between border-b border-line bg-black/30 px-4 py-2 text-xs">
            <span className="flex items-center gap-2 font-bold text-ink-soft">
              <span className="h-2 w-2 rounded-full bg-brand" />
              {t('safe.ui.device')}
            </span>
            <span className="font-mono text-muted">{t('safe.ui.simulated')}</span>
          </div>
          <div className="flex min-h-0 flex-1 items-center justify-center p-4 lg:p-6">
            <div className="h-[min(76dvh,680px)] w-full max-w-[420px] lg:h-full lg:max-h-[860px]">{children}</div>
          </div>
        </section>
      </div>
    </div>
  );
}
