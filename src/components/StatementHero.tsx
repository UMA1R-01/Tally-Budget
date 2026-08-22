import type { ReactNode } from 'react'
import type { DateRange, Totals } from '@/types'
import type { Currency } from '@/lib/currency'
import { formatAmount, formatMoney } from '@/lib/money'
import { formatRange } from '@/lib/date'
import { cn } from '@/lib/utils'

interface StatementHeroProps {
  totals: Totals
  range: DateRange | null
  count: number
  currency: Currency
}

/**
 * "Divider Rule Row": Revenue / Expenses / Period sit in one row under the
 * net figure, separated by hairlines rather than gaps or boxes — a spec-sheet
 * row, not a floating card. Values share the net figure's own display face
 * (Bricolage, extrabold) so the strip reads as one typographic family instead
 * of a smaller, mismatched thing bolted on beneath it.
 */
export function StatementHero({ totals, range, count, currency }: StatementHeroProps) {
  const negative = totals.net < 0

  return (
    <section className="border-b-2 border-ink pb-7">
      <p className="lbl text-paper-muted">Net position</p>
      <p
        aria-live="polite"
        className={cn(
          'relative mt-3 inline-block font-display text-[52px] font-extrabold leading-[0.88] tracking-[-0.045em] md:text-hero',
          negative && 'text-flare',
        )}
      >
        {/* The signature move: a volt sweep struck through the hero figure —
            only when it's something to celebrate. A negative position stays
            plain flare text, no highlight bar underneath. */}
        {!negative && (
          <span
            aria-hidden
            className="absolute inset-x-[-6px] bottom-[6px] h-[13px] bg-volt md:bottom-[7px] md:h-[17px]"
          />
        )}
        <span className="relative">{formatMoney(totals.net, currency.symbol)}</span>
      </p>

      {/* Weighted thirds, not a size-to-content race and not a flat 33/33/33
          either: Revenue/Expenses are usually shorter (bounded currency
          figures), Period is structurally the longest (a date range plus a
          year), so it's given more of the row by default — but every cell's
          share is still a guaranteed, bounded proportion of the row, so
          nothing can ever starve another down to nothing the way unbounded
          content-width cells could. Nothing truncates: whatever doesn't fit
          its share wraps instead — but only at a *safe* point specific to
          what the value actually is, never mid-token:
           - amounts (softBreak, below) only break after a thousands comma,
             so "5,982,385.36" can become "5,982," / "385.36" but never
             "5,9" / "82,385.36"
           - dates (the non-breaking spaces inside each date in formatRange)
             only break between the two dates of a range, one date per line,
             never splitting a single date in half
          Both are plain CSS wrap decisions — no runtime measurement to ever
          drift from what's actually rendered.

          All three share one font size, scaled off the row's own rendered
          width (@container on the statement wrapper in App.tsx) rather than
          the viewport: the rail eats a fixed 400px+ regardless of window
          size, so a viewport breakpoint can't tell a genuinely wide window
          from one where this row is actually squeezed. */}
      <div className="mt-8 flex divide-x divide-paper-line border-t-[1.5px] border-ink">
        <Cell label="Revenue" className="pr-4 sm:pr-8">
          <span className="text-moss">+{softBreak(formatAmount(totals.income))}</span>
        </Cell>
        <Cell label="Expenses" className="px-4 sm:px-8">
          <span className="text-flare">−{softBreak(formatAmount(totals.expense))}</span>
        </Cell>
        {/* Entry count rides on the label line instead of a third stacked
            line — same label-then-value height as its siblings, so the row
            keeps one shared rhythm across all three cells. */}
        <Cell
          label={`Period · ${count} ${count === 1 ? 'entry' : 'entries'}`}
          className="pl-4 sm:pl-8"
          weight={1.6}
        >
          {range ?
            formatRange(range.start, range.end)
          : <span className="italic text-paper-muted">No activity</span>}
        </Cell>
      </div>
    </section>
  )
}

/** Lets an amount wrap only right after a thousands comma — a real, legible
 *  break in a long number, rather than the character-count-driven break
 *  `overflow-wrap` would otherwise make anywhere it runs out of room. */
function softBreak(text: string): string {
  return text.replace(/,/g, ',​')
}

function Cell({
  label,
  children,
  className,
  weight = 1,
}: {
  label: string
  children: ReactNode
  className?: string
  weight?: number
}) {
  return (
    <div className={cn('min-w-0 pt-5', className)} style={{ flex: `${weight} 1 0%` }}>
      <p className="lbl text-paper-muted">{label}</p>
      <p className="mt-2 break-words font-display text-[16px] font-extrabold leading-tight tracking-[-0.03em] tabular-nums @min-[420px]:text-[19px] @min-[520px]:text-[22px] @min-[680px]:text-[26px] @min-[860px]:text-[30px]">
        {children}
      </p>
    </div>
  )
}
