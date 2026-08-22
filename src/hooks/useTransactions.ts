import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import type { Transaction, TransactionType } from '@/types'
import { loadTransactions, saveTransactions, type LoadResult } from '@/lib/storage'
import { createId } from '@/lib/id'
import { roundMoney } from '@/lib/money'

export interface NewTransactionInput {
  date: string
  type: TransactionType
  description: string
  amount: number
}

const HISTORY_LIMIT = 100

/**
 * Typing a description one keystroke at a time still commits to state (and
 * localStorage) on every character — that's deliberate, see the ledger row
 * comment. But recording a *history* entry per keystroke would mean holding
 * Ctrl+Z fifteen times to undo typing one word. Edits to the same field on
 * the same row within this window are treated as one undo step; a pause
 * longer than this, or a change of field/row, starts a new one.
 */
const COALESCE_MS = 600

/**
 * transactions/past/future live in ONE reducer, not three separate useState
 * calls. Two bugs made that worth doing:
 *
 *  1. `undo`/`redo` need to read past *and* write future *and* write
 *     transactions together. Nesting a `setFuture(...)` call inside
 *     `setPast(prev => ...)`'s updater is impure — React Strict Mode
 *     double-invokes updater functions specifically to catch that, so every
 *     keypress was firing those nested calls twice.
 *  2. Even with flat (non-nested) calls, `undo`/`redo` as separate
 *     useCallbacks closing over separately-updated `past`/`future` state
 *     break under rapid-fire calls in the same batch (e.g. fast repeated
 *     keypresses): each call reads the same pre-batch snapshot, so three
 *     calls in one tick only step back once.
 *
 * A single pure reducer sidesteps both: React chains dispatches within a
 * batch through the reducer in order, and there is nothing here for Strict
 * Mode's double-invocation to catch, since the function has no side effects.
 */
interface HistoryState {
  transactions: Transaction[]
  past: Transaction[][]
  future: Transaction[][]
}

type Action =
  | { type: 'add'; transaction: Transaction }
  | { type: 'update'; id: string; patch: Partial<Omit<Transaction, 'id'>>; coalesce: boolean }
  | { type: 'remove'; id: string }
  | { type: 'replaceAll'; next: Transaction[] }
  | { type: 'undo' }
  | { type: 'redo' }

function pushHistory(
  past: Transaction[][],
  snapshot: Transaction[],
): { past: Transaction[][]; future: Transaction[][] } {
  const trimmed = past.length >= HISTORY_LIMIT ? past.slice(1) : past
  return { past: [...trimmed, snapshot], future: [] }
}

function reducer(state: HistoryState, action: Action): HistoryState {
  switch (action.type) {
    case 'add': {
      const { past, future } = pushHistory(state.past, state.transactions)
      return { transactions: [...state.transactions, action.transaction], past, future }
    }
    case 'update': {
      const nextTransactions = state.transactions.map((tx) => {
        if (tx.id !== action.id) return tx
        const next: Transaction = { ...tx, ...action.patch }
        // Amount is always stored as a positive magnitude; direction is `type`.
        next.amount = roundMoney(Math.abs(next.amount))
        return next
      })
      if (action.coalesce) {
        return { ...state, transactions: nextTransactions }
      }
      const { past, future } = pushHistory(state.past, state.transactions)
      return { transactions: nextTransactions, past, future }
    }
    case 'remove': {
      if (!state.transactions.some((tx) => tx.id === action.id)) return state
      const { past, future } = pushHistory(state.past, state.transactions)
      return { transactions: state.transactions.filter((tx) => tx.id !== action.id), past, future }
    }
    case 'replaceAll': {
      const { past, future } = pushHistory(state.past, state.transactions)
      return { transactions: action.next, past, future }
    }
    case 'undo': {
      if (state.past.length === 0) return state
      const previous = state.past[state.past.length - 1]!
      return {
        transactions: previous,
        past: state.past.slice(0, -1),
        future: [...state.future, state.transactions],
      }
    }
    case 'redo': {
      if (state.future.length === 0) return state
      const next = state.future[state.future.length - 1]!
      return {
        transactions: next,
        past: [...state.past, state.transactions],
        future: state.future.slice(0, -1),
      }
    }
  }
}

/**
 * The single source of truth for the ledger, with linear undo/redo over
 * every mutation — add, inline edit, delete, and restore-from-backup all
 * push onto the same history stack, so Ctrl+Z always means "step back,"
 * whichever of those produced the last change.
 *
 * Every mutation flows through here and is written to localStorage by the
 * effect below, so persistence is not a separate step the user can forget —
 * add, edit, and delete are durable the moment they happen, independent of
 * the undo stack (which lives only in memory, and resets on reload).
 */
export function useTransactions() {
  // Read storage exactly once, before first paint.
  const [loadResult] = useState<LoadResult>(() => loadTransactions())
  const [state, dispatch] = useReducer(reducer, loadResult, (initial) => ({
    transactions: initial.transactions,
    past: [],
    future: [],
  }))
  const [storageWritable, setStorageWritable] = useState(true)

  // Burst-coalescing bookkeeping. A plain ref mutated from a callback, never
  // from inside the reducer — the reducer stays pure, this doesn't need to be.
  const lastEdit = useRef<{ key: string; time: number } | null>(null)

  useEffect(() => {
    const ok = saveTransactions(state.transactions)
    setStorageWritable((was) => (was === ok ? was : ok))
  }, [state.transactions])

  const add = useCallback((input: NewTransactionInput): Transaction => {
    const transaction: Transaction = {
      id: createId(),
      date: input.date,
      type: input.type,
      description: input.description.trim(),
      amount: roundMoney(Math.abs(input.amount)),
    }
    lastEdit.current = null
    dispatch({ type: 'add', transaction })
    return transaction
  }, [])

  const update = useCallback((id: string, patch: Partial<Omit<Transaction, 'id'>>) => {
    // Same row, same field(s), in rapid succession -> one history step.
    const key = `${id}:${Object.keys(patch).sort().join(',')}`
    const now = Date.now()
    const last = lastEdit.current
    const coalesce = last !== null && last.key === key && now - last.time < COALESCE_MS
    lastEdit.current = { key, time: now }
    dispatch({ type: 'update', id, patch, coalesce })
  }, [])

  const remove = useCallback(
    (id: string): boolean => {
      if (!state.transactions.some((tx) => tx.id === id)) return false
      lastEdit.current = null
      dispatch({ type: 'remove', id })
      return true
    },
    [state.transactions],
  )

  const replaceAll = useCallback((next: Transaction[]) => {
    lastEdit.current = null
    dispatch({ type: 'replaceAll', next })
  }, [])

  const undo = useCallback(() => {
    lastEdit.current = null
    dispatch({ type: 'undo' })
  }, [])

  const redo = useCallback(() => {
    lastEdit.current = null
    dispatch({ type: 'redo' })
  }, [])

  return {
    transactions: state.transactions,
    loadResult,
    /** False when localStorage refused the write (quota, private mode…). */
    storageWritable,
    add,
    update,
    remove,
    replaceAll,
    undo,
    redo,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
  }
}
