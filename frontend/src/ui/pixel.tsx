/**
 * Pixel-art "farm village" building blocks used by the landing page and the
 * baseline questions. Plain presentational components; owner: P4.
 */
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type PixelTone = 'wood' | 'grass' | 'parchment';

const TONES: Record<PixelTone, string> = {
  wood: 'bg-wood text-parchment hover:bg-wood-dark',
  grass: 'bg-grass text-ink hover:bg-grass-dark hover:text-parchment',
  parchment: 'bg-parchment text-ink hover:bg-parchment-dark',
};

export function PixelButton({
  tone = 'wood',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: PixelTone }) {
  return (
    <button
      className={`pixel-frame inline-flex min-h-14 items-center justify-center gap-3 px-5 py-3 text-lg font-bold transition-transform active:translate-y-1 focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-gold disabled:cursor-not-allowed disabled:opacity-50 ${TONES[tone]} ${className}`}
      {...props}
    />
  );
}

/** A parchment sign: the container for questions and menu text. */
export function PixelPanel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`pixel-raised bg-parchment p-5 text-ink ${className}`}>
      <div className="border-4 border-parchment-dark p-4">{children}</div>
    </div>
  );
}

/** A row of blocks that fill up as the player moves through a set of steps. */
export function PixelProgress({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex gap-1" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={current}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={`h-3 flex-1 border-2 border-ink ${i < current ? 'bg-gold' : 'bg-parchment-dark'}`} />
      ))}
    </div>
  );
}

/** A selectable answer: a big emoji, a label, and a clear selected state. */
export function PixelOption({
  emoji,
  label,
  selected,
  onClick,
  multi = false,
}: {
  emoji: string;
  label: string;
  selected: boolean;
  onClick: () => void;
  multi?: boolean;
}) {
  return (
    <button
      type="button"
      role={multi ? 'checkbox' : 'radio'}
      aria-checked={selected}
      onClick={onClick}
      className={`pixel-frame flex min-h-16 w-full items-center gap-4 px-4 py-3 text-left text-lg font-semibold transition-transform active:translate-y-1 focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-gold ${
        selected ? 'bg-gold text-ink' : 'bg-white text-ink hover:bg-parchment-dark'
      }`}
    >
      <span className="text-3xl" aria-hidden="true">
        {emoji}
      </span>
      <span className="flex-1">{label}</span>
      <span aria-hidden="true" className="text-2xl">
        {selected ? '✔' : ''}
      </span>
    </button>
  );
}
