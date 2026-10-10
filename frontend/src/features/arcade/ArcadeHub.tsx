/**
 * PLACEHOLDER minigame menu so the landing page has somewhere to go.
 * P4 replaces it with the real Arcade shell; games register in games/registry.ts.
 */
import { Link } from 'react-router';
import { t } from '@/platform';
import { PixelPanel, STRIP_TREES, TileMap, VILLAGE_LEGEND } from '@/ui';

const GAMES = ['documentHunt', 'jarSplit', 'scamInbox', 'upiSimulator', 'compoundingGarden', 'stockMarket'] as const;

export function ArcadeHub() {
  return (
    <div className="min-h-dvh bg-grass text-ink">
      <main className="mx-auto max-w-md md:max-w-5xl">
        <TileMap rows={[STRIP_TREES]} legend={VILLAGE_LEGEND} />

        <div className="space-y-5 px-4 py-6 md:px-8">
          <PixelPanel>
            <h1 className="text-3xl font-bold">{t('landing.arcade.title')}</h1>
            <p className="mt-2 text-lg">{t('landing.arcade.body')}</p>
          </PixelPanel>

          <ul className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {GAMES.map((game) => (
              <li
                key={game}
                className="pixel-frame flex min-h-28 flex-col items-center justify-center gap-2 bg-parchment p-3 text-center"
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
