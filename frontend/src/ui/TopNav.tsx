/**
 * The app's top bar, shared by every signed-in page: the brand on the left, the four sections as tabs, and a slot on
 * the right for whatever the page wants there (streak, points, the player's avatar). Styled after TryHackMe's:
 * a dark bar, a lime underline on the current tab, and a soft hover on the others.
 */
import type { ReactNode } from 'react';
import { Link, NavLink } from 'react-router';
import { t } from '@/platform';
import { Mascot } from './Mascot';

const TABS = [
  { key: 'dashboard', to: '/home' },
  { key: 'learn', to: '/learn' },
  { key: 'simulations', to: '/simulations' },
  { key: 'minigames', to: '/minigames' },
] as const;

export function TopNav({ children }: { children?: ReactNode }) {
  return (
    <>
    <Mascot />
    <header className="sticky top-0 z-20 border-b border-line bg-surface/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-stretch gap-2 px-4 sm:gap-6">
        <Link to="/home" className="flex shrink-0 items-center gap-2 font-bold" aria-label="PaisaPath">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-brand text-sm font-bold text-brand-ink" aria-hidden="true">
            P
          </span>
          <span className="hidden sm:inline">
            Paisa<span className="text-brand">Path</span>
          </span>
        </Link>

        <nav className="flex min-w-0 flex-1 items-stretch gap-1 overflow-x-auto" aria-label="Main">
          {TABS.map(({ key, to }) => (
            <NavLink
              key={key}
              to={to}
              className={({ isActive }) =>
                `flex items-center border-b-2 px-3 text-sm font-bold whitespace-nowrap transition-colors ${
                  isActive ? 'border-brand text-brand' : 'border-transparent text-ink-soft hover:bg-surface-2 hover:text-ink'
                }`
              }
            >
              {t(`home.nav.${key}`)}
            </NavLink>
          ))}
        </nav>

        {children && <div className="flex shrink-0 items-center gap-4 text-sm font-bold">{children}</div>}
      </div>
    </header>
    </>
  );
}
