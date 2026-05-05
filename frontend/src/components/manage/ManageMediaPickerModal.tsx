'use client'

import {
  buildManageUploadImageFormData,
  resolveBatchStartIndex,
  type ManageMediaPickerUploadTarget,
} from '@/lib/manage-upload-image-form'
import { uploadFetch } from '@/lib/upload-fetch'
import { FolderOpen, Loader2, Search, Upload, X } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

export type { ManageMediaPickerUploadTarget }

type ApiRow = { relPath: string; url: string; size: number; mtime: string }

export type ManageMediaPickMeta = { warning?: string }

type Props = {
  open: boolean
  title: string
  /** Varsayılan yardım metninin yerine geçer */
  hint?: string
  onClose: () => void
  /** Galeri seçimi veya tek dosya yükleme sonrası */
  onSelect: (url: string, meta?: ManageMediaPickMeta) => void
  uploadTarget: ManageMediaPickerUploadTarget
  /** Birden fazla dosya seçimi (sıralı isim: batchStartIndex + i; `fixedStem` / `slot` ile uyumsuz) */
  allowMultipleUpload?: boolean
  batchStartIndex?: number
  onSelectBatch?: (urls: string[], meta?: ManageMediaPickMeta) => void
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Yönetim: önce medya galerisinden seçim; uygun görsel yoksa aynı yerden yükleme.
 * Liste `/api/manage/media-library` ile gelir (SAFE_FOLDERS altı).
 */
export function ManageMediaPickerModal({
  open,
  title,
  hint,
  onClose,
  onSelect,
  uploadTarget,
  allowMultipleUpload = false,
  batchStartIndex,
  onSelectBatch,
}: Props) {
  const [items, setItems] = useState<ApiRow[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/manage/media-library', { credentials: 'include', cache: 'no-store' })
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean
        items?: ApiRow[]
        error?: string
      }
      if (!res.ok || !data.ok) {
        setError(typeof data?.error === 'string' ? data.error : 'Liste alınamadı.')
        setItems([])
        return
      }
      setItems(Array.isArray(data.items) ? data.items : [])
    } catch {
      setError('Ağ hatası.')
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) {
      setSearch('')
      void load()
    }
  }, [open, load])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return items
    return items.filter((it) => it.relPath.toLowerCase().includes(q) || it.url.toLowerCase().includes(q))
  }, [items, search])

  const fileInputMultiple = useMemo(() => {
    const t = uploadTarget
    if (!allowMultipleUpload) return false
    if (t.fixedStem?.trim()) return false
    if (t.slot != null && t.slot !== '') return false
    return true
  }, [allowMultipleUpload, uploadTarget])

  const handleUploadFiles = useCallback(
    async (fileList: FileList | File[]) => {
      const files = Array.from(fileList).filter((f) => f.size > 0)
      if (files.length === 0) return

      const t = uploadTarget
      if (t.fixedStem?.trim() && files.length > 1) {
        setError('Bu hedef için tek dosya seçin.')
        return
      }
      if (t.slot != null && t.slot !== '' && files.length > 1) {
        setError('Bu hedef için tek dosya seçin.')
        return
      }

      setUploading(true)
      setError(null)
      const urls: string[] = []
      let lastWarning: string | undefined
      const multi = files.length > 1

      try {
        const start = resolveBatchStartIndex(t, batchStartIndex)
        for (let i = 0; i < files.length; i++) {
          const explicitIdx = multi ? start + i : null
          const form = buildManageUploadImageFormData(files[i], t, explicitIdx)
          const data = await uploadFetch(form)
          if (!data.ok || !data.url) {
            setError(data.error ?? 'Yükleme başarısız.')
            setUploading(false)
            if (fileRef.current) fileRef.current.value = ''
            return
          }
          urls.push(data.url)
          if (data.warning) lastWarning = data.warning
        }

        await load()

        const meta = lastWarning ? { warning: lastWarning } : undefined
        if (urls.length === 1) {
          onSelect(urls[0], meta)
        } else if (onSelectBatch) {
          onSelectBatch(urls, meta)
        } else {
          onSelect(urls[urls.length - 1]!, meta)
        }
        onClose()
      } catch {
        setError('Yükleme sırasında ağ hatası.')
      } finally {
        setUploading(false)
        if (fileRef.current) fileRef.current.value = ''
      }
    },
    [uploadTarget, batchStartIndex, onSelect, onSelectBatch, onClose, load],
  )

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="manage-media-picker-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-neutral-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-neutral-200 px-4 py-3 dark:border-neutral-700">
          <div className="min-w-0">
            <h2 id="manage-media-picker-title" className="text-base font-semibold text-neutral-900 dark:text-white">
              {title}
            </h2>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              {hint ??
                'Önce galeriden seçin. Uygun görsel yoksa aşağıdan yükleyin; yükleme tamamlanınca otomatik seçilir.'}
            </p>
            <Link
              href="/manage/media"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:underline dark:text-primary-400"
            >
              <FolderOpen className="h-3.5 w-3.5" />
              Tam medya kütüphanesini yeni sekmede aç
            </Link>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
            aria-label="Kapat"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-neutral-100 px-4 py-2 dark:border-neutral-800">
          <div className="relative min-w-[12rem] flex-1">
            <Search className="pointer-events-none absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Dosya veya yol ara…"
              className="w-full rounded-lg border border-neutral-200 py-1.5 ps-8 pe-3 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
            />
          </div>
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Galeriye yükle
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif,image/svg+xml,image/x-icon,image/vnd.microsoft.icon"
            multiple={fileInputMultiple}
            className="hidden"
            onChange={(e) => {
              const fl = e.target.files
              if (fl?.length) void handleUploadFiles(fl)
            }}
          />
        </div>

        {error ? (
          <div className="mx-4 mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-100">
            {error}
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary-400" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-12 text-center text-sm text-neutral-500 dark:text-neutral-400">
              {items.length === 0
                ? 'Henüz görsel yok. «Galeriye yükle» ile ekleyin.'
                : 'Aramanızla eşleşen görsel yok.'}
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {filtered.map((it) => (
                <button
                  key={it.relPath}
                  type="button"
                  onClick={() => {
                    onSelect(it.url)
                    onClose()
                  }}
                  className="group flex flex-col overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50 text-start transition hover:border-primary-400 hover:shadow-md dark:border-neutral-700 dark:bg-neutral-800 dark:hover:border-primary-500"
                >
                  <div className="relative aspect-[4/3] w-full bg-neutral-200 dark:bg-neutral-950">
                    <img
                      src={it.url}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div className="min-w-0 p-2">
                    <p
                      className="truncate text-[11px] font-medium text-neutral-800 dark:text-neutral-100"
                      title={it.relPath}
                    >
                      {it.relPath.split('/').pop()}
                    </p>
                    <p className="truncate text-[10px] text-neutral-400" title={it.relPath}>
                      {it.relPath}
                    </p>
                    <p className="text-[10px] text-neutral-400">{formatBytes(it.size)}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
