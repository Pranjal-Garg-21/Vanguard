/** This week's headline. A rumour from a chat feed looks different from real news, on purpose. */
import { t } from '@/platform';
import { Card } from '@/ui';
import type { NewsCard as News } from './logic/types';

const EDGE: Record<News['tone'], string> = {
  open: 'border-s-brand',
  good: 'border-s-info',
  bad: 'border-s-info',
  noise: 'border-s-info',
  rumour: 'border-s-warn',
  dividend: 'border-s-xp',
};

export function NewsCard({ news, vars }: { news: News; vars: Record<string, string | number> }) {
  const rumour = news.tone === 'rumour';
  return (
    <Card className={`space-y-2 border-s-4 ${EDGE[news.tone]} ${rumour ? 'bg-warn/5' : ''}`}>
      <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-muted">{t(`stockmarket.tone.${news.tone}`)}</h2>
      <p className={`text-lg leading-relaxed text-ink ${rumour ? 'italic' : ''}`}>{t(news.textKey, vars)}</p>
    </Card>
  );
}
