'use client'

import clsx from 'clsx'
import { AlertTriangle, ImagePlus, Loader2, Pencil, Trash2, X } from 'lucide-react'
import NextImage from 'next/image'
import { useCallback, useRef, useState } from 'react'

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
  /** Sıra verilmezse orijinal dosya adından güvenli gövde kullanılır */
  useOriginalStem?: boolean
  /** Placeholder metin */
  placeholder?: string
  /** Aspect ratio hint (CSS değeri: "16/9", "1/1", "4/3") */
  aspectRatio?: string
  /** Küçük mod — sadece icon buton gösterir */
  compact?: boolean
  /** Çoklu dosya seçimi (input `multiple` + sürükleyip bırakmada birden fazla dosya) */
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
  useOriginalStem,
  placeholder = 'Resim yükleyin veya sürükleyin',
  aspectRatio = '16/9',
  compact = false,
  multiple = false,
  onBatchComplete,
  disabled = false,
  className,
}: ImageUploadProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)
  const [drag, setDrag] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const uploadOne = useCallback(
    async (
      file: File,
      indexForName: number | undefined,
    ): Promise<{ url: string; warning?: string }> => {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('folder', folder)
      fd.append('prefix', prefix)
      if (fileBase?.trim()) fd.append('fileBase', fileBase.trim())
      if (fixedStem?.trim()) fd.append('fixedStem', fixedStem.trim())
      if (useOriginalStem) fd.append('useOriginalStem', '1')
      if (subPath?.trim()) fd.append('subPath', subPath.trim())
      if (indexForName != null && indexForName >= 1 && !fixedStem?.trim()) {
        fd.append('index', String(indexForName))
      }
      const res = await fetch('/api/upload-image', { method: 'POST', body: fd, credentials: 'include' })
      const ct = res.headers.get('content-type') ?? ''
      if (!ct.includes('application/json')) {
        await res.text()
        throw new Error(
          res.status === 401
            ? 'Oturum süresi dolmuş olabilir; sayfayı yenileyip tekrar giriş yapın.'
            : `Sunucu yanıtı beklenen formatta değil (${res.status}).`,
        )
      }
      const data = (await res.json()) as { ok: boolean; url?: string; error?: string; warning?: string }
      if (!data.ok || !data.url) throw new Error(data.error ?? 'Yükleme başarısız')
      return { url: data.url, warning: data.warning }
    },
    [folder, subPath, prefix, fileBase, fixedStem, useOriginalStem],
  )

  const upload = useCallback(
    async (file: File) => {
      setError(null)
      setWarning(null)
      setLoading(true)
      try {
        const { url, warning: w } = await uploadOne(file, imageIndex)
        onChange(url)
        if (w) setWarning(w)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Yükleme hatası')
      } finally {
        setLoading(false)
      }
    },
    [uploadOne, imageIndex, onChange],
  )

  const uploadBatch = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return
      setError(null)
      setWarning(null)
      setLoading(true)
      try {
        const start = imageIndex ?? 1
        const urls: string[] = []
        let lastWarn: string | undefined
        for (let i = 0; i < files.length; i++) {
          const file = files[i]
          if (!file) continue
          const { url, warning: w } = await uploadOne(file, start + i)
          urls.push(url)
          if (w) lastWarn = w
        }
        if (onBatchComplete) {
          onBatchComplete(urls)
        } else {
          for (const u of urls) {
            onChange(u)
          }
        }
        if (lastWarn) setWarning(lastWarn)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Yükleme hatası')
      } finally {
        setLoading(false)
      }
    },
    [uploadOne, imageIndex, onChange, onBatchComplete],
  )

  function handleFiles(files: FileList | null) {
    const list = Array.from(files ?? []).filter((f) => f.size > 0)
    if (list.length === 0) return
    if (onBatchComplete) {
      void uploadBatch(list)
      return
    }
    if (list.length > 1) {
      void uploadBatch(list)
      return
    }
    const file = list[0]
    if (file) void upload(file)
  }

  const allowMultiPick = multiple || Boolean(onBatchComplete)

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDrag(false)
    handleFiles(e.dataTransfer.files)
  }

  // ── Compact mode: just a small button ───────────────────────────────────────
  if (compact) {
    return (
      <div className={clsx('relative inline-block', className)}>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple={allowMultiPick}
          className="sr-only"
          onChange={(e) => handleFiles(e.target.files)}
          disabled={disabled || loading}
        />
        {value ? (
          <div className="relative">
            <div className={clsx(
              'relative h-14 w-14 overflow-hidden rounded-xl border',
              warning ? 'border-amber-400' : 'border-neutral-200 dark:border-neutral-700',
            )}>
              <NextImage src={value} alt="" fill className="object-cover" sizes="56px" unoptimized />
              {warning && (
                <div className="absolute inset-0 flex items-center justify-center bg-amber-500/70">
                  <AlertTriangle className="h-5 w-5 text-white" />
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center gap-1 bg-black/40 opacity-0 transition-opacity hover:opacity-100">
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
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
              <div className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-white" title={warning}>
                <AlertTriangle className="h-2.5 w-2.5" />
              </div>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={disabled || loading}
            className="flex h-14 w-14 items-center justify-center rounded-xl border-2 border-dashed border-neutral-300 text-neutral-400 transition hover:border-primary-400 hover:text-primary-500 dark:border-neutral-700"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
          </button>
        )}
      </div>
    )
  }

  // ── Full drop zone ───────────────────────────────────────────────────────────
  return (
    <div className={clsx('group relative', className)}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={allowMultiPick}
        className="sr-only"
        onChange={(e) => handleFiles(e.target.files)}
        disabled={disabled || loading}
      />

      {value ? (
        // Image preview
        <div
          className="relative overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-700"
          style={{ aspectRatio }}
        >
          <NextImage
            src={value}
            alt=""
            fill
            className="object-cover"
            sizes="(max-width:768px) 100vw, 50vw"
            unoptimized
          />
          {/* Hover overlay */}
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 transition-opacity hover:opacity-100">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-xs font-semibold text-neutral-800 shadow hover:bg-neutral-50"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Pencil className="h-3.5 w-3.5" />}
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

          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm">
              <Loader2 className="h-8 w-8 animate-spin text-white" />
            </div>
          )}
        </div>
      ) : (
        // Drop zone
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
          onDragLeave={() => setDrag(false)}
          onDrop={handleDrop}
          disabled={disabled || loading}
          style={{ aspectRatio }}
          className={clsx(
            'flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed transition',
            drag
              ? 'border-primary-400 bg-primary-50 dark:bg-primary-950/20'
              : 'border-neutral-200 bg-neutral-50 hover:border-primary-300 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800/40 dark:hover:border-primary-700',
            disabled && 'pointer-events-none opacity-50',
          )}
        >
          {loading ? (
            <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
          ) : (
            <>
              <div className={clsx(
                'flex h-12 w-12 items-center justify-center rounded-2xl transition',
                drag ? 'bg-primary-100 text-primary-600 dark:bg-primary-900/40' : 'bg-neutral-200 text-neutral-500 dark:bg-neutral-700',
              )}>
                <ImagePlus className="h-6 w-6" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  {drag ? 'Bırakın' : placeholder}
                </p>
                <p className="mt-0.5 text-xs text-neutral-400">
                  JPEG, PNG, WebP, AVIF · Maks 8 MB
                  {allowMultiPick ? ' · Birden fazla seçebilirsiniz' : ''}
                </p>
              </div>
            </>
          )}
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
            onClick={() => inputRef.current?.click()}
            className="shrink-0 rounded-lg bg-amber-500 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-amber-600"
          >
            Değiştir
          </button>
        </div>
      )}

      {error && (
        <p className="mt-1.5 flex items-center gap-1 text-xs text-red-600">
          <X className="h-3.5 w-3.5" /> {error}
        </p>
      )}
    </div>
  )
}
