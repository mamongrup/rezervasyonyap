'use client'

import { ManageMediaPickerModal } from '@/components/manage/ManageMediaPickerModal'
import { managePanelUploadPreviewSrc } from '@/lib/site-upload-browser-href'
import { slugifyMediaSegment } from '@/lib/upload-media-paths'
import { CATEGORY_REGISTRY } from '@/data/category-registry'
import { ImageIcon } from 'lucide-react'
import { useMemo, useState } from 'react'

function CategoryCardImageSlot({
  categoryName,
  categorySlug,
  value,
  onChange,
}: {
  categoryName: string
  categorySlug: string
  value: string
  onChange: (url: string) => void
}) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const uploadTarget = useMemo(
    () =>
      ({
        folder: 'site',
        subPath: `page-builder/kategori-kartlari/${slugifyMediaSegment(categorySlug)}`,
        prefix: 'kart',
      }) as const,
    [categorySlug],
  )

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-700 dark:bg-neutral-900">
      <ManageMediaPickerModal
        open={pickerOpen}
        title={`Kategori kartı — ${categoryName}`}
        uploadTarget={uploadTarget}
        onClose={() => setPickerOpen(false)}
        onSelect={(url) => onChange(url)}
      />
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <div className="text-sm font-medium text-neutral-900 dark:text-white">{categoryName}</div>
          <div className="text-xs text-neutral-400">/{categorySlug}</div>
        </div>
        {value ? (
          <button
            type="button"
            onClick={() => onChange('')}
            className="text-xs text-red-500 hover:text-red-700"
          >
            Kaldır
          </button>
        ) : null}
      </div>

      <button
        type="button"
        className={`relative flex h-28 w-full items-center justify-center overflow-hidden rounded-lg border-2 border-dashed transition-colors ${
          value
            ? 'border-primary-300 bg-neutral-50 dark:bg-neutral-800'
            : 'border-neutral-200 bg-neutral-50 hover:border-primary-300 hover:bg-primary-50/30 dark:border-neutral-700 dark:bg-neutral-800'
        }`}
        onClick={() => setPickerOpen(true)}
      >
        {value ? (
          <>
            <img
              src={managePanelUploadPreviewSrc(value)}
              alt={categoryName}
              className="absolute inset-0 h-full w-full object-cover"
            />
            <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-xs font-medium text-white opacity-0 transition-opacity hover:opacity-100">
              Galeriden seç / yükle
            </span>
          </>
        ) : (
          <div className="flex flex-col items-center gap-1 text-neutral-400">
            <ImageIcon className="h-6 w-6" />
            <span className="text-xs">Galeriden seç veya yükle</span>
          </div>
        )}
      </button>

      <input
        type="text"
        placeholder="İleri düzey: /uploads/... veya https://..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full rounded-lg border border-neutral-200 px-3 py-1.5 text-xs text-neutral-600 placeholder-neutral-300 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
      />
    </div>
  )
}

/** 12 seyahat kategorisi — kart görseli ızgarası */
export function CategoryThumbnailsGridSection({
  thumbnails,
  onThumbnailsChange,
  description,
}: {
  thumbnails: Record<string, string>
  onThumbnailsChange: (next: Record<string, string>) => void
  description?: string
}) {
  function updateThumbnail(slug: string, url: string) {
    const next = { ...thumbnails }
    const trimmed = url.trim()
    if (trimmed) next[slug] = trimmed
    else delete next[slug]
    onThumbnailsChange(next)
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">Kategori kart görselleri</p>
        {description ? (
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{description}</p>
        ) : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {CATEGORY_REGISTRY.map((category) => (
          <CategoryCardImageSlot
            key={category.slug}
            categoryName={category.name}
            categorySlug={category.slug}
            value={thumbnails[category.slug] ?? ''}
            onChange={(url) => updateThumbnail(category.slug, url)}
          />
        ))}
      </div>
    </div>
  )
}
