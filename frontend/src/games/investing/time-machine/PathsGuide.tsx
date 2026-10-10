/** "Meet the three paths": says what each path is before the student splits any money. */
import { formatRupees } from '@/core/market';
import { t } from '@/platform';
import { Card } from '@/ui';
import { typicalYear } from './logic/paths';
import { MIX_IDS } from './logic/mix';

export function PathsGuide() {
  return (
    <Card className="space-y-3">
      <h2 className="font-bold">{t('timemachine.paths.title')}</h2>
      <p className="text-sm text-ink-soft">{t('timemachine.paths.intro')}</p>
      <ul className="space-y-2">
        {MIX_IDS.map((id) => {
          const { low, high } = typicalYear(id);
          return (
            <li key={id} className="rounded-lg bg-surface-2 p-3">
              <p className="font-bold text-ink">{t(`asset.${id}`)}</p>
              <p className="text-sm text-ink-soft">{t(`timemachine.paths.${id}.what`)}</p>
              <p className="mt-1 text-sm text-ink">{t('timemachine.paths.year', { low: formatRupees(low), high: formatRupees(high) })}</p>
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-muted">{t('timemachine.paths.note')}</p>
    </Card>
  );
}
