import { useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import type { TransactionType } from '@/types'
import type { NewTransactionInput } from '@/hooks/useTransactions'
import type { Currency } from '@/lib/currency'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DatePicker } from '@/components/DatePicker'
import { cn } from '@/lib/utils'
import { isValidISODate, todayISO, yesterdayISO } from '@/lib/date'
import { parseAmount } from '@/lib/money'

interface EntryFormProps {
  currency: Currency
  onAdd: (input: NewTransactionInput) => void
}

type FieldErrors = Partial<Record<'date' | 'description' | 'amount', string>>

export function EntryForm({ currency, onAdd }: EntryFormProps) {
  const [date, setDate] = useState(todayISO)
  const [type, setType] = useState<TransactionType>('income')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})

  const descriptionRef = useRef<HTMLInputElement>(null)
  const amountRef = useRef<HTMLInputElement>(null)

  const today = todayISO()
  const yesterday = yesterdayISO()

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    // Validated here rather than leaning on native constraints alone: a
    // whitespace-only description and an amount of "0" both satisfy `required`
    // while being meaningless entries in a ledger.
    const nextErrors: FieldErrors = {}

    if (!isValidISODate(date)) nextErrors.date = 'Pick a valid date.'

    const trimmed = description.trim()
    if (trimmed.length === 0) nextErrors.description = 'Give this entry a description.'

    const parsed = parseAmount(amount)
    if (parsed === null) nextErrors.amount = 'Enter an amount.'
    else if (parsed <= 0) nextErrors.amount = 'Amount must be more than zero.'

    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      if (nextErrors.description) descriptionRef.current?.focus()
      else if (nextErrors.amount) amountRef.current?.focus()
      return
    }

    onAdd({ date, type, description: trimmed, amount: parsed! })

    // Date and type persist: entering several same-day, same-type rows in a
    // row is the common case, so only the per-entry fields reset.
    setDescription('')
    setAmount('')
    descriptionRef.current?.focus()
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="on-ink flex flex-col gap-4">
      {/* Date */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="entry-date">Date</Label>
        <DatePicker
          id="entry-date"
          ariaLabel="Date"
          value={date}
          onChange={(iso) => {
            setDate(iso)
            setErrors((prev) => ({ ...prev, date: undefined }))
          }}
          className={cn(errors.date && 'border-flare')}
        />
        <div className="flex gap-1.5">
          <QuickDate label="Today" active={date === today} onClick={() => setDate(today)} />
          <QuickDate
            label="Yesterday"
            active={date === yesterday}
            onClick={() => setDate(yesterday)}
          />
        </div>
        <FieldError message={errors.date} />
      </div>

      {/* Type */}
      <div className="flex flex-col gap-2">
        <Label asChild>
          <span id="entry-type-label">Type</span>
        </Label>
        <div
          role="group"
          aria-labelledby="entry-type-label"
          className="flex gap-1 rounded-xl border border-ink-line bg-ink-raised p-1"
        >
          <TypeToggle
            label="Income"
            active={type === 'income'}
            activeClass="bg-volt text-ink"
            onClick={() => setType('income')}
          />
          <TypeToggle
            label="Expense"
            active={type === 'expense'}
            activeClass="bg-flare text-white"
            onClick={() => setType('expense')}
          />
        </div>
      </div>

      {/* Description */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="entry-description">Description</Label>
        <Input
          id="entry-description"
          ref={descriptionRef}
          value={description}
          placeholder="e.g. Groceries, rent, salary"
          autoComplete="off"
          onChange={(event) => {
            setDescription(event.target.value)
            setErrors((prev) => ({ ...prev, description: undefined }))
          }}
          aria-invalid={Boolean(errors.description)}
          className={cn(errors.description && 'border-flare')}
        />
        <FieldError message={errors.description} />
      </div>

      {/* Amount */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="entry-amount">Amount</Label>
        <div className="relative">
          <span
            aria-hidden
            className="pointer-events-none absolute left-3.5 top-1/2 max-w-[3.25rem] -translate-y-1/2 truncate font-mono text-[13px] text-ink-muted"
          >
            {currency.symbol}
          </span>
          <Input
            id="entry-amount"
            ref={amountRef}
            value={amount}
            inputMode="decimal"
            placeholder="0.00"
            autoComplete="off"
            onChange={(event) => {
              setAmount(event.target.value)
              setErrors((prev) => ({ ...prev, amount: undefined }))
            }}
            aria-invalid={Boolean(errors.amount)}
            className={cn('pl-14 font-mono text-[15px]', errors.amount && 'border-flare')}
          />
        </div>
        <FieldError message={errors.amount} />
      </div>

      <Button type="submit" variant="volt" size="lg" className="mt-1 w-full">
        <Plus aria-hidden />
        Add Transaction
      </Button>
    </form>
  )
}

function QuickDate({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'rounded-full border px-2.5 py-1.5 text-[11.5px] font-semibold transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-volt/60',
        active ?
          'border-volt bg-volt text-ink'
        : 'border-ink-line bg-ink-soft text-paper-line/70 hover:border-ink-edge hover:text-paper',
      )}
    >
      {label}
    </button>
  )
}

function TypeToggle({
  label,
  active,
  activeClass,
  onClick,
}: {
  label: string
  active: boolean
  activeClass: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'flex-1 rounded-[9px] py-2.5 text-[13.5px] font-bold transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-volt/60',
        active ? activeClass : 'text-ink-muted hover:text-paper',
      )}
    >
      {label}
    </button>
  )
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p role="alert" className="text-[11.5px] font-medium text-flare">
      {message}
    </p>
  )
}
