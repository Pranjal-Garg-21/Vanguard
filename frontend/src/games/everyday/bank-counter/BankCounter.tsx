/**
 * UC-BANK-02 Bank Counter — P3.
 *
 * Open the character's first account: choose the account, fill the form, split
 * the first deposit, set a PIN. Sets `hasBankAccount`, which every later
 * Everyday Money game needs.
 *
 * Two moments carry the teaching. The account cards show the minimum balance
 * and the charge together, so choosing the "proper" savings account on a ₹800
 * allowance is visibly a trap rather than a reward. And the PIN screen dims
 * when someone stops behind the student — §12.6 asks for that specifically.
 *
 * TODO(P2): the account and nominee steps are the Choose verb's job; built
 * inline until it lands.
 */

import { useMemo, useState } from 'react';

import { rupees, useT } from '@/platform';
import { Allocate, type AllocateDetail } from '@/runtime/verbs/allocate';
import { combine, type GameProps } from '../shared/game';
import { characterIncome } from '../shared/economics';
import { accountsFor, canMaintain, isWeakPin, type Account } from './logic/accounts';
import content from '@/content/scenarios/bank/bank-counter.json';

type Phase = 'hook' | 'choose' | 'warn' | 'form' | 'deposit' | 'pin' | 'kit' | 'sms';

const NOMINEES = ['mother', 'father', 'guardian', 'sibling'] as const;

export function BankCounter({ ctx, onComplete }: GameProps) {
  const t = useT();

  const accounts = useMemo(
    () => accountsFor(content.accounts as Account[], ctx.persona),
    [ctx.persona],
  );
  const income = characterIncome(ctx.persona).amount;
  /** Cash in hand at the counter — roughly a month's money. */
  const cashOnHand = Math.max(200, Math.round(income / 2 / 50) * 50);

  const [phase, setPhase] = useState<Phase>('hook');
  const [account, setAccount] = useState<Account | null>(null);
  const [nominee, setNominee] = useState<string | null>(null);
  const [deposit, setDeposit] = useState(0);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [shielded, setShielded] = useState(false);
  const [startedAt] = useState(() => Date.now());

  const passerByHere = pin.length >= content.pin.passerByAtDigit && !shielded;

  function chooseAccount(next: Account) {
    setAccount(next);
    setPhase(canMaintain(next, ctx.persona) ? 'form' : 'warn');
  }

  function finish() {
    if (!account) return;
    onComplete(
      combine(content.summaryKey, [
        {
          choices: [
            { stepId: 'bank02.account', choiceId: account.id, ms: Date.now() - startedAt },
            { stepId: 'bank02.nominee', choiceId: nominee ?? 'none', ms: 0 },
            { stepId: 'bank02.pin', choiceId: shielded ? 'covered' : 'open', ms: 0 },
          ],
          conceptDeltas: {
            why_bank_account: 0.9,
            account_types: 0.9,
            nominee: nominee ? 0.9 : 0.4,
            // Shielding the keypad is the behaviour the moment exists to teach.
            pin_secrecy: shielded ? 0.9 : 0.5,
            minimum_balance_fees: canMaintain(account, ctx.persona) ? 0.9 : 0.4,
          },
          misconceptions: [],
          effects: {
            'money.bank': deposit,
            'money.cash': -deposit,
            'meta.flags.hasBankAccount': true,
            'meta.flags.accountType': account.id,
            // Month 2 charges the student who picked a minimum they cannot hold.
            'meta.flags.accountMinimumAtRisk': !canMaintain(account, ctx.persona),
            // P5's single-message component picks this up (UC-SAFE-03).
            'meta.flags.pendingKycSms': true,
          },
        },
      ]),
    );
  }

  if (phase === 'hook') {
    return (
      <section className="game game--bank02">
        <p>{t(content.hookKey)}</p>
        <button type="button" onClick={() => setPhase('choose')}>
          {t('common.continue')}
        </button>
      </section>
    );
  }

  if (phase === 'choose') {
    return (
      <section className="game game--bank02">
        <p>{t('bank02.clerk.which')}</p>
        <ul className="accounts">
          {accounts.map((option) => (
            <li key={option.id}>
              <button type="button" onClick={() => chooseAccount(option)}>
                <strong>{t(option.textKey)}</strong>
                <span>
                  {t(option.blurbKey, {
                    minimum: rupees(option.minimumBalance),
                    charge: rupees(option.monthlyCharge),
                  })}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  if (phase === 'warn' && account) {
    return (
      <section className="game game--bank02">
        <p className="warning">
          {t('bank02.warning.cannot_maintain', {
            income: rupees(income),
            minimum: rupees(account.minimumBalance),
            charge: rupees(account.monthlyCharge),
          })}
        </p>
        {/* Still their call. The consequence arrives on the Month 2 statement. */}
        <button type="button" onClick={() => setPhase('form')}>
          {t('bank02.warning.keep_anyway')}
        </button>
        <button type="button" onClick={() => setPhase('choose')}>
          {t('bank02.warning.choose_other')}
        </button>
      </section>
    );
  }

  if (phase === 'form') {
    return (
      <section className="game game--bank02">
        <h3>{t('bank02.form.title')}</h3>
        <p>{t('bank02.clerk.form')}</p>

        <dl className="form">
          <dt>{t('bank02.form.name')}</dt>
          <dd>✓</dd>
          <dt>{t('bank02.form.address')}</dt>
          <dd>✓</dd>
          <dt>{t('bank02.form.signature')}</dt>
          <dd>✓</dd>
        </dl>

        <h3>{t('bank02.form.nominee')}</h3>
        <p>{t('bank02.form.nominee_why')}</p>
        <ul className="nominees">
          {NOMINEES.map((who) => (
            <li key={who}>
              <button
                type="button"
                aria-pressed={nominee === who}
                onClick={() => setNominee(who)}
              >
                {t(`bank02.nominee.${who}`)}
              </button>
            </li>
          ))}
        </ul>

        <button type="button" disabled={!nominee} onClick={() => setPhase('deposit')}>
          {t('bank02.form.submit')}
        </button>
      </section>
    );
  }

  if (phase === 'deposit') {
    return (
      <Allocate
        stepId="bank02.deposit"
        ctx={ctx}
        total={cashOnHand}
        promptKey="bank02.deposit.prompt"
        jars={[
          { id: 'bank', textKey: 'bank02.deposit.jar_bank', emoji: '🏦' },
          { id: 'pocket', textKey: 'bank02.deposit.jar_pocket', emoji: '👛' },
        ]}
        concepts={{ why_bank_account: 0.8 }}
        onComplete={(outcome) => {
          const detail = outcome.detail as AllocateDetail | undefined;
          setDeposit(detail?.allocations.bank ?? 0);
          setPhase('pin');
        }}
      />
    );
  }

  if (phase === 'pin') {
    return (
      <section className="game game--bank02">
        <h3>{t('bank02.pin.title')}</h3>
        <p>{t('bank02.pin.prompt')}</p>

        {/* The whole point of this screen. */}
        {passerByHere && <p className="passerby">{t('bank02.pin.passerby')}</p>}
        {shielded && <p className="passerby passerby--handled">{t('bank02.pin.covered')}</p>}

        <p className="pin__display" data-hidden={passerByHere}>
          {passerByHere ? '•'.repeat(pin.length) : pin.padEnd(content.pin.length, '·')}
        </p>

        {passerByHere && (
          <button type="button" onClick={() => setShielded(true)}>
            {t('bank02.pin.cover')}
          </button>
        )}

        <div className="keypad">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((digit) => (
            <button
              key={digit}
              type="button"
              disabled={pin.length >= content.pin.length}
              onClick={() => {
                setPinError(false);
                setPin((p) => p + digit);
              }}
            >
              {digit}
            </button>
          ))}
        </div>

        {pinError && <p role="alert">{t('bank02.pin.weak')}</p>}

        <button
          type="button"
          disabled={pin.length < content.pin.length}
          onClick={() => {
            if (isWeakPin(pin)) {
              setPinError(true);
              setPin('');
              return;
            }
            setPhase('kit');
          }}
        >
          {t('common.continue')}
        </button>
        <button type="button" disabled={!pin} onClick={() => setPin('')}>
          {t('common.try_again')}
        </button>
      </section>
    );
  }

  if (phase === 'kit') {
    return (
      <section className="game game--bank02">
        <h3>{t('bank02.kit.title')}</h3>
        <p>{t('bank02.clerk.kit')}</p>
        <ul className="kit">
          <li>📒 {t('bank02.kit.passbook')}</li>
          <li>💳 {t('bank02.kit.card')}</li>
          <li>✉️ {t('bank02.kit.envelope')}</li>
        </ul>
        <p>{t('bank02.pin.done')}</p>
        <p>{t(content.conceptCard.textKey)}</p>
        <button type="button" onClick={() => setPhase('sms')}>
          {t('common.continue')}
        </button>
      </section>
    );
  }

  return (
    <section className="game game--bank02">
      {/* Handed to P5's single-message component in LifePath; shown here so the
          Arcade round still ends on the thing the student needs to notice. */}
      <p className="sms">{t('bank02.sms.arrived')}</p>
      <p>{t('bank02.sms.note')}</p>
      <button type="button" onClick={finish}>
        {t('common.continue')}
      </button>
    </section>
  );
}
