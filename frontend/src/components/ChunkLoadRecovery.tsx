'use client'

import { useEffect } from 'react'
import {
  hardReloadOnceForChunkError,
  isChunkLoadError,
  stripChunkRecoverParam,
} from '@/lib/chunk-load-recovery'

/**
 * ChunkLoadError'da tek seferlik otomatik yenileme.
 * Kalıcı çözüm: deploy sırasında travel-web durdur → rm -rf .next → build → restart.
 */
export default function ChunkLoadRecovery() {
  useEffect(() => {
    stripChunkRecoverParam()
  }, [])

  useEffect(() => {
    function tryReloadOnce(reason: unknown) {
      const msg =
        reason instanceof Error
          ? reason.message
          : typeof reason === 'string'
            ? reason
            : ''
      if (msg && isChunkLoadError(msg)) hardReloadOnceForChunkError()
    }

    function onUnhandledRejection(ev: PromiseRejectionEvent) {
      tryReloadOnce(ev.reason)
    }

    function onError(ev: ErrorEvent) {
      tryReloadOnce(ev.message ?? ev.error)
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
