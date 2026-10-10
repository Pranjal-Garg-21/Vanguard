/**
 * TEMPORARY student home so the app has something to land on.
 * P2 replaces it with the real dashboard in features/home and updates the
 * /home route in router.tsx.
 */
import { useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { loadActiveProfile, refreshSyncStatus, switchPlayer, t, useActiveProfile, useSyncStatus } from '@/platform';
import { Badge, Spinner } from '@/ui';
import { avatarEmoji } from '@/features/setup';

const TILES = [
  { key: 'lifepath', icon: '🛤️', tone: 'from-teal-600 to-teal-800', big: true },
  { key: 'arcade', icon: '🎮', tone: 'from-indigo-500 to-indigo-700' },
  { key: 'quickplay', icon: '⚡', tone: 'from-amber-500 to-orange-600' },
  { key: 'progress', icon: '🏅', tone: 'from-emerald-500 to-emerald-700' },
] as const;

export function StudentHome() {
  const navigate = useNavigate();
  const { profile, loaded } = useActiveProfile();
  const sync = useSyncStatus();

  useEffect(() => {
    if (!loaded) void loadActiveProfile();
    void refreshSyncStatus();
  }, [loaded]);

  if (!loaded) return <Spinner />;
  if (!profile) return <Navigate to="/" replace />;

  const syncLabel = sync.state === 'pending' ? t('home.sync.pending', { count: sync.pending }) : t(`home.sync.${sync.state}`);

  return (
    <div className="min-h-dvh bg-slate-50">
      <main className="mx-auto max-w-md space-y-5 px-4 py-6">
        <header className="flex items-center gap-3">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-3xl shadow-sm">{avatarEmoji(profile.avatarId)}</span>
          <div className="flex-1">
            <h1 className="text-2xl font-extrabold">{t('home.greeting', { name: profile.displayName })}</h1>
            <Badge tone={sync.state === 'synced' ? 'good' : 'neutral'}>{syncLabel}</Badge>
          </div>
          <button
            type="button"
            className="min-h-11 rounded-xl px-3 text-sm font-semibold text-teal-800 hover:bg-teal-50"
            onClick={async () => {
              await switchPlayer();
              navigate('/who');
            }}
          >
            {t('home.switchPlayer')}
          </button>
        </header>

        <div className="grid grid-cols-2 gap-3">
          {TILES.map((tile) => (
            <div
              key={tile.key}
              className={`relative rounded-2xl bg-gradient-to-br ${tile.tone} p-4 text-white shadow-sm ${'big' in tile ? 'col-span-2 min-h-40' : 'min-h-36'}`}
            >
              <span className="text-4xl">{tile.icon}</span>
              <h2 className="mt-2 text-lg font-bold">{t(`home.${tile.key}.title`)}</h2>
              <p className="text-sm text-white/85">{t(`home.${tile.key}.body`)}</p>
              <span className="absolute top-3 right-3 rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold">{t('home.comingSoon')}</span>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <h2 className="font-bold text-rose-900">🆘 {t('home.help.title')}</h2>
          <p className="text-sm text-rose-900/80">{t('home.help.body')}</p>
        </div>
      </main>
    </div>
  );
}
