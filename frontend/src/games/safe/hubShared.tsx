/** Small pieces shared by the Stay Safe hub pages. */
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { t } from '@/platform';
import { Icon } from '@/ui';
import { emptyProgress, type Progress } from './logic/progress';
import { loadProgress } from './progressStore';

export const LEVEL = { 1: 'Easy', 2: 'Medium', 3: 'Hard' } as const;

export function BackLink({ to, label }: { to: string; label: string }) {
  return (
    <Link to={to} className="inline-flex items-center gap-1 text-sm font-bold text-brand hover:underline">
      <Icon name="back" className="h-4 w-4" />
      {label}
    </Link>
  );
}

export function useProgress() {
  const [progress, setProgress] = useState<Progress>(emptyProgress());
  useEffect(() => {
    void loadProgress().then(setProgress);
  }, []);
  return progress;
}

export function Stars({ n }: { n: number }) {
  return (
    <span className="inline-flex gap-0.5" role="img" aria-label={t('safe.reward.stars', { n })}>
      {[1, 2, 3].map((i) => (
        <Icon key={i} name="star" className={`h-4 w-4 ${i <= n ? 'fill-current text-warn' : 'text-surface-3'}`} />
      ))}
    </span>
  );
}

