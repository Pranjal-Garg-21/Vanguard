/**
 * Page frame for the lesson screens, matching the dashboard: the shared top bar,
 * the simulation banner, and a content width that suits a laptop. Colours come from the tokens in index.css.
 */
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { t } from '@/platform';
import { LanguageSwitcher, SimBanner } from '@/ui';
import type { Pillar } from './logic/types';

/** `pillar` picks the header title and where the logo goes; `hub` is the all-topics page. The simulation banner shows on Investing screens only. */
export function InvestShell({ children, wide = false, pillar = 'invest', hub = false }: { children: ReactNode; wide?: boolean; pillar?: Pillar; hub?: boolean }) {
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-10 border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-2.5">
          <Link to={hub ? '/learn' : `/learn/${pillar}`} className="flex items-center gap-2 font-bold">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-brand text-sm font-bold text-brand-ink" aria-hidden="true">
              P
            </span>
            <span>
              Paisa<span className="text-brand">Path</span>
            </span>
            <span className="hidden font-medium text-muted sm:inline">{hub ? t('learn.title') : t(`learn.pillar.${pillar}.name`)}</span>
          </Link>
          <LanguageSwitcher className="ms-auto" />
          <Link to="/learn" className=" text-sm font-bold text-ink-soft hover:text-brand">
            {t('learn.all')}
          </Link>
          <Link to="/home" className="text-sm font-bold text-ink-soft hover:text-brand">
            {t('investui.list.home')}
          </Link>
        </div>
      </header>
      <main className={`mx-auto space-y-4 px-4 py-6 ${wide ? 'max-w-6xl' : 'max-w-3xl'}`}>
        {pillar === 'invest' && !hub && <SimBanner />}
        {children}
      </main>
    </div>
  );
}
