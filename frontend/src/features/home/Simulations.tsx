/**
 * Simulations: the Stay Safe simulators and the Investing simulations (time machine, stock market, mutual fund and the rest)
 * on one page. Route: /simulations. The lessons live under Learn, the quick games under Mini games.
 */
import type { ReactNode } from 'react';
import { Link, Navigate } from 'react-router';
import { t, useActiveProfile } from '@/platform';
import section from '@/content/scenarios/invest/section.json';
import { SIMULATORS } from '@/games/safe/catalog';
import { CustomCard } from '@/games/safe/CustomHub';
import type { SectionGame } from '@/games/investing/lessons/logic/section';
import { Icon, SectionLabel, type IconName, TopNav } from '@/ui';

const INVEST_GAMES = section.games as SectionGame[];

export function Simulations() {
  const { profile, loaded } = useActiveProfile();
  if (loaded && !profile) return <Navigate to="/" replace />;

  return (
    <div className="min-h-dvh bg-bg text-ink">
      <TopNav />
      <main className="mx-auto max-w-6xl space-y-8 px-4 py-6">
        <div className="animate-rise space-y-1">
          <h1 className="text-2xl font-bold">{t('home.simulations.title')}</h1>
          <p className="max-w-2xl text-ink-soft">{t('home.simulations.subtitle')}</p>
        </div>

        {/* The facilitator's own scenarios for this class; the card only shows when there are some. */}
        <CustomCard />

        <Group title={t('home.simulations.safe')}>
          {SIMULATORS.map((s) => (
            <Tile key={s.id} to={`/safe/${s.id}`} icon={s.icon} title={t(s.titleKey)} body={t(s.blurbKey)} />
          ))}
        </Group>

        <Group title={t('home.simulations.invest')}>
          {INVEST_GAMES.map((g) => (
            <Tile key={g.id} to={g.route} icon="rocket" title={t(g.titleKey)} body={t(g.hintKey)} />
          ))}
        </Group>
      </main>
    </div>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="animate-rise space-y-3">
      <SectionLabel>{title}</SectionLabel>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function Tile({ to, icon, title, body }: { to: string; icon: IconName; title: string; body: string }) {
  return (
    <Link
      to={to}
      className="flex items-start gap-4 rounded-xl border border-line-strong bg-surface p-4 transition duration-200 hover:-translate-y-0.5 hover:border-brand hover:shadow-lg hover:shadow-brand/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-brand/15 text-brand">
        <Icon name={icon} className="h-6 w-6" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-bold">{title}</span>
        <span className="mt-0.5 block text-sm text-muted">{body}</span>
      </span>
      <Icon name="chevronRight" className="mt-3 h-5 w-5 text-muted" />
    </Link>
  );
}
