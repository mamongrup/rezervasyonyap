/** Eski HTML + yeni deploy hash → eksik _next/static/chunks dosyası. */
export const CHUNK_RELOAD_STORAGE_KEY = 'travel_chunk_reload_once'
export const CHUNK_RECOVER_PARAM = '_chunkRecover'

export function isChunkLoadError(message: string): boolean {
  const m = String(message ?? '').trim()
  if (!m) return false
  return (
    /ChunkLoadError/i.test(m) ||
    /Loading chunk [\d]+ failed/i.test(m) ||
    /Failed to fetch dynamically imported module/i.test(m) ||
    /Importing a module script failed/i.test(m) ||
    /error loading dynamically imported module/i.test(m) ||
    /\/_next\/static\/chunks\/.+\.js/i.test(m)
  )
}

export function stripChunkRecoverParam(): void {
  if (typeof window === 'undefined') return
  try {
    const u = new URL(window.location.href)
    if (!u.searchParams.has(CHUNK_RECOVER_PARAM)) return
    u.searchParams.delete(CHUNK_RECOVER_PARAM)
    const qs = u.searchParams.toString()
    const next = `${u.pathname}${qs ? `?${qs}` : ''}${u.hash}`
    window.history.replaceState(window.history.state, '', next)
  } catch {
    /* ignore */
  }
}

/** Tek seferlik sert yenileme — reset() chunk hatasını düzeltmez. */
export function hardReloadOnceForChunkError(force = false): boolean {
  if (typeof window === 'undefined') return false
  try {
    if (!force && sessionStorage.getItem(CHUNK_RELOAD_STORAGE_KEY)) return false
    sessionStorage.setItem(CHUNK_RELOAD_STORAGE_KEY, '1')
  } catch {
    return false
  }
  const u = new URL(window.location.href)
  u.searchParams.set(CHUNK_RECOVER_PARAM, String(Date.now()))
  window.location.replace(u.toString())
  return true
}

export function clearChunkReloadFlag(): void {
  try {
    sessionStorage.removeItem(CHUNK_RELOAD_STORAGE_KEY)
  } catch {
    /* ignore */
  }
}
