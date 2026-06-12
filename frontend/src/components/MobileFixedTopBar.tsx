'use client'

import MobileSiteTopBar from '@/components/MobileSiteTopBar'
import { useAside } from '@/components/aside'

/** Mobil üst arama — hamburger menü açıkken gizlenir (menü tam ekran çekmece). */
export default function MobileFixedTopBar({ locale }: { locale: string }) {
  const { type } = useAside()
  if (type === 'sidebar-navigation') return null

  return (
    <div className="pointer-events-auto fixed inset-x-0 top-0 isolate z-[60] touch-manipulation bg-white pt-safe shadow-xs lg:hidden dark:bg-neutral-900">
      <div className="container box-border flex h-auto min-h-0 w-full max-w-full items-center px-2 py-3 sm:px-4">
        <MobileSiteTopBar locale={locale} />
      </div>
    </div>
  )
}
