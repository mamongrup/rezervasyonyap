/**
 * Node fetch için geçici ağ hatalarında yeniden deneme + anlaşılır hata.
 * Travelrobot / Wtatil / Tatilsepeti import'larında ortak kullanılır.
 */

export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

export function isTransientNetworkError(error) {
  const message = [
    error?.name,
    error?.message,
    error?.cause?.code,
    error?.cause?.message,
    error?.cause?.cause?.code,
    error?.code,
  ]
    .filter(Boolean)
    .join(' ')
  return /fetch failed|TimeoutError|AbortError|ECONN|ETIMEDOUT|ENETUNREACH|EHOSTUNREACH|EAI_AGAIN|ENOTFOUND|UND_ERR|socket|network|TLS|SSL/i.test(
    message,
  )
}

export function formatFetchNetworkError(label, error) {
  const cause = error?.cause
  const parts = [
    cause?.code,
    cause?.syscall,
    cause?.hostname || cause?.address,
    cause?.port != null ? `port ${cause.port}` : '',
    cause?.message && cause.message !== error?.message ? cause.message : '',
  ].filter(Boolean)
  const detail = parts.length ? parts.join(' ') : error?.message || String(error)
  return `${label}: ağ bağlantısı başarısız — ${detail}`
}

/**
 * @param {string} url
 * @param {RequestInit & { timeoutMs?: number, retries?: number, retryBaseMs?: number, label?: string }} [opts]
 */
export async function fetchWithRetry(url, opts = {}) {
  const {
    timeoutMs = Number(process.env.PROVIDER_FETCH_TIMEOUT_MS || 60_000),
    retries = Number(process.env.PROVIDER_FETCH_RETRIES || 4),
    retryBaseMs = Number(process.env.PROVIDER_FETCH_RETRY_BASE_MS || 1500),
    label = url,
    ...fetchInit
  } = opts

  let lastError = null
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) {
      const wait = retryBaseMs * 2 ** (attempt - 1) + Math.floor(Math.random() * 250)
      await sleep(wait)
    }
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null
    const timer =
      timeoutMs > 0 && controller
        ? setTimeout(() => controller.abort(), timeoutMs)
        : null
    try {
      const signal =
        fetchInit.signal ||
        (controller
          ? controller.signal
          : timeoutMs > 0 && typeof AbortSignal !== 'undefined' && AbortSignal.timeout
            ? AbortSignal.timeout(timeoutMs)
            : undefined)
      const res = await fetch(url, { ...fetchInit, ...(signal ? { signal } : {}) })
      if (timer) clearTimeout(timer)
      return res
    } catch (error) {
      if (timer) clearTimeout(timer)
      lastError = error
      const timedOut = error?.name === 'TimeoutError' || error?.name === 'AbortError'
      if (timedOut && attempt >= retries) {
        throw new Error(`${label}: zaman aşımı (${timeoutMs}ms)`, { cause: error })
      }
      if (!isTransientNetworkError(error) || attempt >= retries) {
        throw new Error(formatFetchNetworkError(label, error), { cause: error })
      }
    }
  }
  throw new Error(formatFetchNetworkError(label, lastError), { cause: lastError })
}
