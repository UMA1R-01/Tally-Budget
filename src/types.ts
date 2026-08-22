export type TransactionType = 'income' | 'expense'

export interface Transaction {
  id: string
  /** Local calendar date, `YYYY-MM-DD`. Always a valid date — see lib/storage.ts. */
  date: string
  type: TransactionType
  description: string
  /** Always a non-negative, 2dp-rounded magnitude. Direction lives in `type`. */
  amount: number
}

/** A day's worth of transactions, in insertion order. */
export interface DayGroup {
  date: string
  transactions: Transaction[]
  income: number
  expense: number
  net: number
}

export interface Totals {
  income: number
  expense: number
  net: number
}

export interface DateRange {
  start: string
  end: string
}
