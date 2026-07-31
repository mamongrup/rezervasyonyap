'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

/** Yönetim / personel panellerinde cookie banner vb. vitrin widget’larını gizle (Footer2 ayrı gösterilir). */
export default function HideOnManageStaff({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  if (pathname?.includes('/manage') || pathname?.includes('/staff')) return null
  return children
}
