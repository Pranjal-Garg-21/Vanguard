import { useEffect, useState } from 'react';
import { t } from '@/platform';
import { PIN_LENGTH, PIN_PICTURES } from '../pictures';

/** 12 big picture buttons; calls onComplete after 4 taps. */
export function PicturePin({
  onComplete,
  disabled = false,
  resetKey,
}: {
  onComplete: (pictures: string[]) => void;
  disabled?: boolean;
  /** Change this to clear the entered pictures. */
  resetKey?: unknown;
}) {
  const [picked, setPicked] = useState<string[]>([]);

  useEffect(() => setPicked([]), [resetKey]);

  const tap = (id: string) => {
    if (disabled || picked.length >= PIN_LENGTH) return;
    const next = [...picked, id];
    setPicked(next);
    if (next.length === PIN_LENGTH) onComplete(next);
  };

  return (
    <div className="space-y-5">
      <div className="flex justify-center gap-3" aria-label={`${picked.length} of ${PIN_LENGTH} pictures entered`}>
        {Array.from({ length: PIN_LENGTH }, (_, i) => (
          <span
            key={i}
            className={`flex h-12 w-12 items-center justify-center rounded-full border-2 text-xl ${
              i < picked.length ? 'border-teal-700 bg-teal-700 text-white' : 'border-slate-300 bg-white'
            }`}
          >
            {i < picked.length ? '●' : ''}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-3">
        {PIN_PICTURES.map((p) => (
          <button
            key={p.id}
            type="button"
            disabled={disabled}
            onClick={() => tap(p.id)}
            aria-label={p.id}
            className="flex aspect-square items-center justify-center rounded-2xl border border-slate-200 bg-white text-4xl shadow-sm transition active:scale-95 hover:border-teal-600 disabled:opacity-40"
          >
            {p.emoji}
          </button>
        ))}
      </div>

      <div className="flex justify-center">
        <button type="button" className="text-sm font-semibold text-teal-800 underline" onClick={() => setPicked([])}>
          {t('setup.pin.clear')}
        </button>
      </div>
    </div>
  );
}
