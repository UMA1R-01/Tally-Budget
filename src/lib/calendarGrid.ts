import { toISO } from '@/lib/date'

export interface CalendarDay {
  date: Date
  iso: string
  /** Falls in the displayed month, vs. a leading/trailing day from a neighbour. */
  inMonth: boolean
}

/**
 * A 6×7 grid (42 cells) for `year`/`month` (0-indexed), Monday-first — matching
 * the `en-GB` weekday convention already used throughout lib/date.ts. Always
 * 6 weeks so the grid's height never jumps between months.
 */
export function buildMonthGrid(year: number, month: number): CalendarDay[] {
  const firstOfMonth = new Date(year, month, 1)
  // getDay(): 0=Sun..6=Sat. Convert to Monday-first (0=Mon..6=Sun).
  const leadingDays = (firstOfMonth.getDay() + 6) % 7
  const gridStart = new Date(year, month, 1 - leadingDays)

  return Array.from({ length: 42 }, (_, i) => {
    const date = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i)
    return { date, iso: toISO(date), inMonth: date.getMonth() === month }
  })
}

export const WEEKDAY_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
