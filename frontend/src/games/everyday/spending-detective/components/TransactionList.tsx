/**
 * A UPI-style transaction list. Owner: P3.
 *
 * Shared with P5's UPI history (work_division: "transaction-list component
 * (reused by P5's UPI history)"). Presentational only — it takes rows and
 * renders them, so the simulated-data rule stays with whoever supplies them.
 */

import { rupees, useT } from '@/platform';

export type TransactionRow = {
  id: string;
  textKey: string;
  amount: number;
  count?: number;
  tagKey?: string;
};

export function TransactionList({
  rows,
  onSelect,
  selectedId,
}: {
  rows: readonly TransactionRow[];
  onSelect?: (id: string) => void;
  selectedId?: string | null;
}) {
  const t = useT();

  return (
    <ul className="txn-list">
      {rows.map((row) => {
        const total = row.amount * (row.count ?? 1);
        const body = (
          <>
            <span className="txn-list__name">{t(row.textKey)}</span>
            {row.count !== undefined && row.count > 1 && (
              <span className="txn-list__count">
                {t('sm02.txn.times', { count: row.count })}
              </span>
            )}
            {row.tagKey && <span className="txn-list__tag">{t(row.tagKey)}</span>}
            <span className="txn-list__amount">−{rupees(total)}</span>
          </>
        );

        return (
          <li key={row.id} className="txn-list__row">
            {onSelect ? (
              <button
                type="button"
                aria-pressed={selectedId === row.id}
                onClick={() => onSelect(row.id)}
              >
                {body}
              </button>
            ) : (
              body
            )}
          </li>
        );
      })}
    </ul>
  );
}
