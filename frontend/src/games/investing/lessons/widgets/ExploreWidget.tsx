/** Picks the right explore widget from a lesson's `explore.widget` id (ids are listed in logic/explore.ts). */
import { BondPrice } from './BondPrice';
import { BondSchedule } from './BondSchedule';
import { FallRise } from './FallRise';
import { InflationCups } from './InflationCups';
import { LenderOutcomes } from './LenderOutcomes';
import { PositionLab } from './PositionLab';
import { SimpleVsCompound } from './SimpleVsCompound';
import { StartEarly } from './StartEarly';

export function ExploreWidget({ widget, params: p }: { widget: string; params: Record<string, number> }) {
  switch (widget) {
    case 'fall_rise':
      return <FallRise start={p.start ?? 1000} fall={p.fall ?? 0.5} />;
    case 'simple_vs_compound':
      return <SimpleVsCompound principal={p.principal ?? 10000} rate={p.rate ?? 0.08} years={p.years ?? 10} />;
    case 'start_early':
      return <StartEarly monthly={p.monthly ?? 500} rate={p.rate ?? 0.1} startAge={p.startAge ?? 28} stopAge={p.stopAge ?? 58} />;
    case 'inflation_cups':
      return <InflationCups price={p.price ?? 20} inflation={p.inflation ?? 0.06} years={p.years ?? 0} money={p.money ?? 1000} />;
    case 'lender_outcomes':
      return <LenderOutcomes amount={p.amount ?? 1000} rate={p.rate ?? 0.1} recovery={p.recovery ?? 1} />;
    case 'bond_schedule':
      return <BondSchedule face={p.face ?? 10000} coupon={p.coupon ?? 0.05} years={p.years ?? 3} />;
    case 'bond_price':
      return <BondPrice face={p.face ?? 10000} coupon={p.coupon ?? 0.07} market={p.market ?? 0.07} years={p.years ?? 2} />;
    case 'position_lab':
      return <PositionLab shares={p.shares ?? 10} price={p.price ?? 100} change={p.change ?? 0} dividend={p.dividend ?? 0} fee={p.fee ?? 0.005} />;
    default:
      return null;
  }
}
