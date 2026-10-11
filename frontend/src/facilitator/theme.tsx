/**
 * The facilitator dashboard's look: deep navy hero cards with layered arcs,
 * lime calls to action, and roomy white panels on a soft grey page. Plain
 * presentational pieces; the pages decide what goes in them. Owner: P5.
 */
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Icon, type IconName } from '@/ui';

/** Lime button styling, for <button> and <Link> alike. */
export const lime =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-[#a3e635] px-5 font-bold text-[#14240b] transition hover:bg-[#b5f04f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a3e635] disabled:opacity-50';

/** Quiet secondary button on light panels. */
export const ghost =
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-[#d5dbe5] bg-white px-4 text-sm font-semibold text-[#1c2538] transition hover:border-[#1c2538] disabled:opacity-50';

const ARCS = {
  lime: ['#a3e635', '#3f6b2f', '#22382a'],
  blue: ['#38bdf8', '#1d5b8f', '#163a5f'],
} as const;

/** Three concentric arcs bleeding off the card's left edge. */
function Arcs({ tone }: { tone: keyof typeof ARCS }) {
  const [inner, mid, outer] = ARCS[tone];
  return (
    <svg aria-hidden="true" viewBox="0 0 200 200" preserveAspectRatio="xMinYMid slice" className="absolute inset-y-0 left-0 h-full w-32 sm:w-44">
      <circle cx="-10" cy="100" r="150" fill={outer} />
      <circle cx="-10" cy="100" r="115" fill={mid} />
      <circle cx="-10" cy="100" r="80" fill={inner} />
    </svg>
  );
}

/** A navy hero card: arcs on the left, a heading, a line of text and an action. */
export function Hero({
  title,
  body,
  tone = 'lime',
  children,
  className = '',
}: {
  title: ReactNode;
  body?: ReactNode;
  tone?: keyof typeof ARCS;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section className={`relative overflow-hidden rounded-xl bg-[#1c2538] text-white shadow-sm ${className}`}>
      <Arcs tone={tone} />
      <div className="relative py-8 pr-6 pl-36 sm:py-10 sm:pr-10 sm:pl-52">
        <h2 className="text-2xl font-bold tracking-tight sm:text-[1.7rem]">{title}</h2>
        {body && <div className="mt-2 max-w-xl text-[#c8d0de]">{body}</div>}
        {children && <div className="mt-5 flex flex-wrap items-center gap-3">{children}</div>}
      </div>
    </section>
  );
}

/** A roomy white panel with an icon heading. */
export function Panel({
  icon,
  title,
  subtitle,
  action,
  children,
  className = '',
}: {
  icon?: IconName;
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-xl border border-[#e3e8ef] bg-white p-6 shadow-sm sm:p-8 ${className}`}>
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {icon && (
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#e8eefb] text-[#2563eb]">
              <Icon name={icon} className="h-5 w-5" />
            </span>
          )}
          <div>
            <h2 className="text-xl font-bold text-[#1c2538]">{title}</h2>
            {subtitle && <p className="mt-1 text-sm text-[#5b6577]">{subtitle}</p>}
          </div>
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

/** A headline number. */
export function StatTile({ icon, label, value, sub, accent = '#2563eb' }: { icon: IconName; label: string; value: ReactNode; sub?: string; accent?: string }) {
  return (
    <div className="rounded-xl border border-[#e3e8ef] bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-medium text-[#5b6577]">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: `${accent}1a`, color: accent }}>
          <Icon name={icon} className="h-4 w-4" />
        </span>
        {label}
      </div>
      <p className="mt-3 text-3xl font-bold tracking-tight text-[#1c2538] tabular-nums">{value}</p>
      {sub && <p className="mt-1 text-xs text-[#7a8597]">{sub}</p>}
    </div>
  );
}

/** Small pill for counts and states. */
export function Pill({ tone = 'neutral', children }: { tone?: 'neutral' | 'good' | 'warn' | 'bad' | 'info'; children: ReactNode }) {
  const tones = {
    neutral: 'bg-[#eef1f6] text-[#3b4558]',
    good: 'bg-[#ecfccb] text-[#3f6212]',
    warn: 'bg-[#fef3c7] text-[#92400e]',
    bad: 'bg-[#fee2e2] text-[#b91c1c]',
    info: 'bg-[#e0f2fe] text-[#075985]',
  };
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold whitespace-nowrap ${tones[tone]}`}>{children}</span>;
}

/** A back link in the dashboard's style. */
export function BackLink({ to, children, relative }: { to: string; children: ReactNode; relative?: 'path' | 'route' }) {
  return (
    <Link to={to} relative={relative} className="inline-flex items-center gap-1 text-sm font-semibold text-[#2563eb] hover:underline">
      <Icon name="arrowLeft" className="h-4 w-4" />
      {children}
    </Link>
  );
}

/** Header cells and row cells for the dashboard's tables. */
export const th = 'border-b border-[#e3e8ef] px-4 py-3 text-left text-xs font-bold tracking-wider text-[#5b6577] uppercase';
export const td = 'border-b border-[#eef1f6] px-4 py-3.5 align-middle';

/** A message box with fixed light colours, so it stays readable whatever the app theme is. */
export function Notice({ children, tone = 'warn' }: { children: ReactNode; tone?: 'warn' | 'bad' | 'info' }) {
  const tones = {
    warn: { box: 'border-[#f59e0b] bg-[#fffbeb] text-[#78350f]', icon: 'alert' },
    bad: { box: 'border-[#dc2626] bg-[#fef2f2] text-[#7f1d1d]', icon: 'alert' },
    info: { box: 'border-[#2563eb] bg-[#eff6ff] text-[#1e3a8a]', icon: 'message' },
  } as const;
  const t = tones[tone];
  return (
    <div role={tone === 'bad' ? 'alert' : undefined} className={`flex items-start gap-2.5 rounded-md border-s-4 p-3 text-sm font-medium ${t.box}`}>
      <Icon name={t.icon} className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
