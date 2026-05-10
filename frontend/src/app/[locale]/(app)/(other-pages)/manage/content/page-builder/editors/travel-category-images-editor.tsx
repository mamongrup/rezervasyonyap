'use client'

import type { PageBuilderJsonConfig } from '@/types/page-builder-module'
import { CategoryThumbnailsGridSection } from '@/components/manage/TravelCategoryThumbnailsGrid'
import Link from 'next/link'

export function TravelCategoryImagesConfigEditor({
  config,
  onChange,
  pageSlug,
}: {
  config: PageBuilderJsonConfig
  onChange: (updated: PageBuilderJsonConfig) => void
  /** Page builder kayıt anahtarı (örn. homepage, oteller) */
  pageSlug: string
}) {
  const raw = config.thumbnails
  const thumbnails =
    raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {}

  const wrongPage = pageSlug !== 'homepage'

  return (
    <div className="space-y-4">
      {wrongPage ? (
        <div className="rounded-lg border border-red-200 bg-red-50/90 px-3 py-2.5 text-xs text-red-950 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-100">
          <p className="font-semibold">Bu kayıtta ön yüze uygulanmaz</p>
          <p className="mt-1 text-red-900/90 dark:text-red-100/85">
            Bu modül yalnızca <strong>Ana Sayfa</strong> sayfa oluşturucu kaydında (
            <code className="rounded bg-white/80 px-1 dark:bg-neutral-900">homepage</code>) kullanılabilir ve ana
            sayfadaki slider/grid ile birleşir. <strong>Tüm site için</strong> varsayılan görselleri{' '}
            <Link href="/manage/content/category-images" className="font-semibold underline">
              İçerik → Kategori Resimleri
            </Link>{' '}
            sayfasından yönetin; bu kategori sayfasında modülü silin veya görselleri ilgili{' '}
            <strong>Kategori Slider</strong> / <strong>Kategori Grid</strong> modülünde tanımlayın.
          </p>
        </div>
      ) : null}
      <div className="rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2.5 text-xs text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/25 dark:text-amber-100">
        <p className="font-semibold">Ziyaretçilere görünmez (yalnızca yapılandırma)</p>
        <p className="mt-1 text-amber-900/90 dark:text-amber-100/85">
          Önce{' '}
          <Link href="/manage/content/category-images" className="font-semibold underline">
            Kategori Resimleri
          </Link>{' '}
          tanımlayın; burada doldurduğunuz slug’lar ana sayfada onların üzerine yazılır. Bir{' '}
          <strong>Kategori Slider</strong> satırında ayrı görsel varsa o en üstte kalır.
        </p>
      </div>
      <CategoryThumbnailsGridSection
        thumbnails={thumbnails}
        onThumbnailsChange={(next) => onChange({ ...config, thumbnails: next })}
      />
    </div>
  )
}
