/**
 * Page frame for the Investing ABC screens: a white top bar like the facilitator dashboard's,
 * a soft teal page background, the simulation banner, and a content width that suits a laptop.
 */
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { t } from '@/platform';
import { SimBanner } from '@/ui';

export function InvestShell({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className="min-h-dvh bg-gradient-to-b from-teal-50 to-white">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <Link to="/learn/invest" className="flex items-center gap-2 font-extrabold text-slate-900">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-700 text-sm font-bold text-white" aria-hidden="true">
              P
            </span>
            PaisaPath <span className="font-medium text-slate-500">{t('investui.list.title')}</span>
          </Link>
        </div>
      </header>
      <main className={`mx-auto space-y-4 px-4 py-6 ${wide ? 'max-w-6xl' : 'max-w-3xl'}`}>
        <SimBanner />
        {children}
      </main>
    </div>
  );
}
