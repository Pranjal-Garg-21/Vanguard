/** Mini games: one card per topic, each opening that topic's games. Route: /minigames. */
import { Link, Navigate } from 'react-router';
import { ARCADE_SECTIONS } from '@/content/stages';
import { t, useActiveProfile } from '@/platform';
import { Badge, TopNav } from '@/ui';
import { SECTION_ROUTES } from './sections';

export function Minigames() {
  const { profile, loaded } = useActiveProfile();
  if (loaded && !profile) return <Navigate to="/" replace />;

  return (
    <div className="min-h-dvh bg-bg text-ink">
      <TopNav />
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        <div className="animate-rise space-y-1">
          <h1 className="text-2xl font-bold">{t('home.minigames.title')}</h1>
          <p className="max-w-2xl text-ink-soft">{t('home.minigames.subtitle')}</p>
        </div>
        <div className="grid animate-rise gap-3 sm:grid-cols-3">
          {ARCADE_SECTIONS.map((a) => {
            const to = SECTION_ROUTES[a.id];
            const body = (
              <>
                <Badge>{a.level}</Badge>
                <h2 className="font-bold">{a.name}</h2>
                <p className="flex-1 text-sm text-muted">{a.blurb}</p>
                <span className={`text-xs font-bold uppercase ${to ? 'text-brand' : 'text-muted'}`}>{to ? t('home.play') : t('home.soon')}</span>
              </>
            );
            return to ? (
              <Link key={a.id} to={to} className="flex flex-col gap-2 rounded-xl border border-line-strong bg-surface p-4 transition duration-200 hover:-translate-y-0.5 hover:border-brand hover:shadow-lg hover:shadow-brand/10">
                {body}
              </Link>
            ) : (
              <div key={a.id} className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-4">
                {body}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
