/**
 * A small helper in the corner of the page: Professor Arth, drawn from the same pixel sprite as in the life game, on a
 * navy tile with a lime edge to match the app. Press him for a short tip about the page you are on. He is small,
 * fixed to the corner, and the tip closes with one press.
 */
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router';
import { prefersReducedMotion, t } from '@/platform';
import { RPG_URBAN } from './tiles';

/** Which tip belongs to which part of the app. */
function areaOf(path: string): string {
  if (path.startsWith('/simulations')) return 'simulations';
  if (path.startsWith('/minigames') || path.startsWith('/arcade')) return 'minigames';
  if (path.startsWith('/learn/') && path.split('/').length > 3) return 'lesson';
  if (path.startsWith('/learn')) return 'learn';
  if (path.startsWith('/safe')) return 'safe';
  return 'home';
}

/** The guide is Professor Arth's sprite from the life game (character 2 of the town sheet), shown crisp at any size. */
const GUIDE_CHAR = 2;
const DIR_COLUMN_DOWN = 24;

export function MascotFace({ size = 48 }: { size?: number }) {
  const [step, setStep] = useState(false);
  // A slow two-frame shuffle, so the guide looks alive. Still for anyone who asked for less movement.
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const id = window.setInterval(() => setStep((v) => !v), 650);
    return () => window.clearInterval(id);
  }, []);
  const row = GUIDE_CHAR * 3 + (step ? 1 : 0);
  return (
    <span
      aria-hidden="true"
      className="inline-block"
      style={{
        width: size,
        height: size,
        backgroundImage: `url(${RPG_URBAN.url})`,
        backgroundSize: `${RPG_URBAN.columns * size}px ${RPG_URBAN.rows * size}px`,
        backgroundPosition: `-${DIR_COLUMN_DOWN * size}px -${row * size}px`,
        imageRendering: 'pixelated',
      }}
    />
  );
}

export function Mascot() {
  const [open, setOpen] = useState(false);
  const area = areaOf(useLocation().pathname);

  return (
    <div className="fixed end-4 bottom-4 z-30 flex max-w-[16rem] flex-col items-end gap-2 print:hidden">
      {open && (
        <p role="status" className="border-2 border-brand bg-surface-2 p-3 font-pixel text-sm leading-snug text-ink shadow-[4px_4px_0_rgb(0_0_0/0.35)]">
          <span className="mb-1 block text-xs font-bold text-brand">{t('mascot.name')}</span>
          {t(`mascot.tip.${area}`)}
        </p>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={t(open ? 'mascot.close' : 'mascot.open')}
        className="border-2 border-brand bg-surface p-1 shadow-[4px_4px_0_rgb(0_0_0/0.35)] transition hover:-translate-y-0.5 hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        <MascotFace size={48} />
      </button>
    </div>
  );
}
