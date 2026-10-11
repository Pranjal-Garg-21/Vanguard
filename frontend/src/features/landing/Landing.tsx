/**
 * The first screen: one door into the app.
 *
 * Both Paisapur and the Arcade now live on the dashboard alongside the lessons
 * and Stay Safe, so this leads there. The starting-point questions are not
 * asked here; they come the first time a student begins the life game.
 */
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { listProfiles, loadActiveProfile, t, useActiveProfile } from '@/platform';
import { Button, Icon, type IconName } from '@/ui';

const FEATURES: { icon: IconName; key: string }[] = [
  { icon: 'rocket', key: 'life' },
  { icon: 'book', key: 'learn' },
  { icon: 'shield', key: 'safe' },
];

export function Landing() {
  const navigate = useNavigate();
  const { profile } = useActiveProfile();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void loadActiveProfile();
  }, []);

  async function enter() {
    setBusy(true);
    const active = await loadActiveProfile();
    if (active) navigate('/home');
    // New phone: create a player. A shared phone: pick one.
    else navigate((await listProfiles()).length ? '/who' : '/welcome');
  }

  return (
    <div className="flex min-h-dvh flex-col bg-bg text-ink">
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 py-10">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand text-2xl font-bold text-brand-ink" aria-hidden="true">
            P
          </span>
          <span className="text-2xl font-bold">
            Money<span className="text-brand">Path</span>
          </span>
        </div>

        <h1 className="mt-8 text-4xl font-extrabold tracking-tight md:text-5xl">{t('landing.title')}</h1>
        <p className="mt-3 max-w-xl text-xl text-ink-soft">{t('landing.tagline')}</p>
        {profile && <p className="mt-4 text-lg font-bold text-brand">{t('landing.welcomeBack', { name: profile.displayName })}</p>}

        <div className="mt-8 max-w-sm">
          <Button size="lg" className="w-full" disabled={busy} onClick={() => void enter()}>
            {t(profile ? 'landing.enter.back' : 'landing.enter.title')}
            <Icon name="arrowRight" className="h-5 w-5" />
          </Button>
        </div>

        <ul className="mt-12 grid gap-3 sm:grid-cols-3">
          {FEATURES.map((f) => (
            <li key={f.key} className="rounded-xl border border-line-strong bg-surface p-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand/15 text-brand">
                <Icon name={f.icon} className="h-5 w-5" />
              </span>
              <p className="mt-3 font-bold">{t(`landing.feature.${f.key}.title`)}</p>
              <p className="mt-1 text-sm text-muted">{t(`landing.feature.${f.key}.body`)}</p>
            </li>
          ))}
        </ul>
      </main>

      <p className="pb-6 text-center">
        <Link className="text-sm font-bold text-ink-soft underline hover:text-brand" to="/facilitator">
          {t('landing.facilitator')}
        </Link>
      </p>
    </div>
  );
}
