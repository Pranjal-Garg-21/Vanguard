/**
 * Page frame for the Investing ABC screens, matching the dashboard: a dark top bar with the brand mark,
 * the simulation banner, and a content width that suits a laptop. Colours come from the tokens in index.css.
 */
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { t } from '@/platform';
import { SimBanner } from '@/ui';

export function InvestShell({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-10 border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-2.5">
          <Link to="/learn/invest" className="flex items-center gap-2 font-bold">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-brand text-sm font-bold text-brand-ink" aria-hidden="true">
              P
            </span>
            <span>
              Money<span className="text-brand">Path</span>
            </span>
            <span className="hidden font-medium text-muted sm:inline">{t('investui.list.title')}</span>
          </Link>
          <Link to="/home" className="ms-auto text-sm font-bold text-ink-soft hover:text-brand">
            {t('investui.list.home')}
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
