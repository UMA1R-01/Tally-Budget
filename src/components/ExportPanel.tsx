import { useEffect, useRef, useState } from 'react'
import { Download, RotateCcw, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import type { Transaction } from '@/types'
import { Button } from '@/components/ui/button'
import { exportBackup, parseBackup } from '@/services/backupService'
import { getDateRange } from '@/lib/ledger'
import { formatRange } from '@/lib/date'
import { cn } from '@/lib/utils'

interface ExportPanelProps {
  transactions: Transaction[]
  dayCount: number
  onImport: (transactions: Transaction[]) => void
  onResetAll: () => void
}

const CONFIRM_TIMEOUT_MS = 6000

export function ExportPanel({ transactions, dayCount, onImport, onResetAll }: ExportPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [confirmingReset, setConfirmingReset] = useState(false)
  const confirmTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const range = getDateRange(transactions)
  const count = transactions.length

  // Don't leave the ledger silently sitting in an armed "one more click
  // deletes everything" state if the user gets distracted.
  useEffect(() => {
    if (!confirmingReset) return
    confirmTimeout.current = setTimeout(() => setConfirmingReset(false), CONFIRM_TIMEOUT_MS)
    return () => {
      if (confirmTimeout.current) clearTimeout(confirmTimeout.current)
    }
  }, [confirmingReset])

  async function handleBackup() {
    try {
      const saved = await exportBackup(transactions)
      if (!saved) return // user cancelled the save dialog
      toast.success('Backup saved', { description: `${count} entries written to a .json file` })
    } catch (error) {
      console.error('Backup failed', error)
      toast.error('Could not save the backup')
    }
  }

  async function handleRestoreFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = '' // allow re-picking the same file
    if (!file) return

    try {
      const { transactions: restored, repaired, dropped } = parseBackup(await file.text())
      onImport(restored)
      const notes = [
        repaired > 0 ? `${repaired} repaired` : null,
        dropped > 0 ? `${dropped} unreadable` : null,
      ].filter(Boolean)
      toast.success(`Restored ${restored.length} ${restored.length === 1 ? 'entry' : 'entries'}`, {
        description: notes.length > 0 ? notes.join(' · ') : file.name,
      })
    } catch (error) {
      toast.error('Could not restore that file', {
        description: error instanceof Error ? error.message : undefined,
      })
    }
  }

  function handleConfirmReset() {
    setConfirmingReset(false)
    onResetAll()
  }

  return (
    <div className="mt-auto rounded-[13px] border border-dashed border-ink-line p-4">
      <h2 className="text-[13.5px] font-bold tracking-[-0.005em] text-paper">Backup &amp; Restore</h2>
      <p className="mt-1 text-[11.5px] text-ink-muted">
        {count} {count === 1 ? 'entry' : 'entries'} · {dayCount} {dayCount === 1 ? 'day' : 'days'}
        {range ? ` · ${formatRange(range.start, range.end)}` : ''}
      </p>

      <div className="mt-3 flex gap-1.5">
        <Button type="button" variant="quiet" size="sm" className="flex-1" onClick={handleBackup}>
          <Download aria-hidden />
          Backup
        </Button>
        <Button
          type="button"
          variant="quiet"
          size="sm"
          className="flex-1"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload aria-hidden />
          Restore
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          onChange={handleRestoreFile}
          tabIndex={-1}
          aria-hidden
        />
      </div>

      {/* Reset: a real second step before anything happens — undo-toast alone
          isn't enough of a safety net for wiping an entire ledger, since the
          undo history only lives in memory and a reload before noticing
          would make it permanent. Coloured red at rest, not just on hover,
          so it reads as "the dangerous one" before you even touch it — and
          built from the same Button component as Backup/Restore so it has
          equal visual weight instead of reading as a stray text link. */}
      <div className="mt-3 border-t border-ink-line pt-3">
        {confirmingReset ?
          <div className="flex items-center gap-2">
            <p className="flex-1 text-[11px] leading-snug text-paper">
              Delete all {count} {count === 1 ? 'entry' : 'entries'}?
            </p>
            <Button type="button" variant="quiet" size="sm" onClick={() => setConfirmingReset(false)}>
              <X aria-hidden />
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className="bg-flare text-white hover:brightness-110 focus-visible:ring-2 focus-visible:ring-flare"
              onClick={handleConfirmReset}
              disabled={count === 0}
            >
              Delete all
            </Button>
          </div>
        : <Button
            type="button"
            size="sm"
            disabled={count === 0}
            onClick={() => setConfirmingReset(true)}
            className={cn(
              'w-full border border-flare/30 bg-flare/10 text-flare',
              'hover:border-flare/50 hover:bg-flare/15',
              'focus-visible:ring-2 focus-visible:ring-flare',
              'disabled:border-ink-line disabled:bg-transparent disabled:text-ink-muted',
            )}
          >
            <RotateCcw aria-hidden />
            Reset all entries
          </Button>
        }
      </div>
    </div>
  )
}
