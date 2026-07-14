'use client'

import { ManageMediaPickerModal } from '@/components/manage/ManageMediaPickerModal'
import {
  uploadManageImagesWithConcurrency,
  type ManageMediaPickerUploadTarget,
} from '@/lib/manage-upload-image-form'
import { defaultMediaLibraryRootForTarget, normalizeMediaPath } from '@/lib/manage-media-library-scope'
import clsx from 'clsx'
import { AlertTriangle, ImagePlus, Loader2, Pencil, Trash2, X } from 'lucide-react'
import NextImage from 'next/image'
import { useCallback, useMemo, useState } from 'react'

interface ImageUploadProps {
  /** Mevcut resim URL'si */
  value: string
  /** URL değişince çağrılır */
  onChange: (url: string) => void
  /** Yükleme klasörü (general, regions, listings, blog, pages…) */
  folder?: string
  /** Alt klasör: örn. `otel/begonvil-villa` veya blog yazı slug'ı */
  subPath?: string
  /** Sıralı dosya adı: `{prefix}-{index}.avif` */
  imageIndex?: number
  /** Dosya adı öneki (`{prefix}-{sıra}.avif`) */
  prefix?: string
  /** Öncelikli dosya adı gövdesi (slug vb.) */
  fileBase?: string
  /** Tek sabit dosya adı — `{fixedStem}.{ext}` (ör. kapak, logo) */
  fixedStem?: string
  /** Galeride gezilecek üst kök; yükleme hedefinden daha geniş olabilir. */
  libraryRoot?: string
  /** Sıra verilmezse orijinal dosya adından güvenli gövde kullanılır */
  useOriginalStem?: boolean
  /** Placeholder metin */
  placeholder?: string
  /** Aspect ratio hint (CSS değeri: "16/9", "1/1", "4/3") */
  aspectRatio?: string
  /** Preview fit mode. Use `contain` for logos and icons. */
  objectFit?: 'cover' | 'contain'
  /** Küçük mod — sadece icon buton gösterir */
  compact?: boolean
  /** Çoklu dosya seçimi (galeri modalında birden fazla dosya) */
  multiple?: boolean
  /**
   * Toplu yükleme bittiğinde tek seferde (sıra: `imageIndex`, `imageIndex+1`, …).
   * Verildiğinde çoklu seçim bu callback ile biter; tek dosyada da `onChange` yerine bunu kullanabilirsiniz.
   */
  onBatchComplete?: (urls: string[]) => void
  /** Pasif */
  disabled?: boolean
  className?: string
}

export default function ImageUpload({
  value,
  onChange,
  folder = 'general',
  subPath,
  imageIndex,
  prefix = 'img',
  fileBase,
  fixedStem,
  libraryRoot,
  useOriginalStem,
  placeholder = 'Galeriden seçin veya yükleyin',
  aspectRatio = '16/9',
  objectFit = 'cover',
  compact = false,
  multiple = false,
  onBatchComplete,
  disabled = false,
  className,
}: ImageUploadProps) {
  const [warning, setWarning] = useState<string | null>(null)
  const [drag, setDrag] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [dropUploading, setDropUploading] = useState(false)

  const pickerUploadTarget = useMemo((): ManageMediaPickerUploadTarget => {
    const idx =
      imageIndex != null && imageIndex >= 1 && !fixedStem?.trim() ? { index: String(imageIndex) } : {}
    return {
      folder,
      subPath: subPath?.trim() ?? '',
      prefix,
      ...idx,
      ...(fileBase?.trim() ? { fileBase: fileBase.trim() } : {}),
      ...(fixedStem?.trim() ? { fixedStem: fixedStem.trim() } : {}),
      ...(useOriginalStem ? { useOriginalStem: true } : {}),
    }
  }, [folder, subPath, prefix, imageIndex, fileBase, fixedStem, useOriginalStem])

  const pickerLibraryRoot = useMemo(() => {
    return normalizeMediaPath(libraryRoot) || defaultMediaLibraryRootForTarget(pickerUploadTarget)
  }, [libraryRoot, pickerUploadTarget])

  const allowMultiPick = multiple || Boolean(onBatchComplete)

  function openPicker() {
    if (!disabled) setPickerOpen(true)
  }

  function applyPick(url: string, meta?: { warning?: string }) {
    setWarning(meta?.warning ?? null)
    if (onBatchComplete) {
      onBatchComplete([url])
    } else {
      onChange(url)
    }
  }

  function applyPickBatch(urls: string[], meta?: { warning?: string }) {
    setWarning(meta?.warning ?? null)
    if (onBatchComplete) {
      onBatchComplete(urls)
    } else {
      for (const u of urls) {
        onChange(u)
      }
    }
  }

  const uploadDroppedFiles = useCallback(
    async (files: File[]): Promise<boolean> => {
      const imageFiles = files.filter((f) => f.size > 0 && f.type.startsWith('image/'))
      if (imageFiles.length === 0) return false

      const t = pickerUploadTarget
      const take =
        allowMultiPick && !t.fixedStem?.trim() && (t.slot == null || t.slot === '')
          ? imageFiles
          : imageFiles.slice(0, 1)

      if (t.fixedStem?.trim() && take.length > 1) return false

      setDropUploading(true)
      setWarning(null)
      const multi = take.length > 1

      try {
        const batch = await uploadManageImagesWithConcurrency(take, t, imageIndex, multi)
        if (!batch.ok) {
          setWarning(batch.error ?? 'Sürüklenen dosya yüklenemedi.')
          return true
        }
        const urls = batch.urls
        const lastWarn = batch.warning
        setWarning(lastWarn ?? null)
        if (onBatchComplete) {
          onBatchComplete(urls)
        } else if (urls.length === 1) {
          onChange(urls[0]!)
        } else {
          for (const u of urls) {
            onChange(u)
          }
        }
        return true
      } catch {
        setWarning('Yükleme sırasında ağ hatası.')
        return true
      } finally {
        setDropUploading(false)
      }
    },
    [pickerUploadTarget, allowMultiPick, imageIndex, onChange, onBatchComplete],
  )

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDrag(false)
    const files = Array.from(e.dataTransfer.files)
    void uploadDroppedFiles(files).then((handled) => {
      if (!handled) openPicker()
    })
  }

  const pickerModal = (
    <ManageMediaPickerModal
      open={pickerOpen}
      title={placeholder}
      uploadTarget={pickerUploadTarget}
      libraryRoot={pickerLibraryRoot}
      onClose={() => setPickerOpen(false)}
      onSelect={(url, meta) => applyPick(url, meta)}
      allowMultipleUpload={allowMultiPick}
      batchStartIndex={imageIndex}
      onSelectBatch={
        allowMultiPick ? (urls, meta) => applyPickBatch(urls, meta) : undefined
      }
    />
  )

  // ── Compact mode: just a small button ───────────────────────────────────────
  if (compact) {
    return (
      <div className={clsx('relative inline-block', className)}>
        {pickerModal}
        {value ? (
          <div className="relative">
            <div
              className={clsx(
                'relative h-14 w-14 overflow-hidden rounded-xl border',
                warning ? 'border-amber-400' : 'border-neutral-200 dark:border-neutral-700',
              )}
            >
              <NextImage
                src={value}
                alt=""
                fill
                className={objectFit === 'contain' ? 'object-contain p-1' : 'object-cover'}
                sizes="56px"
                unoptimized
              />
              {warning && (
                <div className="absolute inset-0 flex items-center justify-center bg-amber-500/70">
                  <AlertTriangle className="h-5 w-5 text-white" />
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center gap-1 bg-black/40 opacity-0 transition-opacity hover:opacity-100">
                <button
                  type="button"
                  onClick={openPicker}
                  disabled={disabled}
                  className="rounded-full bg-white p-1 text-neutral-700"
                >
                  <Pencil className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => onChange('')}
                  className="rounded-full bg-white p-1 text-red-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>
            {warning && (
              <div
                className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-white"
                title={warning}
              >
                <AlertTriangle className="h-2.5 w-2.5" />
              </div>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={openPicker}
            onDragOver={(e) => {
              e.preventDefault()
              setDrag(true)
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={handleDrop}
            disabled={disabled || dropUploading}
            className={clsx(
              'relative flex h-14 w-14 items-center justify-center rounded-xl border-2 border-dashed border-neutral-300 text-neutral-400 transition hover:border-primary-400 hover:text-primary-500 dark:border-neutral-700',
              drag && 'border-primary-400 bg-primary-50 dark:bg-primary-950/20',
            )}
          >
            {dropUploading ? (
              <Loader2 className="h-5 w-5 animate-spin text-primary-500" />
            ) : (
              <ImagePlus className="h-5 w-5" />
            )}
          </button>
        )}
      </div>
    )
  }

  // ── Full drop zone (tıklayınca / sürükleyince galeri) ─────────────────────────
  return (
    <div className={clsx('group relative', className)}>
      {pickerModal}

      {value ? (
        <div
          className="relative overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-700"
          style={{ aspectRatio }}
        >
          <NextImage
            src={value}
            alt=""
            fill
            className={objectFit === 'contain' ? 'object-contain p-4' : 'object-cover'}
            sizes="(max-width:768px) 100vw, 50vw"
            unoptimized
          />
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 transition-opacity hover:opacity-100">
            <button
              type="button"
              onClick={openPicker}
              disabled={disabled}
              className="flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-xs font-semibold text-neutral-800 shadow hover:bg-neutral-50"
            >
              <Pencil className="h-3.5 w-3.5" />
              Değiştir
            </button>
            <button
              type="button"
              onClick={() => onChange('')}
              className="flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-xs font-semibold text-red-600 shadow hover:bg-red-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Kaldır
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={openPicker}
          onDragOver={(e) => {
            e.preventDefault()
            setDrag(true)
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={handleDrop}
          disabled={disabled || dropUploading}
          style={{ aspectRatio }}
          className={clsx(
            'relative flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed transition',
            drag
              ? 'border-primary-400 bg-primary-50 dark:bg-primary-950/20'
              : 'border-neutral-200 bg-neutral-50 hover:border-primary-300 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800/40 dark:hover:border-primary-700',
            disabled && 'pointer-events-none opacity-50',
          )}
        >
          {dropUploading ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/90 dark:bg-neutral-900/90">
              <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
            </div>
          ) : null}
          <div
            className={clsx(
              'flex h-12 w-12 items-center justify-center rounded-2xl transition',
              drag
                ? 'bg-primary-100 text-primary-600 dark:bg-primary-900/40'
                : 'bg-neutral-200 text-neutral-500 dark:bg-neutral-700',
            )}
          >
            <ImagePlus className="h-6 w-6" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              {dropUploading ? 'Yükleniyor…' : drag ? 'Bırakın — dosya yüklenecek' : placeholder}
            </p>
            <p className="mt-0.5 text-xs text-neutral-400">
              Tıklayınca tam galeri · JPEG, PNG, WebP, AVIF · Sürükleyip bırakarak doğrudan yükleme
              {allowMultiPick ? ' · Çoklu dosya (galeri veya sürükleme)' : ''}
            </p>
          </div>
        </button>
      )}

      {warning && (
        <div className="mt-2 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 dark:border-amber-800/50 dark:bg-amber-950/30">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">Düşük çözünürlüklü resim</p>
            <p className="mt-0.5 text-xs text-amber-600 dark:text-amber-500">{warning}</p>
          </div>
          <button
            type="button"
            onClick={openPicker}
            className="shrink-0 rounded-lg bg-amber-500 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-amber-600"
          >
            Değiştir
          </button>
        </div>
      )}

    </div>
  )
}
