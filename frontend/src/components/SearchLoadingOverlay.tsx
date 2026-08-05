'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { SEARCH_LOADING_EVENT } from '@/lib/hero-search-plan'

/**
 * Arama gönderiminden sonuç sayfası gelene kadar tam ekran overlay.
 * Traveler tarzı 3 yatay çizgi (kırmızı / mavi / turuncu) kayma animasyonu.
 */
export function SearchBarsLoader({ className = '' }: { className?: string }) {
  return (
    <div className={`travel-search-bars ${className}`.trim()} aria-hidden="true">
      <span />
      <span />
      <span />
    </div>
  )
}

export default function SearchLoadingOverlay() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const routeKey = `${pathname}?${searchParams.toString()}`
  const previousRouteKey = useRef(routeKey)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const show = () => setVisible(true)
    const hide = () => setVisible(false)
    window.addEventListener(SEARCH_LOADING_EVENT, show)
    window.addEventListener('pageshow', hide)
    return () => {
      window.removeEventListener(SEARCH_LOADING_EVENT, show)
      window.removeEventListener('pageshow', hide)
    }
  }, [])

  useEffect(() => {
    if (previousRouteKey.current !== routeKey) {
      previousRouteKey.current = routeKey
      setVisible(false)
    }
  }, [routeKey])

  useEffect(() => {
    if (!visible) return
    const timeout = window.setTimeout(() => setVisible(false), 15000)
    return () => window.clearTimeout(timeout)
  }, [visible])

  if (!visible) return null

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-white/70 backdrop-blur-[1px] dark:bg-neutral-950/65"
      role="status"
      aria-live="polite"
      aria-label="Arama sonuçları yükleniyor"
    >
      <div className="flex flex-col items-center gap-5 rounded-3xl bg-white/95 px-10 py-8 shadow-xl ring-1 ring-black/5 dark:bg-neutral-900/95 dark:ring-white/10">
        <SearchBarsLoader />
        <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
          Size en uygun seçenekler aranıyor…
        </p>
      </div>
    </div>
  )
}
