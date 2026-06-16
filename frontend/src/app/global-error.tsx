'use client'

import { useEffect, useState } from 'react'
import {
  clearChunkReloadFlag,
  hardReloadOnceForChunkError,
  isChunkLoadError,
} from '@/lib/chunk-load-recovery'

/**
 * Next varsayılan hata ekranı gerçek mesajı göstermez; üretimde teşhis için burada görünür.
 * ChunkLoadError: otomatik sert yenileme (reset() aynı bozuk chunk'ı tekrar yükler).
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const digest = error.digest
  const chunkError = isChunkLoadError(error.message ?? '')
  const [recovering, setRecovering] = useState(chunkError)

  useEffect(() => {
    if (!chunkError) return
    const started = hardReloadOnceForChunkError()
    if (!started) setRecovering(false)
  }, [chunkError])

  const detail =
    error.stack && process.env.NODE_ENV !== 'production'
      ? `\n\n${error.stack}`
      : ''

  if (chunkError && recovering) {
    return (
      <html lang="tr">
        <body
          style={{
            fontFamily: 'system-ui, sans-serif',
            padding: '2rem',
            maxWidth: 720,
            margin: '0 auto',
            lineHeight: 1.5,
          }}
        >
          <p style={{ color: '#52525b' }}>Sayfa güncelleniyor…</p>
        </body>
      </html>
    )
  }

  return (
    <html lang="tr">
      <body
        style={{
          fontFamily: 'system-ui, sans-serif',
          padding: '2rem',
          maxWidth: 720,
          margin: '0 auto',
          lineHeight: 1.5,
        }}
      >
        <h1 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Sayfa yüklenirken hata</h1>
        {chunkError ? (
          <p style={{ color: '#52525b', fontSize: '0.9rem' }}>
            Site güncellendi; tarayıcınız eski bir sayfa parçasını arıyor. Aşağıdaki düğme ile tam
            yenileme yapın (gerekirse Ctrl+F5).
          </p>
        ) : (
          <p style={{ color: '#52525b', fontSize: '0.9rem' }}>
            Bu ekran istemci tarafında bir istisna sonrası çıkar. İlk satırdaki mesajı ve varsa{' '}
            <code>digest</code> değerini kaydedin; tarayıcı konsolundaki (F12) kırmızı hata ile
            karşılaştırın.
          </p>
        )}
        <pre
          style={{
            background: '#f4f4f5',
            padding: '1rem',
            overflow: 'auto',
            fontSize: '0.8rem',
            borderRadius: 8,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {error.message || String(error)}
          {digest ? `\n\ndigest: ${digest}` : ''}
          {detail}
        </pre>
        <div style={{ marginTop: '1.25rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          <button
            type="button"
            onClick={() => {
              if (chunkError) {
                clearChunkReloadFlag()
                hardReloadOnceForChunkError(true)
                return
              }
              reset()
            }}
            style={{
              padding: '0.5rem 1rem',
              cursor: 'pointer',
              borderRadius: 6,
              border: 'none',
              background: '#18181b',
              color: '#fff',
            }}
          >
            {chunkError ? 'Tam yenile' : 'Yeniden dene'}
          </button>
          <button
            type="button"
            onClick={() => {
              window.location.href = '/'
            }}
            style={{
              padding: '0.5rem 1rem',
              cursor: 'pointer',
              borderRadius: 6,
              border: '1px solid #d4d4d8',
              background: '#fff',
            }}
          >
            Ana sayfa
          </button>
        </div>
      </body>
    </html>
  )
}
