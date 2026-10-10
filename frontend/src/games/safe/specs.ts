/**
 * Which templates exist and how each one varies. Data only. The hub reads
 * this to build a fresh variant for every play. Owner: P5.
 */
import type { VariantSpec } from './phone/logic/variants';
import wrongTransfer from '../../content/scenarios/safe/templates/wrong_transfer.json';
import hackedFriend from '../../content/scenarios/safe/templates/hacked_friend.json';
import digitalArrest from '../../content/scenarios/safe/templates/digital_arrest.json';
import collectRequest from '../../content/scenarios/safe/templates/collect_request.json';
import qrReceive from '../../content/scenarios/safe/templates/qr_receive.json';
import type { Scenario } from './phone/logic/types';

export type TemplateEntry = { template: Scenario; spec: VariantSpec; balance?: number };

const NAMES = ['Vikram S.', 'Deepak R.', 'Sunita M.', 'Anita K.'] as const;
const FRIENDS = ['Rohit', 'Ankit', 'Manish', 'Kavya'] as const;
const OFFICERS = ['Inspector Sharma', 'Officer Verma', 'Inspector Rao'] as const;

/** Templates whose variants are built by `applyVariant`. UPI's own two are built in the UPI simulator. */
export const TEMPLATES: Record<string, TemplateEntry> = {
  wrong_transfer: {
    template: wrongTransfer as unknown as Scenario,
    spec: {
      pools: { name: NAMES, amount: [1500, 2000, 2500] },
      derive: (p) => ({ newbal: (3400 + Number(p.amount)).toLocaleString('en-IN') }),
      names: [{ surfaces: ['chat'], field: 'from', template: '{name}' }],
      loss: [
        { surface: 'chat', action: 'pay_back', key: 'amount' },
        { surface: 'sms', action: 'pay_back', key: 'amount' },
        { surface: 'bankapp', action: 'pay_anyway', key: 'amount' },
      ],
    },
  },
  hacked_friend: {
    template: hackedFriend as unknown as Scenario,
    spec: {
      pools: { name: FRIENDS, amount: [2000, 3000, 4000] },
      names: [
        { surfaces: ['m1', 'm2', 'm3'], field: 'from', template: '{name}' },
        { surfaces: ['callres'], field: 'caller', template: '{name} (saved number)' },
      ],
      loss: [
        { surface: 'm2', action: 'send', key: 'amount' },
        { surface: 'm3', action: 'send', key: 'amount' },
      ],
    },
  },
  digital_arrest: {
    template: digitalArrest as unknown as Scenario,
    spec: {
      pools: { officer: OFFICERS, amount: [4500, 6000, 8000] },
      loss: [{ surface: 'c3', action: 'transfer', key: 'amount' }],
    },
  },
};

export const UPI_TEMPLATES = { collect: collectRequest as unknown as Scenario, qr: qrReceive as unknown as Scenario };
