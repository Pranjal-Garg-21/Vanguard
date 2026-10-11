/**
 * UPI PIN pad. The PIN is held only in this component's state and handed to
 * the caller when the fourth digit is typed. A "someone is behind you" banner
 * teaches the habit of covering the keypad.
 */
import { useState } from 'react';
import { t } from '@/platform';
import { Icon } from '@/ui';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'] as const;

export function PinPad({ title, help, error, observer = true, onSubmit }: { title: string; help: string; error?: string | null; observer?: boolean; onSubmit: (pin: string, covered: boolean) => void }) {
  const [digits, setDigits] = useState('');
  const [covered, setCovered] = useState(false);

  const press = (key: (typeof KEYS)[number]) => {
    if (key === '') return;
    if (key === 'del') return setDigits((d) => d.slice(0, -1));
    const next = digits + key;
    if (next.length < 4) return setDigits(next);
    setDigits('');
    onSubmit(next, covered);
  };

  return (
    <div className="flex h-full flex-col p-4 text-phone-ink">
      <p className="text-lg font-bold">{title}</p>
      <p className="text-sm text-phone-muted">{help}</p>

      {observer && (
        <div className="mt-3 flex items-center justify-between gap-2 rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-900">
          <span className="flex items-center gap-1.5">
            <Icon name="user" className="h-4 w-4" />
            {t('safe.upi.pin.observer')}
          </span>
          <button
            type="button"
            aria-pressed={covered}
            onClick={() => setCovered((c) => !c)}
            className={`min-h-9 rounded-md px-2.5 text-xs font-bold ${covered ? 'bg-emerald-600 text-white' : 'bg-white text-phone-ink ring-1 ring-amber-300'}`}
          >
            {covered ? t('safe.upi.pin.covered') : t('safe.upi.pin.cover')}
          </button>
        </div>
      )}

      <div className="my-5 flex justify-center gap-3" role="img" aria-label={`${digits.length}/4`}>
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={`h-3.5 w-3.5 rounded-full border-2 ${i < digits.length ? 'border-phone-ink bg-phone-ink' : 'border-phone-line'}`} />
        ))}
      </div>
      {error && <p role="alert" className="mb-2 text-center text-sm font-medium text-bad">{error}</p>}

      <div className="mt-auto grid grid-cols-3 gap-2">
        {KEYS.map((key, i) =>
          key === '' ? (
            <span key={i} />
          ) : (
            <button
              key={i}
              type="button"
              onClick={() => press(key)}
              aria-label={key === 'del' ? t('safe.upi.pin.delete') : key}
              className="flex min-h-12 items-center justify-center rounded-xl bg-phone-card text-xl font-semibold shadow-sm active:bg-phone-line"
            >
              {key === 'del' ? <Icon name="back" className="h-5 w-5" /> : key}
            </button>
          ),
        )}
      </div>
    </div>
  );
}
