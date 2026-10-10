import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { getSupabase } from '@/platform';

export function FacilitatorLayout({ children, email, name }: { children: ReactNode; email?: string; name?: string }) {
  return (
    <div className="min-h-dvh bg-slate-50">
      <header className="border-b border-slate-200 bg-white print:hidden">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3">
          <Link to="/facilitator" className="flex items-center gap-2 font-extrabold text-slate-900">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-700 text-lg">🪙</span>
            PaisaPath <span className="font-medium text-slate-500">Facilitator</span>
          </Link>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="hidden text-slate-600 sm:inline">{name ?? email}</span>
            <button
              type="button"
              className="min-h-10 rounded-lg px-3 font-semibold text-teal-800 hover:bg-teal-50"
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
