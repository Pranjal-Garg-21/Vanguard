/** Picks the right explore widget from a lesson's `explore.widget` id (ids are listed in logic/explore.ts). */
import { BondPrice } from './BondPrice';
import { BondSchedule } from './BondSchedule';
import { CashSpeed } from './CashSpeed';
import { EtfBuy } from './EtfBuy';
import { FallRise } from './FallRise';
import { FeeDrag } from './FeeDrag';
import { HorizonRange } from './HorizonRange';
import { InflationCups } from './InflationCups';
import { BasketSplit } from './BasketSplit';
import { LenderOutcomes } from './LenderOutcomes';
import { MakingCharge } from './MakingCharge';
import { PathRange } from './PathRange';
import { PositionLab } from './PositionLab';
import { PyramidGrowth } from './PyramidGrowth';
import { SimpleVsCompound } from './SimpleVsCompound';
import { SipUnits } from './SipUnits';
import { SliderLab } from './SliderLab';
import { StartEarly } from './StartEarly';
import type { LabSpec } from '../logic/types';

export function ExploreWidget({ widget, params: p, lab }: { widget: string; params: Record<string, number>; lab?: LabSpec }) {
  switch (widget) {
    case 'slider_lab':
      return lab ? <SliderLab lab={lab} params={p} /> : null;
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
    case 'path_range':
      return <PathRange amount={p.amount ?? 10000} />;
    case 'basket_split':
      return <BasketSplit total={p.total ?? 6000} fall={p.fall ?? 0.3} />;
    case 'sip_units':
      return <SipUnits amount={p.amount ?? 2000} navs={[p.nav1 ?? 100, p.nav2 ?? 80, p.nav3 ?? 125, p.nav4 ?? 100]} />;
    case 'fee_drag':
      return <FeeDrag monthly={p.monthly ?? 1000} gross={p.gross ?? 0.1} years={p.years ?? 10} />;
    case 'etf_buy':
      return <EtfBuy amount={p.amount ?? 10000} nav={p.nav ?? 101} prices={[p.p1 ?? 99, p.p2 ?? 100, p.p3 ?? 102]} cost={p.cost ?? 0.001} />;
    case 'making_charge':
      return <MakingCharge price={p.price ?? 60000} charge={p.charge ?? 0.12} />;
    case 'cash_speed':
      return <CashSpeed amount={p.amount ?? 100000} />;
    case 'horizon_range':
      return <HorizonRange amount={p.amount ?? 10000} />;
    case 'pyramid_growth':
      return <PyramidGrowth recruits={p.recruits ?? 3} town={p.town ?? 10000} />;
    default:
      return null;
  }
}
