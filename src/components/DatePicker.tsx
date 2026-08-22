import { useState } from 'react'
import { CalendarDays } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { formatDateShort } from '@/lib/date'
import { cn } from '@/lib/utils'

interface DatePickerProps {
  value: string
  onChange: (iso: string) => void
  ariaLabel: string
  id?: string
  /** `field` = the boxed rail input look. `cell` = borderless ledger-row cell, revealed on hover/focus. */
  variant?: 'field' | 'cell'
  className?: string
}

/**
 * Replaces the native `<input type="date">` picker, which is OS/browser
 * chrome — no amount of CSS can make it look like it belongs to this app.
 * Closes itself the moment a day is picked, matching how a native picker
 * behaves.
 */
export function DatePicker({
  value,
  onChange,
  ariaLabel,
  id,
  variant = 'field',
  className,
}: DatePickerProps) {
  const [open, setOpen] = useState(false)

  function handleSelect(iso: string) {
    onChange(iso)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {variant === 'field' ?
          <button
            id={id}
            type="button"
            aria-label={ariaLabel}
            className={cn(
              'flex w-full items-center justify-between gap-2 rounded-field border border-ink-line bg-ink-raised px-3.5 py-3 text-left text-[14.5px] text-paper',
              'outline-none transition-[border-color,box-shadow] duration-150 hover:border-ink-edge',
              'focus-visible:border-volt focus-visible:ring-3 focus-visible:ring-volt/20',
              'data-[state=open]:border-volt data-[state=open]:ring-3 data-[state=open]:ring-volt/20',
              className,
            )}
          >
            <span>{formatDateShort(value)}</span>
            <CalendarDays className="size-4 shrink-0 text-ink-muted" aria-hidden />
          </button>
        : <button
            id={id}
            type="button"
            aria-label={ariaLabel}
            className={cn(
              'w-full rounded-lg border border-transparent bg-transparent px-2 py-2 text-left font-mono text-[12.5px] text-paper-muted',
              'outline-none transition-[background-color,border-color,box-shadow] duration-100',
              'hover:border-paper-line hover:bg-white',
              'focus-visible:border-ink focus-visible:bg-white focus-visible:text-ink focus-visible:ring-3 focus-visible:ring-volt/55',
              'data-[state=open]:border-ink data-[state=open]:bg-white data-[state=open]:text-ink data-[state=open]:ring-3 data-[state=open]:ring-volt/55',
              className,
            )}
          >
            {formatDateShort(value)}
          </button>
        }
      </PopoverTrigger>
      <PopoverContent>
        <Calendar value={value} onSelect={handleSelect} />
      </PopoverContent>
    </Popover>
  )
}
