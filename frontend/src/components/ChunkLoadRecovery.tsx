'use client'

import { useEffect } from 'react'

const STORAGE_KEY = 'travel_chunk_reload_once'

function isChunkLoadError(message: string): boolean {
  return /ChunkLoadError|Loading chunk \d+ failed|chunk load/i.test(message)
}

/**
 * Eski önbellekte kalan HTML + yeni deploy hash’leri yüzünden oluşan
 * ChunkLoadError’da tek seferlik otomatik yenileme — kullanıcıyı boş ekranda bırakmaz.
 * Deploy/proxy düzeltilene kadar geçici çözüm; kalıcı çözüm tam `/.next` senkronu + CDN purge’dur.
 */
export default function ChunkLoadRecovery() {
  useEffect(() => {
    function tryReloadOnce() {
      if (typeof window === 'undefined') return
      try {
        if (sessionStorage.getItem(STORAGE_KEY)) return
        sessionStorage.setItem(STORAGE_KEY, '1')
      } catch {
        return
      }
      window.location.reload()
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
