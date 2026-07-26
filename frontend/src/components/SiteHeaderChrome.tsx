'use client'

import clsx from 'clsx'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

/**
 * Önyüz: masaüstünde tam Header, mobilde arama üst barı.
 * Yönetim/personel: her kırılımda önyüz Header ile aynı şerit (sticky).
 */
export default function SiteHeaderChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const fullHeaderChrome = Boolean(
    pathname?.includes('/manage') ||
      pathname?.includes('/staff') ||
      pathname?.includes('/account'),
  )

  return (
    <div
      className={clsx(
        'relative z-50 bg-white dark:bg-neutral-900',
        fullHeaderChrome ? 'sticky top-0 block' : 'hidden lg:block',
      )}
    >
      {children}
    </div>
  )
}
