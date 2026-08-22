import type { DateRange, DayGroup, Totals, Transaction } from '@/types'
import { roundMoney } from '@/lib/money'

/**
 * Everything on screen is derived from the transaction list on every render —
 * nothing is cached or denormalised, so an edit, an add, or a delete can never
 * leave a total disagreeing with the rows above it.
 */

export function calculateTotals(transactions: Transaction[]): Totals {
  let income = 0
  let expense = 0

  for (const tx of transactions) {
    if (tx.type === 'income') income += tx.amount
    else expense += tx.amount
  }

  income = roundMoney(income)
  expense = roundMoney(expense)
  return { income, expense, net: roundMoney(income - expense) }
}

/** Day buckets, oldest first; insertion order preserved within a day. */
export function groupByDay(transactions: Transaction[]): DayGroup[] {
  const buckets = new Map<string, Transaction[]>()

  for (const tx of transactions) {
    const bucket = buckets.get(tx.date)
    if (bucket) bucket.push(tx)
    else buckets.set(tx.date, [tx])
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, txs]) => {
      const { income, expense, net } = calculateTotals(txs)
      return { date, transactions: txs, income, expense, net }
    })
}

export function getDateRange(transactions: Transaction[]): DateRange | null {
  if (transactions.length === 0) return null

  let start = transactions[0]!.date
  let end = start

  for (const tx of transactions) {
    if (tx.date < start) start = tx.date
    if (tx.date > end) end = tx.date
  }

  return { start, end }
}
