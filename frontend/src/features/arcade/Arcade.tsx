/**
 * Arcade shell: one tile per pillar section, with lock state. Route: /arcade. Owner: P4.
 *
 * Everyday Money and Stay Safe are open from the start. Investing opens once S3 (Save & Track) is passed, or when a
 * facilitator opens it, because you invest from savings after an emergency fund. The lock reason says so, so the
 * unlock order teaches it, and "Open anyway" keeps it usable for a facilitator demo or a curious student.
 */
import { Link } from 'react-router';
import { Badge, Button, Card, LanguageSwitcher, LockedTile } from '@/ui';
import { t } from '@/platform';
import { facilitatorOpened, isStagePassed } from './deps';

interface Section {
  id: 'everyday' | 'safe' | 'investing';
  level: 'easy' | 'medium' | 'hard';
  /** Where the section page lives. Null until its owner adds one. */
  route: string | null;
  /** Locked until this stage is passed (or a facilitator opens the section). */
  unlockAfter?: 'S3';
}

const SECTIONS: Section[] = [
  { id: 'everyday', level: 'easy', route: '/arcade/everyday' },
  { id: 'safe', level: 'medium', route: '/safe' },
  { id: 'investing', level: 'hard', route: '/learn/invest', unlockAfter: 'S3' },
];

export function Arcade() {
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-10 border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-2.5">
          <span className="flex items-center gap-2 font-bold">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-brand text-sm font-bold text-brand-ink" aria-hidden="true">
              P
            </span>
            <span>
              Money<span className="text-brand">Path</span>
            </span>
          </span>
          <LanguageSwitcher className="ms-auto" />
          <Link to="/home" className=" text-sm font-bold text-ink-soft hover:text-brand">
            {t('arcade.back')}
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl space-y-4 px-4 py-6">
      <div className="space-y-1 pb-1">
        <h1 className="text-2xl font-bold">{t('arcade.title')}</h1>
        <p className="max-w-3xl text-ink-soft">{t('arcade.subtitle')}</p>
      </div>

      <ul className="grid gap-4 md:grid-cols-3">
        {SECTIONS.map((s) => {
          const locked = !!s.unlockAfter && !isStagePassed(s.unlockAfter) && !facilitatorOpened(s.id);
          const name = t(`arcade.${s.id}.name`);
          const blurb = t(`arcade.${s.id}.blurb`);
          if (locked && s.route) {
            return (
              <li key={s.id}>
                <LockedTile
                  title={name}
                  reason={t('arcade.lockedReason')}
                  action={
                    <Link to={s.route}>
                      <Button variant="secondary">{t('arcade.openAnyway')}</Button>
                    </Link>
                  }
                />
              </li>
            );
          }
          return (
            <li key={s.id}>
              <Card className="flex h-full flex-col gap-3">
                <Badge>{t(`arcade.level.${s.level}`)}</Badge>
                <h2 className="text-lg font-bold">{name}</h2>
                <p className="flex-1 text-sm text-ink-soft">{blurb}</p>
                {s.route ? (
                  <Link to={s.route}>
                    <Button className="w-full">{t('arcade.open')}</Button>
                  </Link>
                ) : (
                  <Button variant="secondary" className="w-full" disabled>
                    {t('arcade.comingSoon')}
                  </Button>
                )}
              </Card>
            </li>
          );
        })}
      </ul>
      </main>
    </div>
  );
}
