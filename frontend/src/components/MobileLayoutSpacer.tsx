'use client'

import { useAside } from '@/components/aside'

/** Mobil üst çubuk için boşluk — menü açıkken üst bar gizlendiğinde spacer da kalkar. */
export default function MobileLayoutSpacer() {
  const { type } = useAside()
  if (type === 'sidebar-navigation') return null

  return (
    <div
      className="shrink-0 lg:hidden"
      style={{ height: 'calc(5.25rem + env(safe-area-inset-top, 0px))' }}
      aria-hidden
    />
  )
}
