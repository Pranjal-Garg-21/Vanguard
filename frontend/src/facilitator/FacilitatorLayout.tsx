import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { getSupabase } from '@/platform';
import { Icon } from '@/ui';

export function FacilitatorLayout({ children, email, name }: { children: ReactNode; email?: string; name?: string }) {
  const who = name ?? email ?? '';
  return (
    <div className="theme-light min-h-dvh bg-[#eef1f6] font-[Ubuntu,ui-sans-serif,system-ui] text-[#1c2538]">
      <header className="bg-[#141b2d] text-white print:hidden">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-4 sm:px-6">
          <Link to="/facilitator" className="flex items-center gap-2.5 text-lg font-bold">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-[#2563eb] text-base font-bold text-white">M</span>
            MoneyPath
            <span className="rounded-md bg-white/10 px-2 py-0.5 text-xs font-medium tracking-wide text-[#c8d0de] uppercase">Facilitator</span>
          </Link>
          <div className="ml-auto flex items-center gap-3 text-sm">
            {who && (
              <span className="hidden items-center gap-2 text-[#c8d0de] sm:flex">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2b3754] text-xs font-bold text-white">
                  {who.slice(0, 1).toUpperCase()}
                </span>
                {who}
              </span>
            )}
            <button
              type="button"
              className="inline-flex min-h-10 items-center gap-1.5 rounded-md px-3 font-semibold text-[#c8d0de] hover:bg-white/10 hover:text-white"
              onClick={() => getSupabase()?.auth.signOut()}
            >
              <Icon name="logout" className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">{children}</main>
    </div>
  );
}
