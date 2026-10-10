/** Picks the right explore widget from a lesson's `explore.widget` id (ids are listed in logic/explore.ts). */
import { FallRise } from './FallRise';
import { SimpleVsCompound } from './SimpleVsCompound';

export function ExploreWidget({ widget, params }: { widget: string; params: Record<string, number> }) {
  switch (widget) {
    case 'fall_rise':
      return <FallRise start={params.start ?? 1000} fall={params.fall ?? 0.5} />;
    case 'simple_vs_compound':
      return <SimpleVsCompound principal={params.principal ?? 10000} rate={params.rate ?? 0.08} years={params.years ?? 10} />;
    default:
      return null;
  }
}
