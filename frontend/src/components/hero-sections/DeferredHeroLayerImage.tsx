'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'

function slotUnopt(u: string) {
  return u.startsWith('http') || u.startsWith('/uploads/')
}

/**
 * Hero mozaik / freeform ikincil katmanlar — LCP görseliyle bant yarışmasın.
 * window load + kısa idle sonrası src bağlanır.
 */
export default function DeferredHeroLayerImage({
  src,
  alt,
  sizes,
  objectPosition,
  className,
}: {
  src: string
  alt: string
  sizes: string
  objectPosition?: string
  className?: string
}) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let idleId: number | undefined
    let timer: ReturnType<typeof setTimeout> | undefined
    const arm = () => {
      const go = () => setReady(true)
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        idleId = window.requestIdleCallback(go, { timeout: 2500 })
      } else {
        timer = setTimeout(go, 400)
      }
    }
    if (document.readyState === 'complete') arm()
    else {
      window.addEventListener('load', arm, { once: true })
      // LCP adayı boyandıktan sonra da aç (load gecikirse)
      timer = setTimeout(arm, 1800)
    }
    return () => {
      window.removeEventListener('load', arm)
      if (idleId != null && 'cancelIdleCallback' in window) {
        window.cancelIdleCallback(idleId)
      }
      if (timer) clearTimeout(timer)
    }
  }, [])

  if (!ready) {
    return <div className="absolute inset-0 bg-neutral-200 dark:bg-neutral-700" aria-hidden />
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      className={className ?? 'object-cover'}
      style={objectPosition ? { objectPosition } : undefined}
      loading="lazy"
      fetchPriority="low"
      decoding="async"
      unoptimized={slotUnopt(src)}
    />
  )
}
