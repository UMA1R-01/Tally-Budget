import type { Transaction, TransactionType } from '@/types'
import { createId } from '@/lib/id'
import { isValidISODate, todayISO } from '@/lib/date'
import { roundMoney } from '@/lib/money'

export const STORAGE_KEY = 'tally_transactions'
export const SCHEMA_VERSION = 1

export type LoadStatus =
  | 'empty' // nothing stored yet — first run
  | 'ok' // stored data read back cleanly
  | 'repaired' // stored data was usable but some rows needed fixing
  | 'corrupt' // stored data was unreadable; the raw text was set aside
  | 'unavailable' // no localStorage at all (private mode, disabled storage)

export interface LoadResult {
  transactions: Transaction[]
  status: LoadStatus
  /** Rows that were fixed up (bad date, negative amount, missing id…). */
  repaired: number
  /** Rows too broken to keep. */
  dropped: number
  /** Where an unreadable payload was parked, so it is never destroyed silently. */
  backupKey?: string
}

/** localStorage throws rather than returning null in some locked-down contexts. */
function storage(): Storage | null {
  try {
    const s = globalThis.localStorage
    const probe = '__tally_probe__'
    s.setItem(probe, '1')
    s.removeItem(probe)
    return s
  } catch {
    return null
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Coerce one stored row into a valid Transaction, or null if it is beyond
 * saving. Anything hand-edited, half-migrated, or written by an older build
 * lands here, so this is deliberately forgiving — but it never lets an invalid
 * date or a negative amount through, because those are exactly the values that
 * poison the render pass and the totals.
 */
export function sanitizeTransaction(raw: unknown): { tx: Transaction; repaired: boolean } | null {
  if (!isRecord(raw)) return null

  let repaired = false

  const rawAmount = typeof raw.amount === 'string' ? Number(raw.amount) : raw.amount
  if (typeof rawAmount !== 'number' || !Number.isFinite(rawAmount)) return null

  let type: TransactionType
  if (raw.type === 'income' || raw.type === 'expense') {
    type = raw.type
  } else {
    // Unknown type: read the sign, which is the only other signal available.
    type = rawAmount < 0 ? 'expense' : 'income'
    repaired = true
  }

  // A negative magnitude flips totals the wrong way; fold the sign into type.
  let amount = rawAmount
  if (amount < 0) {
    amount = Math.abs(amount)
    type = 'expense'
    repaired = true
  }
  const rounded = roundMoney(amount)
  if (rounded !== amount) repaired = true

  let date: string
  if (isValidISODate(raw.date)) {
    date = raw.date
  } else {
    date = todayISO()
    repaired = true
  }

  let description: string
  if (typeof raw.description === 'string') {
    description = raw.description.trim()
  } else {
    description = ''
    repaired = true
  }

  let id: string
  if (typeof raw.id === 'string' && raw.id.length > 0) {
    id = raw.id
  } else {
    id = createId()
    repaired = true
  }

  return { tx: { id, date, type, description, amount: rounded }, repaired }
}

export function sanitizeTransactions(value: unknown): {
  transactions: Transaction[]
  repaired: number
  dropped: number
} {
  if (!Array.isArray(value)) return { transactions: [], repaired: 0, dropped: 0 }

  const transactions: Transaction[] = []
  const seenIds = new Set<string>()
  let repaired = 0
  let dropped = 0

  for (const raw of value) {
    const result = sanitizeTransaction(raw)
    if (!result) {
      dropped += 1
      continue
    }
    // Duplicate ids break React keys and every update-by-id path.
    if (seenIds.has(result.tx.id)) {
      result.tx.id = createId()
      result.repaired = true
    }
    seenIds.add(result.tx.id)
    if (result.repaired) repaired += 1
    transactions.push(result.tx)
  }

  return { transactions, repaired, dropped }
}

export function loadTransactions(): LoadResult {
  const store = storage()
  if (!store) {
    return { transactions: [], status: 'unavailable', repaired: 0, dropped: 0 }
  }

  const raw = store.getItem(STORAGE_KEY)
  if (raw === null) {
    return { transactions: [], status: 'empty', repaired: 0, dropped: 0 }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    // Unreadable. Park the original text under a timestamped key instead of
    // overwriting it with seed data — the user may want to recover it by hand.
    const backupKey = `${STORAGE_KEY}.corrupt.${Date.now()}`
    try {
      store.setItem(backupKey, raw)
    } catch {
      /* out of quota — nothing more we can do, but never throw during load */
    }
    return { transactions: [], status: 'corrupt', repaired: 0, dropped: 0, backupKey }
  }

  // Valid JSON of the wrong shape (`{}`, `null`, `42`) is corruption too.
  if (!Array.isArray(parsed)) {
    const backupKey = `${STORAGE_KEY}.corrupt.${Date.now()}`
    try {
      store.setItem(backupKey, raw)
    } catch {
      /* ignore */
    }
    return { transactions: [], status: 'corrupt', repaired: 0, dropped: 0, backupKey }
  }

  const { transactions, repaired, dropped } = sanitizeTransactions(parsed)
  return {
    transactions,
    status: repaired > 0 || dropped > 0 ? 'repaired' : 'ok',
    repaired,
    dropped,
  }
}

export function saveTransactions(transactions: Transaction[]): boolean {
  const store = storage()
  if (!store) return false
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(transactions))
    return true
  } catch {
    return false
  }
}

/** Raw stored text, for the crash screen's "download what's stored" escape hatch. */
export function readRawStorage(): string | null {
  return storage()?.getItem(STORAGE_KEY) ?? null
}

export function clearStorage(): void {
  try {
    storage()?.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}
