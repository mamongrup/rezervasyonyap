'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

/** Yönetim / personel panellerinde vitrin footer / cookie banner gösterme. */
export default function HideOnManageStaff({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  if (pathname?.includes('/manage') || pathname?.includes('/staff')) return null
  return children
}
