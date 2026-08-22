import type { DayGroup, Transaction } from '@/types'
import { LedgerRow } from '@/components/LedgerRow'
import { formatDayHeading } from '@/lib/date'
import { formatSigned } from '@/lib/money'
import { cn } from '@/lib/utils'

interface LedgerTableProps {
  groups: DayGroup[]
  onUpdate: (id: string, patch: Partial<Omit<Transaction, 'id'>>) => void
  onDelete: (id: string) => void
}

export function LedgerTable({ groups, onUpdate, onDelete }: LedgerTableProps) {
  if (groups.length === 0) return <EmptyLedger />

  return (
    <div className="mt-2">
      {groups.map((group) => (
        <section key={group.date}>
          <h2 className="sticky top-0 z-[5] -mx-2 flex items-center gap-3.5 bg-paper/95 px-2 pb-1.5 pt-6 backdrop-blur-[2px]">
            <span className="whitespace-nowrap font-display text-[13px] font-extrabold uppercase tracking-[0.05em]">
              {formatDayHeading(group.date)}
            </span>
            <span aria-hidden className="h-px flex-1 bg-paper-line" />
            <span
              className={cn(
                'font-mono text-sm font-extrabold tabular-nums',
                group.net < 0 ? 'text-flare' : 'text-moss',
              )}
            >
              {formatSigned(group.net)}
            </span>
          </h2>

          {group.transactions.map((transaction) => (
            <LedgerRow
              key={transaction.id}
              transaction={transaction}
              onUpdate={onUpdate}
              onDelete={onDelete}
            />
          ))}
        </section>
      ))}
    </div>
  )
}

function EmptyLedger() {
  return (
    <div className="mt-10 rounded-2xl border border-dashed border-paper-line px-6 py-20 text-center">
      <p className="font-display text-3xl font-extrabold tracking-[-0.02em]">No activity.</p>
      <p className="mt-2 text-sm text-paper-muted">Add your first entry on the left.</p>
    </div>
  )
}
