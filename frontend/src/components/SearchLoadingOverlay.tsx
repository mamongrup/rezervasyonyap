'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { SEARCH_LOADING_EVENT } from '@/lib/hero-search-plan'

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
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-white/75 backdrop-blur-[2px] dark:bg-neutral-950/70"
      role="status"
      aria-live="polite"
      aria-label="Arama sonuçları yükleniyor"
    >
      <div className="flex flex-col items-center gap-4 rounded-3xl bg-white/90 px-8 py-7 shadow-xl dark:bg-neutral-900/90">
        <div className="flex h-12 items-center gap-1.5" aria-hidden="true">
          <span className="h-2 w-10 animate-pulse rounded-full bg-orange-400 [animation-delay:-300ms]" />
          <span className="h-2 w-10 animate-pulse rounded-full bg-blue-500 [animation-delay:-150ms]" />
          <span className="h-2 w-10 animate-pulse rounded-full bg-violet-500" />
        </div>
        <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
          Size en uygun seçenekler aranıyor…
        </p>
      </div>
    </div>
  )
}
