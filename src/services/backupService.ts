import type { Transaction } from '@/types'
import { SCHEMA_VERSION, sanitizeTransactions } from '@/lib/storage'
import { saveBlob } from '@/lib/download'
import { todayISO } from '@/lib/date'

/**
 * JSON backup / restore.
 *
 * The PDF is a display artifact — it cannot be read back in. This is the part
 * that makes the ledger portable: move it to another browser, another machine,
 * or keep a copy before clearing site data. Without it, "auto-saved to your
 * browser" quietly means "one bad cache clear from gone".
 */

export interface BackupFile {
  app: 'tally'
  schemaVersion: number
  exportedAt: string
  transactions: Transaction[]
}

/** Returns false if the user cancelled the save dialog. */
export async function exportBackup(transactions: Transaction[]): Promise<boolean> {
  const payload: BackupFile = {
    app: 'tally',
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    transactions,
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json;charset=utf-8',
  })
  return saveBlob(blob, `Tally_Backup_${todayISO()}.json`, [{ name: 'JSON', extensions: ['json'] }])
}

export interface RestoreResult {
  transactions: Transaction[]
  repaired: number
  dropped: number
}

/**
 * Accepts either a full backup file or a bare array of transactions, so a
 * hand-edited file or an older export still restores. Throws only when the
 * text is not JSON, or holds nothing usable at all.
 */
export function parseBackup(text: string): RestoreResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('That file is not valid JSON.')
  }

  const raw =
    Array.isArray(parsed) ? parsed
    : typeof parsed === 'object' && parsed !== null && 'transactions' in parsed ?
      (parsed as { transactions: unknown }).transactions
    : null

  if (!Array.isArray(raw)) {
    throw new Error('No transactions found in that file.')
  }

  const { transactions, repaired, dropped } = sanitizeTransactions(raw)
  if (transactions.length === 0 && raw.length > 0) {
    throw new Error('None of the rows in that file could be read.')
  }

  return { transactions, repaired, dropped }
}

export async function readFileAsText(file: File): Promise<string> {
  return await file.text()
}
