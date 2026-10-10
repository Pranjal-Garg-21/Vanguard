import type { ReactNode } from 'react';
import { Button, Card } from '@/ui';
import { Icon } from '../../phone/Icon';

/** A full-width card for the rule and refund chapters. */
export function InfoCard({ title, rule, body, points, cta, onNext }: { title: string; rule?: string; body: string; points?: string[]; cta: string; onNext: () => void }) {
  return (
    <div className="mx-auto max-w-xl space-y-5 p-4 pt-10">
      <Card className="space-y-4">
        <p className="text-xs font-bold uppercase tracking-[0.15em] text-brand">{title}</p>
        {rule && <h1 className="text-3xl font-bold leading-tight text-ink">{rule}</h1>}
        <p className="text-ink-soft">{body}</p>
        {points && (
          <ul className="space-y-2">
            {points.map((p) => (
              <li key={p} className="flex items-start gap-2 text-sm text-ink-soft">
                <Icon name="check" className="mt-0.5 h-4 w-4 text-brand" />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Button size="lg" className="w-full" onClick={onNext}>{cta}</Button>
    </div>
  );
}

export const Section = ({ children }: { children: ReactNode }) => <div className="mx-auto max-w-5xl p-4">{children}</div>;
