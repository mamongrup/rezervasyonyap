'use client'

import type { SectionVideosModuleConfig } from '@/components/page-builder/modules/SectionVideosModule'
import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'

const SectionVideosModule = dynamic(
  () => import('@/components/page-builder/modules/SectionVideosModule'),
  {
    ssr: false,
    loading: () => (
      <div
        className="skeleton-delayed h-72 w-full rounded-2xl bg-neutral-100 dark:bg-neutral-800"
        aria-hidden
      />
    ),
  },
)

/**
 * Anasayfa / vitrin — video bölümünü viewport yakınına kadar yükleme.
 * Aksi halde YouTube `hqdefault` preload(fetchPriority=high) LCP ile yarışır.
 */
export default function DeferredSectionVideosModule({
  config,
}: {
  config: SectionVideosModuleConfig
}) {
  const anchorRef = useRef<HTMLDivElement>(null)
  const [shouldLoad, setShouldLoad] = useState(false)

  useEffect(() => {
    const node = anchorRef.current
    if (!node || shouldLoad) return
    if (typeof IntersectionObserver === 'undefined') {
      setShouldLoad(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return
        setShouldLoad(true)
        observer.disconnect()
      },
      { rootMargin: '600px 0px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [shouldLoad])

  return (
    <div ref={anchorRef}>
      {shouldLoad ? (
        <SectionVideosModule config={config} />
      ) : (
        <div
          className="skeleton-delayed h-72 w-full rounded-2xl bg-neutral-100 dark:bg-neutral-800"
          aria-hidden
        />
      )}
    </div>
  )
}
