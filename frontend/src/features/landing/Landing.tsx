/**
 * The first screen: a tile-based village with one door into the app.
 *
 * It used to jump straight to Paisapur or the Arcade. Both now live on the
 * dashboard alongside the lessons and Stay Safe, so this leads there and the
 * dashboard is the one place that knows what a student can do next.
 *
 * Brand-new players go through setup and the starting-point questions first.
 */
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { getSetting, listProfiles, loadActiveProfile, t, useActiveProfile } from '@/platform';
import { LANDING_SCENE, PixelButton, STRIP_TREES, TileMap, VILLAGE_LEGEND } from '@/ui';

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
    if (!active) {
      // New phone: create a player. A shared phone: pick one.
      navigate((await listProfiles()).length ? '/who' : '/welcome');
      return;
    }
    const baseline = await getSetting(active.pid, 'baseline');
    if (baseline) navigate('/home');
    else navigate('/onboarding', { state: { next: '/home' } });
  }

  return (
    <div className="flex min-h-dvh flex-col bg-grass text-ink">
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col md:max-w-6xl md:flex-row md:items-center md:gap-10 md:px-8">
        {/* The village is a tile map, so it scales with the screen. */}
        <div className="md:w-1/2">
          <TileMap rows={LANDING_SCENE} legend={VILLAGE_LEGEND} label={t('landing.sceneLabel')} />
        </div>

        <div className="flex flex-1 flex-col px-4 pb-6 md:w-1/2 md:py-10">
          <header className="-mt-2 text-center">
            <h1 className="pixel-text-shadow text-5xl font-bold tracking-wide text-gold">{t('landing.title')}</h1>
            <p className="pixel-frame mx-auto mt-4 max-w-xs bg-parchment px-3 py-2 text-lg">{t('landing.tagline')}</p>
            {profile && <p className="mt-4 text-lg font-bold">{t('landing.welcomeBack', { name: profile.displayName })}</p>}
          </header>

          <nav className="mt-8 flex flex-col gap-5" aria-label="Main menu">
            <PixelButton className="w-full flex-col items-start! gap-1 py-4 text-start" disabled={busy} onClick={() => void enter()}>
              <span className="text-2xl">{t(profile ? 'landing.enter.back' : 'landing.enter.title')}</span>
              <span className="text-base font-normal">{t('landing.enter.body')}</span>
            </PixelButton>
          </nav>

          <p className="mt-auto pt-8 text-center">
            <Link className="bg-parchment px-3 py-2 text-sm font-bold underline" to="/facilitator">
              {t('landing.facilitator')}
            </Link>
          </p>
        </div>

      </main>

      <div className="mx-auto w-full max-w-md md:max-w-6xl">
        <TileMap rows={[STRIP_TREES]} legend={VILLAGE_LEGEND} />
      </div>
    </div>
  );
}
