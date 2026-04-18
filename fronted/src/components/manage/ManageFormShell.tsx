'use client'

import clsx from 'clsx'
import type { ReactNode } from 'react'

/** Bölge düzenle ile aynı: geniş sütun + yatay padding */
export const MANAGE_FORM_CONTAINER_CLASS = 'mx-auto w-full max-w-7xl px-4 sm:px-6'

/**
 * Sabit alt aksiyon çubuğu için sayfa gövdesi alt boşluğu.
 * Yalnızca en dış sarmalayıcıda kullanın; iç içe `pb-20` + `pb-28` gibi tekrarlar geniş gri boşluk oluşturur.
 */
export const MANAGE_STICKY_FOOTER_SCROLL_PADDING =
  'pb-[max(5.5rem,calc(4.5rem+env(safe-area-inset-bottom,0px)))]'

/** Sabit alt çubuk yokken katalog / yönetim içerik sayfaları için tutarlı alt boşluk */
export const MANAGE_PAGE_BOTTOM_SCROLL_CLASS = 'pb-8 sm:pb-10'

type PageHeaderProps = {
  title: string
  subtitle?: ReactNode
  className?: string
}

/** İlan/blog/bölge formlarında: h1 + kısa çizgi + isteğe bağlı alt satır */
export function ManageFormPageHeader({ title, subtitle, className }: PageHeaderProps) {
  return (
    <header className={clsx('mb-8', className)}>
      <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">{title}</h1>
      <div className="mt-3 w-14 border-b border-neutral-200 dark:border-neutral-700" />
      {subtitle ? <div className="mt-3 text-sm text-neutral-500 dark:text-neutral-400">{subtitle}</div> : null}
    </header>
  )
}

/** `listingSection__wrap` — add-listing / bölge içerik kutusu ile aynı çerçeve */
export function ManageFormListingSection({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={clsx('listingSection__wrap', className)}>{children}</div>
}
