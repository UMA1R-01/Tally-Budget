/**
 * `crypto.randomUUID()` only exists in secure contexts — HTTPS or localhost.
 * Serve this app over plain HTTP on a LAN address (entirely plausible for a
 * household tool on a home server) and it is `undefined`, so "Add Transaction"
 * would throw inside the click handler and appear to do nothing at all.
 * Fall back through `getRandomValues` to `Math.random` so an id is always
 * produced; these ids are local keys, never security tokens.
 */
export function createId(): string {
  const c = globalThis.crypto as Crypto | undefined

  if (typeof c?.randomUUID === 'function') {
    return c.randomUUID()
  }

  if (typeof c?.getRandomValues === 'function') {
    const bytes = c.getRandomValues(new Uint8Array(16))
    bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40
    bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
  }

  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}
