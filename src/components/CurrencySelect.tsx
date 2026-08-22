import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CURRENCIES, getCurrency } from '@/lib/currency'

interface CurrencySelectProps {
  code: string
  onChange: (code: string) => void
}

/** Sits under the wordmark: one currency for the whole ledger, easy to change. */
export function CurrencySelect({ code, onChange }: CurrencySelectProps) {
  const current = getCurrency(code)

  return (
    <Select value={code} onValueChange={onChange}>
      <SelectTrigger
        id="currency-trigger"
        aria-label="Currency"
        className="w-fit gap-1.5 border-ink-line bg-ink-raised px-2.5 py-1.5 text-[11px] normal-case tracking-normal text-ink-muted hover:border-ink-edge hover:text-paper"
      >
        {/* Explicit children so the trigger shows a compact symbol + code,
            not the full "— Name" text every SelectItem carries. */}
        <SelectValue>
          <span className="font-mono">{current.symbol}</span> {current.code}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="max-h-72">
        {CURRENCIES.map((c) => (
          // textValue decouples Radix's built-in keyboard typeahead from the
          // rendered content: without it, typing jumps by the item's visible
          // text, which starts with a currency glyph, not a letter — typing
          // "u" would never match "$ USD". This makes "usd" or "dollar"-style
          // typing (code or name) jump straight to the match while the list
          // is open, no separate search box needed.
          <SelectItem key={c.code} value={c.code} textValue={`${c.code} ${c.name}`}>
            <span className="font-mono text-ink-muted">{c.symbol}</span>{' '}
            <span>{c.code}</span>
            <span className="ml-1.5 text-ink-muted">— {c.name}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
