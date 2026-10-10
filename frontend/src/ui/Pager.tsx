/**
 * Shows a long screen one small page at a time, with a line saying what to do now, dots for where you are,
 * and Back / Next. Use it whenever a screen would otherwise show many cards at once.
 * Owner: P4. Part of the design kit.
 */
import { useState, type ReactNode } from 'react';
import { t } from '@/platform';
import { Button } from './components';

export interface PagerPage {
  id: string;
  title: string;
  /** One line: what to do or look at on this page. */
  hint?: string;
  content: ReactNode;
  /** Replace the Next button on this page (for example "Run the futures"). */
  nextLabel?: string;
  onNext?: () => void;
  /** Grey out Next until the student has made a choice on this page. */
  nextDisabled?: boolean;
  /** Hide Back on this page. */
  noBack?: boolean;
}

export function Pager({ pages, index: controlled, onIndex }: { pages: PagerPage[]; index?: number; onIndex?: (i: number) => void }) {
  const [own, setOwn] = useState(0);
  const index = Math.min(controlled ?? own, pages.length - 1);
  const page = pages[index]!;
  const go = (i: number) => {
    (onIndex ?? setOwn)(i);
    window.scrollTo({ top: 0 });
  };
  const last = index === pages.length - 1;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-bold uppercase tracking-[0.15em] text-muted">{t('ui.pager.step', { n: index + 1, total: pages.length })}</span>
          <ol className="flex gap-1.5" aria-hidden="true">
            {pages.map((p, i) => (
              <li key={p.id} className={`h-2 rounded-full transition-all ${i === index ? 'w-6 bg-brand' : i < index ? 'w-2 bg-brand/60' : 'w-2 bg-surface-3'}`} />
            ))}
          </ol>
        </div>
        <h2 className="text-2xl font-bold">{page.title}</h2>
        {page.hint && <p className="max-w-3xl text-lg text-ink-soft">{page.hint}</p>}
      </div>

      <div key={page.id} className="coach-in space-y-4">
        {page.content}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        {index > 0 && !page.noBack ? (
          <Button variant="secondary" onClick={() => go(index - 1)}>
            {t('ui.pager.back')}
          </Button>
        ) : (
          <span />
        )}
        {(!last || page.onNext) && (
          <Button size="lg" disabled={page.nextDisabled} onClick={() => (page.onNext ? page.onNext() : go(index + 1))}>
            {page.nextLabel ?? t('ui.pager.next')}
          </Button>
        )}
      </div>
    </div>
  );
}
