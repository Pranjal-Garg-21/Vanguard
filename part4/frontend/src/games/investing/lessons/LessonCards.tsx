/** The cards a lesson is made of. One card = one idea, readable in about 20 seconds. */
import { useState } from 'react';
import { t } from '@/platform';
import { AudioButton, Button, Card } from '@/ui';
import { fillTemplate, type Computed } from './logic/calc';
import { glossaryById } from './logic/content';
import type { LessonBlock } from './logic/types';
import { Markup } from './Markup';
import { ExploreWidget } from './widgets/ExploreWidget';

type Ctx = Record<string, Computed>;

/** Label shown above a card, and a coloured left edge so card kinds are easy to tell apart. */
const LABELS: Partial<Record<LessonBlock['type'], { key: string; edge: string }>> = {
  note: { key: 'investui.card.note', edge: 'border-s-line-strong' },
  tradeoff: { key: 'investui.card.tradeoff', edge: 'border-s-info' },
  misconception: { key: 'investui.card.mistake', edge: 'border-s-warn' },
  formula: { key: 'investui.card.formula', edge: 'border-s-xp' },
  explore: { key: 'investui.card.explore', edge: 'border-s-brand' },
  steps: { key: 'investui.card.steps', edge: 'border-s-brand' },
  jargon: { key: 'investui.card.words', edge: 'border-s-line-strong' },
};

export function BlockCard({ block, ctx }: { block: LessonBlock; ctx: Ctx }) {
  const tx = (key: string) => fillTemplate(t(key), ctx);
  const label = LABELS[block.type];

  // "Words to remember" is a reference, not part of the story: keep it folded until asked for.
  if (block.type === 'jargon') {
    return (
      <details className="rounded-xl border border-line bg-surface">
        <summary className="cursor-pointer px-5 py-3 text-xs font-bold uppercase tracking-[0.15em] text-muted">{t('investui.card.words')}</summary>
        <dl className="space-y-2 border-t border-line p-4">
          {(block.terms ?? []).map((id) => {
            const g = glossaryById.get(id);
            if (!g) return null;
            return (
              <div key={id} className="rounded-lg bg-surface-2 p-3">
                <dt className="font-bold text-ink">{t(g.termKey)}</dt>
                <dd className="text-ink-soft">{t(g.defKey)}</dd>
              </div>
            );
          })}
        </dl>
      </details>
    );
  }

  const spoken = (block.textKey ? [tx(block.textKey)] : block.type === 'steps' ? (block.stepKeys ?? []).map(tx) : []).join(' ').replace(/\*\*/g, '');

  return (
    <Card className={`space-y-3 !p-5 ${label ? `border-s-4 ${label.edge}` : ''}`}>
      <div className="flex items-center justify-between gap-2">
        {label ? <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-muted">{t(label.key)}</h2> : <span />}
        {spoken && <AudioButton text={spoken} />}
      </div>

      {block.textKey && block.type !== 'formula' && (
        <p className={block.type === 'hook' ? 'text-xl font-bold text-ink' : 'text-lg leading-relaxed text-ink'}>
          <Markup text={tx(block.textKey)} />
        </p>
      )}
      {block.type === 'formula' && block.textKey && (
        <p className="font-mono text-base leading-relaxed text-ink">
          <Markup text={tx(block.textKey)} />
        </p>
      )}

      {block.type === 'steps' && <Steps keys={block.stepKeys ?? []} tx={tx} />}

      {block.type === 'explore' && block.explore && (
        <div className="space-y-4">
          <p className="text-lg text-ink">{tx(block.explore.promptKey)}</p>
          <ExploreWidget widget={block.explore.widget} params={resolveParams(block.explore.params, ctx)} />
        </div>
      )}

    </Card>
  );
}

function resolveParams(params: Record<string, string>, ctx: Ctx): Record<string, number> {
  return Object.fromEntries(Object.entries(params).map(([name, ref]) => [name, ctx[ref.slice(1)]?.raw ?? 0]));
}

/** Worked example, one line per tap, so nobody faces a wall of numbers. */
function Steps({ keys, tx }: { keys: string[]; tx: (key: string) => string }) {
  const [shown, setShown] = useState(1);
  return (
    <div className="space-y-3">
      <ol className="space-y-2">
        {keys.slice(0, shown).map((key, i) => (
          <li key={key} className="flex items-start gap-3 rounded-lg bg-surface-2 p-3 text-lg">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-brand text-sm font-bold text-brand-ink">{i + 1}</span>
            <span className="pt-0.5 text-ink">
              <Markup text={tx(key)} />
            </span>
          </li>
        ))}
      </ol>
      {shown < keys.length && (
        <Button variant="secondary" className="w-full" onClick={() => setShown(shown + 1)}>
          {t('investui.btn.showStep')}
        </Button>
      )}
    </div>
  );
}
