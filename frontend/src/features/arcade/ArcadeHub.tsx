/**
 * The Arcade menu: the second door onto the same mini-games the story plays
 * (§3.1, §3.2). Reached from the landing page and from the arcade cabinet in
 * town. Owner: P4 (shell) · P3 (Everyday Money).
 *
 * Nothing here changes the player's money — §6.4 says effects are not applied
 * outside `lifepath` mode, and the section page says so to the student too.
 */
import { Link } from 'react-router';
import { t } from '@/platform';
import { PixelPanel, STRIP_TREES, TileMap, VILLAGE_LEGEND } from '@/ui';
import { listUiGames } from '@/games/adapter';

/** Pillars whose games are not built yet; shown so the shape is visible. */
const SOON = ['scamInbox', 'upiSimulator', 'compoundingGarden', 'stockMarket'] as const;

export function ArcadeHub() {
  const games = listUiGames();

  return (
    <div className="min-h-dvh bg-grass text-ink">
      <main className="mx-auto max-w-md md:max-w-5xl">
        <TileMap rows={[STRIP_TREES]} legend={VILLAGE_LEGEND} />

        <div className="space-y-5 px-4 py-6 md:px-8">
          <PixelPanel>
            <h1 className="text-3xl font-bold">{t('landing.arcade.title')}</h1>
            <p className="mt-2 text-lg">{t('landing.arcade.body')}</p>
          </PixelPanel>

          <h2 className="text-2xl font-bold">{t('arcade.everyday.title')}</h2>
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {games.map((game) => (
              <li key={game.id}>
                <Link
                  className="pixel-frame flex min-h-28 flex-col justify-center gap-1 bg-parchment p-4"
                  to="/arcade/everyday"
                >
                  <span className="text-lg font-bold">{t(`arcade.game.${game.id}.title`)}</span>
                  <span className="text-sm">{t(`arcade.game.${game.id}.blurb`)}</span>
                </Link>
              </li>
            ))}
          </ul>

          <h2 className="text-2xl font-bold">{t('landing.arcade.more')}</h2>
          <ul className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {SOON.map((game) => (
              <li
                key={game}
                className="pixel-frame flex min-h-24 flex-col items-center justify-center gap-2 bg-parchment/70 p-3 text-center"
              >
                <span className="font-bold">{t(`landing.arcade.games.${game}`)}</span>
                <span className="bg-ink px-2 text-xs text-parchment">{t('landing.arcade.soon')}</span>
              </li>
            ))}
          </ul>

          <Link className="inline-block bg-parchment px-3 py-2 font-bold underline" to="/">
            ← {t('landing.arcade.back')}
          </Link>
        </div>
      </main>
    </div>
  );
}
