import type { ReactNode } from 'react';

/**
 * Two columns on a desktop (mission panel left, phone right). On a phone the
 * panel folds into a "Missions" drawer above the phone so the phone is first.
 */
export function RoomLayout({ panel, children, drawerLabel }: { panel: ReactNode; children: ReactNode; drawerLabel: string }) {
  return (
    <div className="mx-auto grid max-w-6xl gap-6 p-4 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start lg:p-8">
      <details className="min-w-0 rounded-xl border border-line bg-surface p-4 lg:hidden">
        <summary className="cursor-pointer text-sm font-bold text-brand">{drawerLabel}</summary>
        <div className="mt-4">{panel}</div>
      </details>
      <aside className="hidden lg:order-1 lg:block">{panel}</aside>
      <div className="min-w-0 lg:order-2 lg:sticky lg:top-6">{children}</div>
    </div>
  );
}
