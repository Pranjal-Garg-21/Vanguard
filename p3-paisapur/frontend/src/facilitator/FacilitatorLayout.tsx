import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { getSupabase } from '@/platform';

export function FacilitatorLayout({ children, email, name }: { children: ReactNode; email?: string; name?: string }) {
  return (
    <div className="min-h-dvh bg-bg">
      <header className="border-b border-line bg-surface print:hidden">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3">
          <Link to="/facilitator" className="flex items-center gap-2 font-extrabold text-ink">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-brand text-sm font-bold text-brand-ink">P</span>
            PaisaPath <span className="font-medium text-muted">Facilitator</span>
          </Link>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="hidden text-ink-soft sm:inline">{name ?? email}</span>
            <button
              type="button"
              className="min-h-10 rounded-lg px-3 font-semibold text-brand hover:bg-brand/10"
              onClick={() => getSupabase()?.auth.signOut()}
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
