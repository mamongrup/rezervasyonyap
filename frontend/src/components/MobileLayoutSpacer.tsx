'use client'

import { useAside } from '@/components/aside'
import { usePathname } from 'next/navigation'

/** Mobil üst çubuk için boşluk — menü açıkken üst bar gizlendiğinde spacer da kalkar. */
export default function MobileLayoutSpacer() {
  const { type } = useAside()
  const pathname = usePathname()
  const hideOnManage = Boolean(pathname?.includes('/manage') || pathname?.includes('/staff'))
  if (hideOnManage || type === 'sidebar-navigation') return null

  return (
    <div
      className="shrink-0 lg:hidden"
      style={{ height: 'calc(5.25rem + env(safe-area-inset-top, 0px))' }}
      aria-hidden
    />
  )
}
