import { useEffect, useMemo, useRef } from 'react'
import { toast } from 'sonner'
import type { Transaction } from '@/types'
import { useTransactions, type NewTransactionInput } from '@/hooks/useTransactions'
import { useCurrency } from '@/hooks/useCurrency'
import { TitleBar } from '@/components/TitleBar'
import { Rail } from '@/components/Rail'
import { StatementHero } from '@/components/StatementHero'
import { LedgerTable } from '@/components/LedgerTable'
import { calculateTotals, getDateRange, groupByDay } from '@/lib/ledger'

export default function App() {
  const {
    transactions,
    loadResult,
    storageWritable,
    add,
    update,
    remove,
    replaceAll,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useTransactions()
  const { currency, setCode: setCurrencyCode } = useCurrency()

  // Everything below is recomputed from the transaction list on every render,
  // so totals, grouping, and the date range can never drift from the rows.
  const groups = useMemo(() => groupByDay(transactions), [transactions])
  const totals = useMemo(() => calculateTotals(transactions), [transactions])
  const range = useMemo(() => getDateRange(transactions), [transactions])

  useStartupNotices(loadResult, storageWritable)
  useUndoRedoShortcuts(undo, redo)

  function handleAdd(input: NewTransactionInput) {
    add(input)
  }

  function handleDelete(id: string) {
    const target = transactions.find((tx) => tx.id === id)
    if (!remove(id)) return

    // No confirm dialog: a modal on every delete is friction, and undo is the
    // better answer for a reversible action. The toast button and Ctrl+Z both
    // resolve to the same history stack, so they can never disagree.
    toast('Transaction deleted', {
      description: target?.description || 'Untitled entry',
      action: { label: 'Undo', onClick: undo },
    })
  }

  function handleImport(next: Transaction[]) {
    const count = transactions.length
    replaceAll(next)
    toast('Ledger replaced', {
      description: `${count} → ${next.length} entries`,
      action: { label: 'Undo', onClick: undo },
    })
  }

  function handleResetAll() {
    const count = transactions.length
    if (count === 0) return
    // ExportPanel already runs its own confirm step before calling this —
    // this is the actual mutation, going through the same replaceAll/undo
    // path as a JSON restore, so Ctrl+Z (or the toast button) reverses it
    // exactly like any other change.
    replaceAll([])
    toast(`Deleted all ${count} ${count === 1 ? 'entry' : 'entries'}`, {
      action: { label: 'Undo', onClick: undo },
    })
  }

  return (
    <div className="flex h-full flex-col">
      <TitleBar onUndo={undo} onRedo={redo} canUndo={canUndo} canRedo={canRedo} />

      <div className="flex min-h-0 flex-1 flex-col md:flex-row md:overflow-hidden">
        <Rail
          transactions={transactions}
          dayCount={groups.length}
          storageWritable={storageWritable}
          currency={currency}
          onCurrencyChange={setCurrencyCode}
          onAdd={handleAdd}
          onImport={handleImport}
          onResetAll={handleResetAll}
        />

        {/* THE SPINE — a perforated edge cut between rail and statement.
            Vertical on desktop, a tear-off strip under the statement on mobile. */}
        <div aria-hidden className="spine-h order-2 h-4 w-full shrink-0 bg-paper md:hidden" />
        <div aria-hidden className="spine order-2 hidden w-4 shrink-0 bg-paper md:block" />

        <main className="paper-scroll order-1 flex-1 bg-paper md:order-3 md:overflow-y-auto">
          <div className="@container mx-auto w-full max-w-[1000px] px-5 pb-14 pt-7 md:px-11 md:pb-16 md:pt-9">
            <StatementHero totals={totals} range={range} count={transactions.length} currency={currency} />
            <LedgerTable groups={groups} onUpdate={update} onDelete={handleDelete} />
          </div>
        </main>
      </div>
    </div>
  )
}

/**
 * Global Ctrl+Z / Ctrl+Y (and Ctrl/Cmd+Shift+Z as the common alternate for
 * redo). Deliberately not scoped to "focus is outside a text field": the
 * history stack already groups a burst of typing into one step (see
 * useTransactions' COALESCE_MS), so undoing mid-edit reverts that whole
 * in-progress edit — a reasonable reading of "undo my last change" for a
 * ledger, rather than fighting the browser's own per-character text undo.
 *
 * `undo`/`redo` get a new identity every time the history stack changes
 * (they close over `past`/`future`, see useTransactions). Subscribing the
 * window listener with them in the effect's dependency array would mean
 * removing and re-adding it on every single undo step — and, worse, a
 * narrow window on every re-subscription where a keypress lands on the
 * about-to-be-replaced closure and reads one-step-stale history. The ref
 * is updated on every render and the listener is attached exactly once, so
 * it always calls whichever version is current with no window at all.
 */
function useUndoRedoShortcuts(undo: () => void, redo: () => void) {
  const latest = useRef({ undo, redo })
  latest.current = { undo, redo }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.isComposing) return
      const mod = event.ctrlKey || event.metaKey
      if (!mod || event.altKey) return

      const key = event.key.toLowerCase()
      if (key === 'z' && !event.shiftKey) {
        event.preventDefault()
        latest.current.undo()
      } else if (key === 'y' || (key === 'z' && event.shiftKey)) {
        event.preventDefault()
        latest.current.redo()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])
}

/**
 * Storage problems are reported, never swallowed. Silently replacing an
 * unreadable ledger with sample data — and then overwriting the original on
 * the next keystroke — is how data disappears without anyone noticing.
 */
function useStartupNotices(
  loadResult: ReturnType<typeof useTransactions>['loadResult'],
  storageWritable: boolean,
) {
  const announced = useRef(false)

  useEffect(() => {
    if (announced.current) return
    announced.current = true

    if (loadResult.status === 'corrupt') {
      toast.warning('Stored ledger could not be read', {
        description: `Starting empty. The unreadable copy was kept under “${loadResult.backupKey}”.`,
        duration: 15000,
      })
    } else if (loadResult.status === 'repaired') {
      const parts = [
        loadResult.repaired > 0 ? `${loadResult.repaired} repaired` : null,
        loadResult.dropped > 0 ? `${loadResult.dropped} dropped` : null,
      ].filter(Boolean)
      toast.warning('Stored ledger needed fixing', {
        description: `${parts.join(' · ')} — check the amounts and dates below.`,
        duration: 12000,
      })
    } else if (loadResult.status === 'unavailable') {
      toast.warning('This browser is blocking storage', {
        description: 'Entries will vanish when the tab closes. Export a backup to keep them.',
        duration: 15000,
      })
    }
  }, [loadResult])

  const warnedWrite = useRef(false)
  useEffect(() => {
    if (storageWritable || warnedWrite.current) return
    warnedWrite.current = true
    toast.error('Changes are not being saved', {
      description: 'Storage is full or blocked. Export a backup before closing this tab.',
      duration: 15000,
    })
  }, [storageWritable])
}
