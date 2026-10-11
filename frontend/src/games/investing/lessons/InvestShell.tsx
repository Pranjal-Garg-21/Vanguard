/**
 * Page frame for the lesson screens, matching the dashboard: the shared top bar,
 * the simulation banner, and a content width that suits a laptop. Colours come from the tokens in index.css.
 */
import type { ReactNode } from 'react';
import { SimBanner, TopNav } from '@/ui';
import type { Pillar } from './logic/types';

/** `pillar` picks the header title and where the logo goes; `hub` is the all-topics page. The simulation banner shows on Investing screens only. */
export function InvestShell({ children, wide = false, pillar = 'invest', hub = false }: { children: ReactNode; wide?: boolean; pillar?: Pillar; hub?: boolean }) {
  return (
    <div className="min-h-dvh">
      <TopNav />
      <main className={`mx-auto space-y-4 px-4 py-6 ${wide ? 'max-w-6xl' : 'max-w-3xl'}`}>
        {pillar === 'invest' && !hub && <SimBanner />}
        {children}
      </main>
    </div>
  );
}
