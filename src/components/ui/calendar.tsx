import { useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { buildMonthGrid, WEEKDAY_LABELS } from '@/lib/calendarGrid'
import { parseISO, todayISO, toISO } from '@/lib/date'
import { cn } from '@/lib/utils'

interface CalendarProps {
  /** Selected date, ISO `YYYY-MM-DD`. */
  value: string
  onSelect: (iso: string) => void
  className?: string
}

/**
 * A hand-rolled month grid rather than the native `<input type="date">`
 * picker: that popup is OS/browser chrome, and nothing in CSS can restyle
 * it to look like it belongs to this app. Full roving-tabindex keyboard
 * support — arrow keys move the focused day (crossing month boundaries when
 * needed), Enter/Space selects it.
 */
export function Calendar({ value, onSelect, className }: CalendarProps) {
  const selected = parseISO(value) ?? new Date()
  const [viewYear, setViewYear] = useState(selected.getFullYear())
  const [viewMonth, setViewMonth] = useState(selected.getMonth())
  const [focusedIso, setFocusedIso] = useState(() => toISO(selected))

  const cellRefs = useRef(new Map<string, HTMLButtonElement>())
  const grid = useMemo(() => buildMonthGrid(viewYear, viewMonth), [viewYear, viewMonth])
  const today = todayISO()

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  })

  function goToMonth(delta: number) {
    const next = new Date(viewYear, viewMonth + delta, 1)
    setViewYear(next.getFullYear())
    setViewMonth(next.getMonth())
  }

  function moveFocus(deltaDays: number) {
    const current = parseISO(focusedIso) ?? selected
    const next = new Date(
      current.getFullYear(),
      current.getMonth(),
      current.getDate() + deltaDays,
    )
    if (next.getMonth() !== viewMonth || next.getFullYear() !== viewYear) {
      setViewYear(next.getFullYear())
      setViewMonth(next.getMonth())
    }
    setFocusedIso(toISO(next))
  }

  // Roving tabindex: after the focus target changes (arrow key, or a month
  // flip bringing a new grid into the DOM), move real DOM focus to match.
  useEffect(() => {
    cellRefs.current.get(focusedIso)?.focus()
  }, [focusedIso, viewYear, viewMonth])

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault()
        moveFocus(-1)
        break
      case 'ArrowRight':
        event.preventDefault()
        moveFocus(1)
        break
      case 'ArrowUp':
        event.preventDefault()
        moveFocus(-7)
        break
      case 'ArrowDown':
        event.preventDefault()
        moveFocus(7)
        break
      case 'Enter':
      case ' ':
        event.preventDefault()
        onSelect(focusedIso)
        break
    }
  }

  function jumpToToday() {
    const t = parseISO(today)!
    setViewYear(t.getFullYear())
    setViewMonth(t.getMonth())
    setFocusedIso(today)
    onSelect(today)
  }

  return (
    <div className={cn('w-[280px] select-none', className)} onKeyDown={handleKeyDown}>
      <div className="flex items-center justify-between px-4 pb-1 pt-3.5">
        <button
          type="button"
          aria-label="Previous month"
          onClick={() => goToMonth(-1)}
          className="grid size-6 place-items-center rounded-md text-ink-muted transition-colors hover:bg-ink-soft hover:text-paper"
        >
          <ChevronLeft className="size-3.5" aria-hidden />
        </button>
        <p className="font-display text-[15px] font-extrabold tracking-[-0.01em]">{monthLabel}</p>
        <button
          type="button"
          aria-label="Next month"
          onClick={() => goToMonth(1)}
          className="grid size-6 place-items-center rounded-md text-ink-muted transition-colors hover:bg-ink-soft hover:text-paper"
        >
          <ChevronRight className="size-3.5" aria-hidden />
        </button>
      </div>

      <div className="grid grid-cols-7 px-3 pt-0.5" aria-hidden>
        {WEEKDAY_LABELS.map((day) => (
          <span key={day} className="py-1.5 text-center font-mono text-[9.5px] text-ink-muted">
            {day}
          </span>
        ))}
      </div>

      <div
        role="grid"
        aria-label={monthLabel}
        className="grid grid-cols-7 gap-0.5 px-2.5 pb-3.5 pt-0.5"
      >
        {grid.map(({ date, iso, inMonth }) => {
          const isToday = iso === today
          const isSelected = iso === value
          return (
            <button
              key={iso}
              ref={(el) => {
                if (el) cellRefs.current.set(iso, el)
                else cellRefs.current.delete(iso)
              }}
              type="button"
              role="gridcell"
              aria-selected={isSelected}
              aria-current={isToday ? 'date' : undefined}
              tabIndex={iso === focusedIso ? 0 : -1}
              onClick={() => onSelect(iso)}
              onFocus={() => setFocusedIso(iso)}
              className={cn(
                'aspect-square rounded-lg font-mono text-[12.5px] outline-none transition-colors',
                'focus-visible:ring-2 focus-visible:ring-volt/60',
                !inMonth && 'text-ink-faint',
                inMonth && !isSelected && 'text-paper hover:bg-ink-soft',
                isToday && !isSelected && 'font-bold text-volt ring-1 ring-inset ring-volt',
                isSelected && 'bg-volt font-extrabold text-ink',
              )}
            >
              {date.getDate()}
            </button>
          )
        })}
      </div>

      <div className="flex justify-end border-t border-ink-line px-4 py-2.5">
        <button
          type="button"
          onClick={jumpToToday}
          className="text-[12px] font-bold text-volt outline-none hover:underline focus-visible:underline"
        >
          Today
        </button>
      </div>
    </div>
  )
}
