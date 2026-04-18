/**
 * Development: Next.js fetch disk cache (`.next/cache/fetch-cache`) can store
 * corrupted entries; replay then surfaces as `SyntaxError` from `JSON.parse`
 * (e.g. “Unexpected non-whitespace character after JSON at position …”).
 * Force `cache: 'no-store'` for backend API fetches so SSR always reads a fresh body.
 *
 * `url.startsWith(NEXT_PUBLIC_API_URL)` misses `localhost` vs `127.0.0.1` — same port,
 * different origin; those requests were not patched and could still hit the bad cache.
 */

function loopbackHost(h: string): boolean {
  const x = h.toLowerCase().replace(/^\[|\]$/g, '')
  return x === 'localhost' || x === '127.0.0.1' || x === '::1'
}

/** `NEXT_PUBLIC_API_URL` ile aynı backend’e giden istek (gevşek eşleşme). */
function isDevBackendApiUrl(requestUrl: string, apiBaseRaw: string): boolean {
  const apiBase = apiBaseRaw.replace(/\/$/, '')
  if (!apiBase) return false
  if (requestUrl.startsWith(apiBase)) return true
  try {
    const u = new URL(requestUrl)
    const b = new URL(apiBase)
    if (u.origin === b.origin) return true
    if (
      u.protocol === b.protocol &&
      u.port === b.port &&
      loopbackHost(u.hostname) &&
      loopbackHost(b.hostname) &&
      u.pathname.startsWith('/api/')
    ) {
      return true
    }
  } catch {
    return false
  }
  return false
}

export async function register() {
  if (process.env.NODE_ENV !== 'development') return
  /** Edge’de global fetch’i sarmalamayın — yalnızca Node sunucu. */
  if (process.env.NEXT_RUNTIME === 'edge') return

  const raw = process.env.NEXT_PUBLIC_API_URL
  if (!raw || typeof raw !== 'string') return
  const apiBase = raw.replace(/\/$/, '')
  if (!apiBase) return

  const orig = globalThis.fetch.bind(globalThis)
  globalThis.fetch = (async (...args: Parameters<typeof fetch>) => {
    const [input, init] = args
    let url: string
    if (typeof input === 'string') {
      url = input
    } else if (input instanceof URL) {
      url = input.href
    } else {
      url = (input as unknown as { url: string }).url
    }

    if (isDevBackendApiUrl(url, apiBase)) {
      const merged = { ...(init ?? {}) } as RequestInit & { next?: unknown }
      delete merged.next
      return orig(input, { ...merged, cache: 'no-store' })
    }
    return orig(...args)
  }) as typeof fetch
}
