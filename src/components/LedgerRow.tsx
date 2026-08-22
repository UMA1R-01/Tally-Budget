import { useEffect, useRef, useState } from 'react'
import { Trash2 } from 'lucide-react'
import type { Transaction, TransactionType } from '@/types'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DatePicker } from '@/components/DatePicker'
import { cn } from '@/lib/utils'
import { formatAmount, parseAmount } from '@/lib/money'

export const ROW_GRID =
  'grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 md:grid-cols-[104px_1fr_150px_124px_34px] md:gap-3.5'

interface LedgerRowProps {
  transaction: Transaction
  onUpdate: (id: string, patch: Partial<Omit<Transaction, 'id'>>) => void
  onDelete: (id: string) => void
}

/**
 * A ledger row is the editor. There is no edit mode and no save button — every
 * field commits straight to state, which is persisted immediately.
 */
export function LedgerRow({ transaction, onUpdate, onDelete }: LedgerRowProps) {
  const isIncome = transaction.type === 'income'
  const label = transaction.description || 'this transaction'
  const descriptionRef = useRef<HTMLTextAreaElement>(null)

  // A long description grows the field instead of clipping it — matches the
  // PDF export, which wraps the same text rather than truncating it with an
  // ellipsis. Re-measured on every change, since height:auto is the only way
  // to get scrollHeight to reflect the *shrunk* size after deleting text.
  // Measured again once webfonts finish loading: the first measurement can
  // land against fallback-font metrics mid-swap, undersizing the field.
  useEffect(() => {
    const el = descriptionRef.current
    if (!el) return
    const resize = () => {
      el.style.height = '0px'
      el.style.height = `${el.scrollHeight}px`
    }
    resize()
    document.fonts.ready.then(resize)
  }, [transaction.description])

  return (
    <div
      className={cn(
        ROW_GRID,
        'group relative rounded-lg border-b border-paper-line px-2 py-2 transition-colors duration-100',
        'hover:bg-paper-raised focus-within:bg-paper-raised',
      )}
    >
      {/* Type — a real select, with a chevron, so it reads as editable */}
      <div className="order-2 w-[104px] md:order-none md:w-auto">
        <Select
          value={transaction.type}
          onValueChange={(value) => onUpdate(transaction.id, { type: value as TransactionType })}
        >
          <SelectTrigger
            aria-label={`Type for ${label}`}
            className={cn(
              isIncome ? 'bg-volt text-ink' : 'bg-flare-soft text-flare',
              'hover:border-ink/25',
            )}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="income">Income</SelectItem>
            <SelectItem value="expense">Expense</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Description — a textarea, not an input: a long entry wraps and grows
          the row instead of clipping. Plain Enter blurs (nothing to
          "submit" — every keystroke already autosaves); Shift+Enter inserts
          a real line break for anyone who wants one. */}
      <textarea
        ref={descriptionRef}
        value={transaction.description}
        aria-label={`Description for ${label}`}
        placeholder="Describe this entry"
        rows={1}
        onChange={(event) => onUpdate(transaction.id, { description: event.target.value })}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault()
            event.currentTarget.blur()
          }
        }}
        className={cn(
          'order-1 col-span-2 w-full resize-none overflow-hidden rounded-lg border border-transparent bg-transparent px-2 py-2 pr-9 text-[15px]',
          'outline-none transition-[background-color,border-color,box-shadow] duration-100',
          'placeholder:text-paper-muted/70 hover:border-paper-line hover:bg-white',
          'focus-visible:border-ink focus-visible:bg-white focus-visible:ring-3 focus-visible:ring-volt/55',
          'md:order-none md:col-span-1 md:pr-2',
        )}
      />

      {/* Amount */}
      <AmountCell transaction={transaction} onUpdate={onUpdate} />

      {/* Date */}
      <DateCell transaction={transaction} onUpdate={onUpdate} />

      {/* Delete — always reachable on touch, revealed by hover *or* focus on
          pointer devices, so keyboard users are never aiming at nothing. */}
      <button
        type="button"
        aria-label={`Delete ${label}`}
        title="Delete"
        onClick={() => onDelete(transaction.id)}
        className={cn(
          'absolute right-1.5 top-1.5 grid size-[30px] place-items-center rounded-lg text-paper-muted',
          'transition-[opacity,background-color,color] duration-100',
          'hover:bg-flare hover:text-white',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-1',
          'md:static md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 md:focus-visible:opacity-100',
        )}
      >
        <Trash2 className="size-4" aria-hidden />
      </button>
    </div>
  )
}

/**
 * Amount editing keeps a local draft while focused, so a half-typed value is
 * never coerced — clearing the field to retype it does not snap to 0, and an
 * unparseable value reverts instead of corrupting the row. On commit the value
 * is stored as a positive magnitude: a negative "expense" would silently count
 * as income in the totals.
 */
function AmountCell({
  transaction,
  onUpdate,
}: {
  transaction: Transaction
  onUpdate: LedgerRowProps['onUpdate']
}) {
  const isIncome = transaction.type === 'income'
  const display = `${isIncome ? '+' : '−'}${formatAmount(transaction.amount)}`
  const [draft, setDraft] = useState<string | null>(null)

  // If the row changes underneath an open editor (undo, restore), drop the draft.
  useEffect(() => {
    setDraft(null)
  }, [transaction.id])

  function commit(value: string) {
    const parsed = parseAmount(value)
    if (parsed !== null && parsed !== transaction.amount) {
      onUpdate(transaction.id, { amount: parsed })
    }
    setDraft(null)
  }

  return (
    <input
      value={draft ?? display}
      inputMode="decimal"
      aria-label={`Amount for ${transaction.description || 'this transaction'}`}
      onFocus={() => setDraft(formatAmount(transaction.amount))}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={(event) => commit(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur()
        if (event.key === 'Escape') {
          setDraft(null)
          event.currentTarget.blur()
        }
      }}
      className={cn(
        'order-3 w-full rounded-lg border border-transparent bg-transparent px-2 py-2 text-right font-mono text-[15px] font-bold tabular-nums',
        'outline-none transition-[background-color,border-color,box-shadow] duration-100',
        'hover:border-paper-line hover:bg-white',
        'focus-visible:border-ink focus-visible:bg-white focus-visible:ring-3 focus-visible:ring-volt/55',
        'md:order-none',
        isIncome ? 'text-moss' : 'text-flare',
      )}
    />
  )
}

/**
 * An empty date is the one edit that must never reach state: it produces an
 * Invalid Date, every date formatter downstream throws on it, and because the
 * row is persisted on change, a reload would replay the crash forever. The
 * custom calendar can't produce an empty value in the first place — every
 * cell it offers is a real, valid date — so that failure mode is closed off
 * structurally rather than guarded against.
 */
function DateCell({
  transaction,
  onUpdate,
}: {
  transaction: Transaction
  onUpdate: LedgerRowProps['onUpdate']
}) {
  return (
    <DatePicker
      variant="cell"
      value={transaction.date}
      ariaLabel={`Date for ${transaction.description || 'this transaction'}`}
      onChange={(iso) => onUpdate(transaction.id, { date: iso })}
      className="order-4 col-span-2 md:order-none md:col-span-1"
    />
  )
}
