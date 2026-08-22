import { useCallback, useState } from 'react'
import { DEFAULT_CURRENCY_CODE, getCurrency, isKnownCurrencyCode } from '@/lib/currency'

const STORAGE_KEY = 'tally_currency'

function readStoredCode(): string {
  try {
    const stored = globalThis.localStorage?.getItem(STORAGE_KEY)
    return isKnownCurrencyCode(stored) ? stored : DEFAULT_CURRENCY_CODE
  } catch {
    return DEFAULT_CURRENCY_CODE
  }
}

/**
 * One currency for the whole ledger, not per-transaction — a household ledger
 * is denominated in a single currency, and per-row currency would need
 * conversion rates this app has no business fetching. Persisted separately
 * from the transactions so switching currency never touches stored amounts,
 * only how they're labelled.
 */
export function useCurrency() {
  const [code, setCodeState] = useState<string>(readStoredCode)

  const setCode = useCallback((next: string) => {
    setCodeState(next)
    try {
      globalThis.localStorage?.setItem(STORAGE_KEY, next)
    } catch {
      /* ignore — falls back to session-only */
    }
  }, [])

  return { currency: getCurrency(code), setCode }
}
