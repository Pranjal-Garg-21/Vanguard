/** The top bar shared by the dashboard and the practice page: brand, the three sections, and what the student has earned. */
import type { ReactNode } from 'react';
import { NavLink } from 'react-router';
import { t } from '@/platform';

const NAV = [
  { key: 'dashboard', to: '/home' },
  { key: 'learn', to: '/learn' },
  { key: 'simulations', to: '/simulations' },
  { key: 'minigames', to: '/minigames' },
] as const;

export function TopNav({ children }: { children?: ReactNode }) {
  return (
    <header className="sticky top-0 z-10 border-b border-line bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-2.5">
        <span className="flex items-center gap-2 font-bold">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-brand text-sm font-bold text-brand-ink">P</span>
          <span className="hidden sm:inline">
            Paisa<span className="text-brand">Path</span>
          </span>
        </span>

        <nav className="hidden gap-1 md:flex" aria-label="Main">
          {NAV.map(({ key, to }) => (
            <NavLink
              key={key}
              to={to}
              className={({ isActive }) =>
                `border-b-2 px-3 py-2 text-sm font-bold transition ${isActive ? 'border-brand text-brand' : 'border-transparent text-ink-soft hover:text-brand'}`
              }
            >
              {t(`home.nav.${key}`)}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-4 text-sm font-bold">{children}</div>
      </div>
    </header>
  );
}
