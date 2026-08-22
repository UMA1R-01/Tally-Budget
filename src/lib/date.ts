/**
 * Date helpers.
 *
 * Two rules hold everywhere in this file:
 *
 *  1. Dates are *local* calendar dates. `new Date().toISOString()` is UTC and
 *     shifts the day for anyone east or west of Greenwich (for UTC+5 that is
 *     every night between 00:00 and 04:59) — so it is never used here.
 *  2. Every formatter is total: given rubbish it returns a placeholder rather
 *     than throwing. `new Date('').toLocaleDateString()` throws a RangeError,
 *     and an uncaught throw during render takes the whole app down, so the
 *     formatters below refuse to be the thing that breaks the ledger.
 */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/** Today, as a local `YYYY-MM-DD` string. */
export function todayISO(): string {
  return toISO(new Date())
}

/** Yesterday, as a local `YYYY-MM-DD` string. */
export function yesterdayISO(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return toISO(d)
}

/** Format a Date as a local `YYYY-MM-DD` string. */
export function toISO(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Parse a `YYYY-MM-DD` string into a local-noon Date, or null.
 *
 * Noon, not midnight: it keeps the date away from DST boundaries where a
 * midnight timestamp can land on the previous day.
 */
export function parseISO(iso: unknown): Date | null {
  if (typeof iso !== 'string' || !ISO_DATE.test(iso)) return null
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number]
  const date = new Date(y, m - 1, d, 12)
  // Rejects real-looking nonsense such as 2026-02-31, which JS would roll over.
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null
  return date
}

export function isValidISODate(iso: unknown): iso is string {
  return parseISO(iso) !== null
}

/** `18 Aug 2026` */
export function formatDateShort(iso: string): string {
  const date = parseISO(iso)
  if (!date) return '—'
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

/** `Mon 18 Aug 2026` — the day-divider heading. */
export function formatDayHeading(iso: string): string {
  const date = parseISO(iso)
  if (!date) return 'Undated'
  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

/** `Monday, 18 August 2026` — used for screen-reader and PDF long form. */
export function formatDateFull(iso: string): string {
  const date = parseISO(iso)
  if (!date) return 'Undated'
  return date.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/**
 * A date range written the way a person would write it, not two full dates
 * joined by a dash:
 *  - same day:            `18 Aug 2026`
 *  - same month and year: `18–20 Aug 2026`   (unspaced en dash — one word pair)
 *  - same year:           `18 Aug – 20 Sep 2026`  (spaced — joining two phrases)
 *  - different years:     `18 Aug 2026 – 20 Sep 2027`
 *
 * Every space *within* a single date is non-breaking, so "20 Sep 2026" can
 * never split across a line break — only the space(s) around the dash are
 * ordinary breakable spaces. A layout squeezed too narrow to fit the whole
 * range therefore wraps at the one sensible point, one date per line,
 * instead of splitting a date in half wherever it happens to run out of
 * room.
 */
export function formatRange(start: string, end: string): string {
  const a = parseISO(start)
  const b = parseISO(end)
  if (!a || !b) return '—'

  if (start === end) {
    return nbsp(formatDateShort(start))
  }

  const sameYear = a.getFullYear() === b.getFullYear()
  const sameMonth = sameYear && a.getMonth() === b.getMonth()

  if (sameMonth) {
    const day = a.toLocaleDateString('en-GB', { day: '2-digit' })
    return `${day}–${nbsp(formatDateShort(end))}`
  }

  if (sameYear) {
    const startNoYear = nbsp(a.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }))
    return `${startNoYear} – ${nbsp(formatDateShort(end))}`
  }

  return `${nbsp(formatDateShort(start))} – ${nbsp(formatDateShort(end))}`
}

/** Replaces ordinary spaces with non-breaking ones, gluing a phrase together
 *  so it wraps only where a caller leaves a real space outside it. */
function nbsp(text: string): string {
  return text.replace(/ /g, ' ')
}
