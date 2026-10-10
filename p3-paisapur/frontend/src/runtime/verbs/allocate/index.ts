/**
 * Verb component: allocate. Returns MiniGameResult choices.
 * Owner: P3
 *
 * Split an amount across jars by tapping a coin then a jar, or with sliders at
 * L3. Attach `bills` to a jar to get the live overflow check.
 */
export { Allocate } from './Allocate';
export type { AllocateProps } from './Allocate';
export {
  findUnderfunded,
  billsTotal,
  type AllocateBill,
  type AllocateJar,
  type AllocateDetail,
  type Underfunded,
} from './logic/jars';
