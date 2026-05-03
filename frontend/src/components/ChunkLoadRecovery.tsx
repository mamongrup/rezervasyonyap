'use client'

import { useEffect } from 'react'

const STORAGE_KEY = 'travel_chunk_reload_once'
const RECOVER_PARAM = '_chunkRecover'

function isChunkLoadError(message: string): boolean {
  return /ChunkLoadError|Loading chunk \d+ failed|chunk load/i.test(message)
}

function stripRecoverParam() {
  if (typeof window === 'undefined') return
  try {
    const u = new URL(window.location.href)
    if (!u.searchParams.has(RECOVER_PARAM)) return
    u.searchParams.delete(RECOVER_PARAM)
    const qs = u.searchParams.toString()
    const next = `${u.pathname}${qs ? `?${qs}` : ''}${u.hash}`
    window.history.replaceState(window.history.state, '', next)
  } catch {
    /* */
  }
}

/**
 * Eski önbellekte kalan HTML + yeni deploy hash’leri yüzünden oluşan
 * ChunkLoadError’da tek seferlik otomatik yenileme — kullanıcıyı boş ekranda bırakmaz.
 * `location.reload()` bazı ortamlarda aynı önbellekli dokümanı getirir; bu yüzden tek seferlik
 * `replace` + cache-bypass sorgu parametresi kullanılır.
 * Kalıcı çözüm: `/.next` senkronu, tek canonical host (www/apex), CDN/HTML cache purge.
 */
export default function ChunkLoadRecovery() {
  useEffect(() => {
    stripRecoverParam()
  }, [])

  useEffect(() => {
    function tryReloadOnce() {
      if (typeof window === 'undefined') return
      try {
        if (sessionStorage.getItem(STORAGE_KEY)) return
        sessionStorage.setItem(STORAGE_KEY, '1')
      } catch {
        return
      }
      const u = new URL(window.location.href)
      u.searchParams.set(RECOVER_PARAM, String(Date.now()))
      window.location.replace(u.toString())
    }

    function onUnhandledRejection(ev: PromiseRejectionEvent) {
      const r = ev.reason
      const msg = r instanceof Error ? r.message : typeof r === 'string' ? r : ''
      if (msg && isChunkLoadError(msg)) tryReloadOnce()
    }

    function onError(ev: ErrorEvent) {
      const msg = ev.message ?? ''
      if (msg && isChunkLoadError(msg)) tryReloadOnce()
    }

    window.addEventListener('unhandledrejection', onUnhandledRejection)
    window.addEventListener('error', onError)
    return () => {
      window.removeEventListener('unhandledrejection', onUnhandledRejection)
      window.removeEventListener('error', onError)
    }
  }, [])

  return null
}
