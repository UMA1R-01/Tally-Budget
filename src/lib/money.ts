/**
 * Money helpers.
 *
 * The currency symbol is always passed in explicitly rather than asked for
 * from `Intl.NumberFormat('en-PK', { currency: 'PKR' })`: that renders as
 * "PKR", "Rs", or "₨" depending on the browser's ICU build, so any code that
 * string-replaces the symbol afterwards works on one machine and quietly
 * fails on the next. Formatting the *number* with Intl (grouping and digits
 * are what it is genuinely good at) and sourcing the symbol from the curated
 * list in lib/currency.ts is stable everywhere, including inside the PDF —
 * and works the same way for any of that list's currencies, not just one.
 */

/** Round to 2dp. Kills float drift like 0.1 + 0.2 before it reaches a total. */
export function roundMoney(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.round((value + Number.EPSILON) * 100) / 100
}

/**
 * Format a magnitude. Decimals appear only when they carry information, and
 * the same rule applies to line items and to the summary totals — so adding up
 * what you can see always matches the total you are shown.
 */
export function formatAmount(value: number): string {
  const rounded = roundMoney(Math.abs(value))
  const decimals = Number.isInteger(rounded) ? 0 : 2
  return rounded.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: 2,
  })
}

/** `$73,270` / `€73,270.50` */
export function formatMoney(value: number, symbol: string): string {
  const sign = roundMoney(value) < 0 ? '−' : ''
  return `${sign}${symbol} ${formatAmount(value)}`
}

/** `+45,000` / `−8,450.50` — for ledger rows, where the sign is the signal. */
export function formatSigned(value: number): string {
  const rounded = roundMoney(value)
  if (rounded === 0) return formatAmount(0)
  return `${rounded > 0 ? '+' : '−'}${formatAmount(rounded)}`
}

/**
 * Parse user keystrokes into a magnitude.
 * Tolerates grouping commas, a leading currency symbol/code, and both minus
 * glyphs; returns null for anything that isn't a usable number so callers can
 * reject rather than silently coerce it to 0.
 */
export function parseAmount(input: string): number | null {
  const cleaned = input
    .replace(/[,\s]/g, '')
    .replace(/^[^\d.\-+]+/, '') // strip any leading currency symbol/code
    .replace(/[−–—]/g, '-')
    .trim()
  if (cleaned === '' || cleaned === '-' || cleaned === '.') return null
  const value = Number(cleaned)
  if (!Number.isFinite(value)) return null
  return roundMoney(Math.abs(value))
}
