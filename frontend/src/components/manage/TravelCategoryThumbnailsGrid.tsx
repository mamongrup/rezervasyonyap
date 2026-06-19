'use client'

import { ManageMediaPickerModal } from '@/components/manage/ManageMediaPickerModal'
import {
  focalPercentsToObjectPosition,
  objectPositionToFocalPercents,
  parseCategoryThumbnailEntry,
  serializeThumbnailForStorage,
} from '@/lib/category-thumbnail-entry'
import { managePanelUploadPreviewSrc } from '@/lib/site-upload-browser-href'
import { slugifyMediaSegment } from '@/lib/upload-media-paths'
import { CATEGORY_REGISTRY } from '@/data/category-registry'
import clsx from 'clsx'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, GripHorizontal, ImageIcon, RotateCcw } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

type PreviewAspectId = 'card5' | 'card3desk' | 'card34'

const PREVIEW_ASPECTS: { id: PreviewAspectId; label: string; className: string; hint: string }[] = [
  {
    id: 'card5',
    label: 'Kart 5 (4:3)',
    className: 'aspect-[4/3]',
    hint: 'Deneyim / kategori sayfalarında sık kullanılan geniş kart.',
  },
  {
    id: 'card3desk',
    label: 'Kart 3 masaüstü (5:6)',
    className: 'aspect-[5/6]',
    hint: 'Ana sayfa slider’da Kart 3 için tipik oran (sm+).',
  },
  {
    id: 'card34',
    label: 'Kart 3/4 kare (1:1)',
    className: 'aspect-square',
    hint: 'Kart 4 ve Kart 3 mobil (5:5) ile hizalıdır.',
  },
]

const PAN_STEP = 5
const DRAG_SENS = 0.12

function CategoryCardImageSlot({
  categoryName,
  categorySlug,
  value,
  onChange,
}: {
  categoryName: string
  categorySlug: string
  value: unknown
  onChange: (entry: unknown) => void
}) {
  const parsed = parseCategoryThumbnailEntry(value)
  const src = parsed?.src ?? ''
  const focal = objectPositionToFocalPercents(parsed?.objectPosition ?? '50% 50%')

  const [localFocal, setLocalFocal] = useState(focal)
  const localFocalRef = useRef(localFocal)
  const [previewAspect, setPreviewAspect] = useState<PreviewAspectId>('card3desk')
  const dragStartRef = useRef<{ fx: number; fy: number; cx: number; cy: number } | null>(null)

  useEffect(() => {
    const next = objectPositionToFocalPercents(parsed?.objectPosition ?? '50% 50%')
    setLocalFocal(next)
    localFocalRef.current = next
  }, [src, parsed?.objectPosition])

  const [pickerOpen, setPickerOpen] = useState(false)
  const uploadTarget = useMemo(
    () =>
      ({
        folder: 'site',
        // Üst klasörden başla → tüm kategori klasörleri görünür; yükleme slug adlı dosya üretir.
        subPath: 'page-builder/kategori-kartlari',
        prefix: slugifyMediaSegment(categorySlug),
        fileBase: slugifyMediaSegment(categorySlug),
      }) as const,
    [categorySlug],
  )

  function commitFocal(x: number, y: number, nextSrc = src) {
    const nx = Math.min(100, Math.max(0, x))
    const ny = Math.min(100, Math.max(0, y))
    setLocalFocal({ x: nx, y: ny })
    localFocalRef.current = { x: nx, y: ny }
    if (!nextSrc.trim()) return
    onChange(
      serializeThumbnailForStorage({
        src: nextSrc.trim(),
        objectPosition: focalPercentsToObjectPosition(nx, ny),
      }),
    )
  }

  function handlePickUrl(url: string) {
    const t = url.trim()
    if (!t) {
      onChange('')
      return
    }
    onChange(serializeThumbnailForStorage({ src: t, objectPosition: '50% 50%' }))
  }

  const previewCls =
    PREVIEW_ASPECTS.find((p) => p.id === previewAspect)?.className ?? 'aspect-[5/6]'

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-700 dark:bg-neutral-900">
      <ManageMediaPickerModal
        open={pickerOpen}
        title={`Kategori kartı — ${categoryName}`}
        uploadTarget={uploadTarget}
        onClose={() => setPickerOpen(false)}
        onSelect={(url) => handlePickUrl(url)}
      />
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <div className="text-sm font-medium text-neutral-900 dark:text-white">{categoryName}</div>
          <div className="text-xs text-neutral-400">/{categorySlug}</div>
        </div>
        {src ? (
          <button
            type="button"
            onClick={() => onChange('')}
            className="text-xs text-red-500 hover:text-red-700"
          >
            Kaldır
          </button>
        ) : null}
      </div>

      <div className="mb-2 flex flex-wrap gap-1">
        {PREVIEW_ASPECTS.map((a) => (
          <button
            key={a.id}
            type="button"
            title={a.hint}
            onClick={() => setPreviewAspect(a.id)}
            className={clsx(
              'rounded-lg px-2 py-1 text-[10px] font-medium transition-colors',
              previewAspect === a.id
                ? 'bg-primary-600 text-white'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700',
            )}
          >
            {a.label}
          </button>
        ))}
      </div>
      <p className="mb-2 text-[10px] leading-snug text-neutral-500 dark:text-neutral-400">
        Kesik çerçeve vitrindeki kart medya alanıyla aynı en-boy ilişkisini gösterir. Oklar veya sürükleyerek görünür
        alanı kaydırın; Kaydet ile birlikte saklanır.
      </p>

      <button
        type="button"
        className={`relative flex h-28 w-full items-center justify-center overflow-hidden rounded-lg border-2 border-dashed transition-colors ${
          src
            ? 'border-primary-300 bg-neutral-50 dark:bg-neutral-800'
            : 'border-neutral-200 bg-neutral-50 hover:border-primary-300 hover:bg-primary-50/30 dark:border-neutral-700 dark:bg-neutral-800'
        }`}
        onClick={() => setPickerOpen(true)}
      >
        {src ? (
          <>
            <img
              src={managePanelUploadPreviewSrc(src)}
              alt={categoryName}
              className="absolute inset-0 h-full w-full object-cover"
              style={{ objectPosition: focalPercentsToObjectPosition(localFocal.x, localFocal.y) }}
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

      {src ? (
        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
            <GripHorizontal className="h-3 w-3" />
            Referans alanı (ön yüz)
          </div>
          <div
            className={clsx(
              'relative w-full max-w-full overflow-hidden rounded-xl border-2 border-primary-400 bg-neutral-900/5 dark:border-primary-500 dark:bg-neutral-950/40',
              previewCls,
            )}
            onPointerDown={(e) => {
              if (e.button !== 0 || !src) return
              e.currentTarget.setPointerCapture(e.pointerId)
              dragStartRef.current = { fx: localFocalRef.current.x, fy: localFocalRef.current.y, cx: e.clientX, cy: e.clientY }
            }}
            onPointerMove={(e) => {
              const d = dragStartRef.current
              if (!d) return
              const dx = e.clientX - d.cx
              const dy = e.clientY - d.cy
              const nx = Math.min(100, Math.max(0, d.fx - dx * DRAG_SENS))
              const ny = Math.min(100, Math.max(0, d.fy - dy * DRAG_SENS))
              const next = { x: nx, y: ny }
              setLocalFocal(next)
              localFocalRef.current = next
            }}
            onPointerUp={(e) => {
              const d = dragStartRef.current
              if (d && src) {
                const dx = e.clientX - d.cx
                const dy = e.clientY - d.cy
                const nx = Math.min(100, Math.max(0, d.fx - dx * DRAG_SENS))
                const ny = Math.min(100, Math.max(0, d.fy - dy * DRAG_SENS))
                onChange(
                  serializeThumbnailForStorage({
                    src: src.trim(),
                    objectPosition: focalPercentsToObjectPosition(nx, ny),
                  }),
                )
              }
              dragStartRef.current = null
              try {
                e.currentTarget.releasePointerCapture(e.pointerId)
              } catch {
                /* ignore */
              }
            }}
            onPointerCancel={(e) => {
              dragStartRef.current = null
              try {
                e.currentTarget.releasePointerCapture(e.pointerId)
              } catch {
                /* ignore */
              }
              setLocalFocal(objectPositionToFocalPercents(parsed?.objectPosition ?? '50% 50%'))
            }}
          >
            <img
              src={managePanelUploadPreviewSrc(src)}
              alt=""
              className="h-full w-full cursor-grab object-cover active:cursor-grabbing"
              draggable={false}
              style={{ objectPosition: focalPercentsToObjectPosition(localFocal.x, localFocal.y) }}
            />
            <div className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-white/40" />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] text-neutral-500">Kaydır</span>
            <div className="flex gap-1">
              <button
                type="button"
                className="rounded-lg border border-neutral-200 p-1 text-neutral-700 hover:bg-neutral-50 dark:border-neutral-600 dark:text-neutral-200 dark:hover:bg-neutral-800"
                title="Yukarı"
                onClick={() => commitFocal(localFocal.x, localFocal.y - PAN_STEP)}
              >
                <ArrowUp className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="rounded-lg border border-neutral-200 p-1 text-neutral-700 hover:bg-neutral-50 dark:border-neutral-600 dark:text-neutral-200 dark:hover:bg-neutral-800"
                title="Aşağı"
                onClick={() => commitFocal(localFocal.x, localFocal.y + PAN_STEP)}
              >
                <ArrowDown className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="rounded-lg border border-neutral-200 p-1 text-neutral-700 hover:bg-neutral-50 dark:border-neutral-600 dark:text-neutral-200 dark:hover:bg-neutral-800"
                title="Sola"
                onClick={() => commitFocal(localFocal.x - PAN_STEP, localFocal.y)}
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="rounded-lg border border-neutral-200 p-1 text-neutral-700 hover:bg-neutral-50 dark:border-neutral-600 dark:text-neutral-200 dark:hover:bg-neutral-800"
                title="Sağa"
                onClick={() => commitFocal(localFocal.x + PAN_STEP, localFocal.y)}
              >
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="rounded-lg border border-neutral-200 px-2 py-1 text-[10px] font-medium text-neutral-600 hover:bg-neutral-50 dark:border-neutral-600 dark:text-neutral-300 dark:hover:bg-neutral-800"
                title="Ortala"
                onClick={() => commitFocal(50, 50)}
              >
                <RotateCcw className="mr-1 inline h-3 w-3" />
                Ortala
              </button>
            </div>
            <span className="font-mono text-[10px] text-neutral-400">
              {focalPercentsToObjectPosition(localFocal.x, localFocal.y)}
            </span>
          </div>
        </div>
      ) : null}

      <input
        type="text"
        placeholder="İleri düzey: /uploads/... veya https://..."
        value={src}
        onChange={(e) => {
          const t = e.target.value.trim()
          if (!t) onChange('')
          else onChange(t)
        }}
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
  thumbnails: Record<string, unknown>
  onThumbnailsChange: (next: Record<string, unknown>) => void
  description?: string
}) {
  function updateThumbnail(slug: string, entry: unknown) {
    const next = { ...thumbnails }
    const parsed = parseCategoryThumbnailEntry(entry)
    if (parsed) next[slug] = serializeThumbnailForStorage(parsed)
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
            value={thumbnails[category.slug]}
            onChange={(entry) => updateThumbnail(category.slug, entry)}
          />
        ))}
      </div>
    </div>
  )
}
