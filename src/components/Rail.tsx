import { useState } from 'react'
import { FileDown } from 'lucide-react'
import { toast } from 'sonner'
import type { Transaction } from '@/types'
import type { NewTransactionInput } from '@/hooks/useTransactions'
import type { Currency } from '@/lib/currency'
import { EntryForm } from '@/components/EntryForm'
import { ExportPanel } from '@/components/ExportPanel'
import { CurrencySelect } from '@/components/CurrencySelect'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { exportStatementToPdf } from '@/services/exportService'

interface RailProps {
  transactions: Transaction[]
  dayCount: number
  storageWritable: boolean
  currency: Currency
  onCurrencyChange: (code: string) => void
  onAdd: (input: NewTransactionInput) => void
  onImport: (transactions: Transaction[]) => void
  onResetAll: () => void
}

export function Rail({
  transactions,
  dayCount,
  storageWritable,
  currency,
  onCurrencyChange,
  onAdd,
  onImport,
  onResetAll,
}: RailProps) {
  const [isExportingPdf, setIsExportingPdf] = useState(false)

  async function handleExportPdf() {
    setIsExportingPdf(true)
    try {
      await exportStatementToPdf(transactions, currency) // false = user cancelled the save dialog, nothing to report
    } catch (error) {
      console.error('PDF export failed', error)
      toast.error('Could not generate the PDF')
    } finally {
      setIsExportingPdf(false)
    }
  }

  return (
    <aside className="ink-scroll order-3 flex flex-col gap-6 bg-ink px-8 py-8 text-paper md:order-1 md:w-[400px] md:shrink-0 md:overflow-y-auto">
      <div className="flex flex-col gap-2">
        <Label htmlFor="currency-trigger">Currency</Label>
        <CurrencySelect code={currency.code} onChange={onCurrencyChange} />
      </div>

      <EntryForm onAdd={onAdd} currency={currency} />

      <Button
        type="button"
        variant="outlineVolt"
        size="lg"
        className="w-full shrink-0 border-2 bg-volt/10 font-display font-extrabold tracking-[-0.01em]"
        disabled={transactions.length === 0 || isExportingPdf}
        onClick={handleExportPdf}
      >
        <FileDown aria-hidden />
        {isExportingPdf ? 'Exporting…' : 'Export PDF'}
      </Button>

      <ExportPanel
        transactions={transactions}
        dayCount={dayCount}
        onImport={onImport}
        onResetAll={onResetAll}
      />

      {/* ink-faint (#5E5A54) measures ~2.9:1 against the ink background —
          under even the 3:1 large-text floor, let alone body-text AA. This
          message is also a data-loss warning, not decorative metadata, so
          ink-muted (~5.6:1, a real AA pass) is the right floor, not just a
          nice-to-have. */}
      <p className="text-[10.5px] leading-relaxed text-ink-muted">
        {storageWritable ?
          <>
            Auto-saved to this browser, and nowhere else. Clearing site data, private windows, or
            switching devices loses the ledger — keep a backup.
          </>
        : <span className="text-flare">
            This browser is refusing to save. Your entries live only in this tab until you export a
            backup.
          </span>
        }
      </p>
    </aside>
  )
}
