/** Small building blocks shared by the lab widgets, so every lab looks and behaves the same. */
import type { ReactNode } from 'react';

export function LabSlider(props: {
  id: string;
  label: string;
  /** What to show beside the label, already formatted (e.g. "8%"). */
  shown: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div>
      <div className="mb-1 flex justify-between gap-2 text-sm">
        <label htmlFor={props.id} className="text-ink-soft">
          {props.label}
        </label>
        <span className="font-bold text-brand">{props.shown}</span>
      </div>
      <input
        id={props.id}
        type="range"
        className="h-3 w-full cursor-pointer accent-brand"
        min={props.min}
        max={props.max}
        step={props.step}
        value={props.value}
        onChange={(e) => props.onChange(Number(e.target.value))}
      />
    </div>
  );
}

/** One labelled number in a results panel. */
export function Readout({ label, value, tone = 'plain' }: { label: string; value: ReactNode; tone?: 'plain' | 'good' | 'bad' }) {
  const colour = tone === 'good' ? 'text-brand' : tone === 'bad' ? 'text-bad' : 'text-ink';
  return (
    <div className="rounded-lg bg-surface-2 p-3">
      <div className="text-xs text-ink-soft">{label}</div>
      <div className={`text-xl font-bold ${colour}`}>{value}</div>
    </div>
  );
}

/** A horizontal bar scaled 0..1 of its track. */
export function LabBar({ label, value, fraction, colour = 'bg-brand' }: { label: string; value: string; fraction: number; colour?: string }) {
  return (
    <div>
      <div className="mb-0.5 flex justify-between text-xs text-ink-soft">
        <span>{label}</span>
        <span className="font-bold text-ink">{value}</span>
      </div>
      <div className="h-3 w-full rounded-full bg-surface-3">
        <div className={`h-3 rounded-full transition-all ${colour}`} style={{ width: `${Math.min(100, Math.max(1.5, fraction * 100))}%` }} />
      </div>
    </div>
  );
}
