'use client'

import {
  buildManageUploadImageFormData,
  resolveBatchStartIndex,
  type ManageMediaPickerUploadTarget,
} from '@/lib/manage-upload-image-form'
import { uploadFetch } from '@/lib/upload-fetch'
import {
  ChevronRight,
  Folder,
  FolderOpen,
  FolderPlus,
  LayoutGrid,
  List,
  Loader2,
  Move,
  Plus,
  Search,
  SquareMousePointer,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'

export type { ManageMediaPickerUploadTarget }

type ApiRow = { relPath: string; url: string; size: number; mtime: string }

export type ManageMediaPickMeta = { warning?: string }

type Props = {
  open: boolean
  title: string
  /** Varsayılan yardım metninin yerine geçer */
  hint?: string
  /** `true` ise «Tam medya kütüphanesini…» bağlantısı gösterilmez (örn. medya sayfasının kendisi). */
  hideFullLibraryLink?: boolean
  onClose: () => void
  /** Galeri seçimi veya tek dosya yükleme sonrası */
  onSelect: (url: string, meta?: ManageMediaPickMeta) => void
  uploadTarget: ManageMediaPickerUploadTarget
  /** Birden fazla dosya seçimi (sıralı isim: batchStartIndex + i; `fixedStem` / `slot` ile uyumsuz) */
  allowMultipleUpload?: boolean
  batchStartIndex?: number
  onSelectBatch?: (urls: string[], meta?: ManageMediaPickMeta) => void
}

type ViewMode = 'grid' | 'list'

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

function posixDirname(relPath: string): string {
  const i = relPath.lastIndexOf('/')
  return i === -1 ? '' : relPath.slice(0, i)
}

function uploadBasePath(target: ManageMediaPickerUploadTarget): string {
  const top = target.folder.trim()
  const sub = (target.subPath ?? '').trim().replace(/^\/+|\/+$/g, '')
  return sub ? `${top}/${sub}` : top
}

function effectiveTargetFromBrowse(
  base: ManageMediaPickerUploadTarget,
  browsePrefix: string,
): ManageMediaPickerUploadTarget {
  const parts = browsePrefix.split('/').filter(Boolean)
  if (parts.length === 0) return base
  const folder = parts[0]!
  const subPath = parts.slice(1).join('/')
  return { ...base, folder, subPath }
}

function browseAllowed(uploadBase: string, browsePrefix: string): boolean {
  return browsePrefix === uploadBase || browsePrefix.startsWith(`${uploadBase}/`)
}

function joinBrowsePrefix(parent: string, child: string): string {
  const p = parent.replace(/\/+$/, '')
  const c = child.replace(/^\/+|\/+$/g, '')
  return c ? `${p}/${c}` : p
}

function childFolderNames(items: ApiRow[], browsePrefix: string, extraFolders: string[]): string[] {
  const p = browsePrefix.replace(/\/+$/, '')
  const prefix = `${p}/`
  const names = new Set<string>()
  for (const it of items) {
    if (!it.relPath.startsWith(prefix)) continue
    const rest = it.relPath.slice(prefix.length)
    const idx = rest.indexOf('/')
    if (idx === -1) continue
    names.add(rest.slice(0, idx))
  }
  for (const fp of extraFolders) {
    if (!fp.startsWith(prefix)) continue
    const rest = fp.slice(prefix.length)
    const idx = rest.indexOf('/')
    const seg = idx === -1 ? rest : rest.slice(0, idx)
    if (seg) names.add(seg)
  }
  return [...names].sort((a, b) => a.localeCompare(b, 'tr'))
}

function filesInFolder(items: ApiRow[], browsePrefix: string): ApiRow[] {
  const p = browsePrefix.replace(/\/+$/, '')
  return items.filter((it) => posixDirname(it.relPath) === p)
}

/** Listedeki görünür içerik: doğrudan dosya veya herhangi bir alt öğe */
function folderHasAnyContent(items: ApiRow[], folderFullPath: string): boolean {
  const p = folderFullPath.replace(/\/+$/, '')
  const prefix = `${p}/`
  return items.some((it) => posixDirname(it.relPath) === p || it.relPath.startsWith(prefix))
}

function formatRefsLines(refs: Record<string, string[]>): string {
  const lines: string[] = []
  for (const [rp, hits] of Object.entries(refs)) {
    if (hits.length === 0) continue
    const name = rp.split('/').pop() ?? rp
    lines.push(`• ${name}: ${hits.join(', ')}`)
  }
  return lines.join('\n')
}

/**
 * Yönetim: önce medya galerisinden seçim; uygun görsel yoksa aynı yerden yükleme.
 * Liste `/api/manage/media-library` ile gelir (SAFE_FOLDERS altı).
 */
export function ManageMediaPickerModal({
  open,
  title,
  hint,
  hideFullLibraryLink = false,
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
  const [browsePrefix, setBrowsePrefix] = useState('')
  const [extraFolders, setExtraFolders] = useState<string[]>([])
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [mkdirBusy, setMkdirBusy] = useState(false)
  const [deletingPath, setDeletingPath] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(() => new Set())
  const [moveDialogOpen, setMoveDialogOpen] = useState(false)
  const [moveDest, setMoveDest] = useState('')
  const [moveBusy, setMoveBusy] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [refsBusy, setRefsBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const dragDepth = useRef(0)

  const uploadBase = useMemo(() => uploadBasePath(uploadTarget), [uploadTarget])
  const folderFeaturesEnabled = !uploadTarget.fixedStem?.trim()

  const effectiveUploadTarget = useMemo(
    () =>
      folderFeaturesEnabled ? effectiveTargetFromBrowse(uploadTarget, browsePrefix) : uploadTarget,
    [folderFeaturesEnabled, uploadTarget, browsePrefix],
  )

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

  const fetchRefs = useCallback(async (paths: string[]): Promise<Record<string, string[]>> => {
    if (paths.length === 0) return {}
    try {
      const res = await fetch('/api/manage/media-library/references', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paths }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean
        refs?: Record<string, string[]>
      }
      if (!res.ok || !data.ok || !data.refs || typeof data.refs !== 'object') return {}
      return data.refs
    } catch {
      return {}
    }
  }, [])

  useEffect(() => {
    if (open) {
      setSearch('')
      setBrowsePrefix(uploadBase)
      setExtraFolders([])
      setCreatingFolder(false)
      setNewFolderName('')
      setSelectionMode(false)
      setSelectedPaths(new Set())
      setMoveDialogOpen(false)
      setViewMode('grid')
      void load()
    }
  }, [open, uploadBase, load])

  useEffect(() => {
    setSelectedPaths(new Set())
  }, [browsePrefix])

  useEffect(() => {
    if (!open || !folderFeaturesEnabled) return
    if (!browseAllowed(uploadBase, browsePrefix)) {
      setBrowsePrefix(uploadBase)
    }
  }, [open, folderFeaturesEnabled, uploadBase, browsePrefix])

  const scopedFlatItems = useMemo(() => {
    const base = uploadBase
    return items.filter((it) => it.relPath === base || it.relPath.startsWith(`${base}/`))
  }, [items, uploadBase])

  const foldersHere = useMemo(() => {
    if (!folderFeaturesEnabled) return []
    return childFolderNames(items, browsePrefix, extraFolders)
  }, [folderFeaturesEnabled, items, browsePrefix, extraFolders])

  const filesHere = useMemo(() => {
    if (!folderFeaturesEnabled) return []
    return filesInFolder(items, browsePrefix)
  }, [folderFeaturesEnabled, items, browsePrefix])

  const destFolderOptions = useMemo(() => {
    const set = new Set<string>()
    set.add(uploadBase)
    set.add(browsePrefix)
    const base = uploadBase
    for (const it of items) {
      const rp = it.relPath
      if (rp !== base && !rp.startsWith(`${base}/`)) continue
      let d = posixDirname(rp)
      while (d && (d === base || d.startsWith(`${base}/`))) {
        set.add(d)
        if (d === base) break
        d = posixDirname(d)
      }
    }
    return [...set].sort((a, b) => a.localeCompare(b, 'tr'))
  }, [items, uploadBase, browsePrefix])

  useEffect(() => {
    if (moveDialogOpen && !moveDest) {
      setMoveDest(browsePrefix)
    }
  }, [moveDialogOpen, browsePrefix, moveDest])

  const q = search.trim().toLowerCase()

  const filteredFolders = useMemo(() => {
    if (!q) return foldersHere
    return foldersHere.filter((name) => name.toLowerCase().includes(q))
  }, [foldersHere, q])

  const filteredFiles = useMemo(() => {
    const pool = folderFeaturesEnabled ? filesHere : scopedFlatItems
    if (!q) return pool
    return pool.filter(
      (it) => it.relPath.toLowerCase().includes(q) || it.url.toLowerCase().includes(q),
    )
  }, [folderFeaturesEnabled, filesHere, scopedFlatItems, q])

  const breadcrumbSegments = useMemo(() => {
    if (!folderFeaturesEnabled) return []
    const baseParts = uploadBase.split('/').filter(Boolean)
    const browseParts = browsePrefix.split('/').filter(Boolean)
    const crumbs: { label: string; prefix: string }[] = []
    for (let i = baseParts.length; i <= browseParts.length; i++) {
      const prefix = browseParts.slice(0, i).join('/')
      const label = browseParts[i - 1] ?? ''
      if (label) crumbs.push({ label, prefix })
    }
    return crumbs
  }, [folderFeaturesEnabled, uploadBase, browsePrefix])

  const fileInputMultiple = useMemo(() => {
    const t = effectiveUploadTarget
    if (!allowMultipleUpload) return false
    if (t.fixedStem?.trim()) return false
    if (t.slot != null && t.slot !== '') return false
    return true
  }, [allowMultipleUpload, effectiveUploadTarget])

  const triggerPickFiles = useCallback(() => {
    fileRef.current?.click()
  }, [])

  const togglePath = useCallback((relPath: string) => {
    setSelectedPaths((prev) => {
      const n = new Set(prev)
      if (n.has(relPath)) n.delete(relPath)
      else n.add(relPath)
      return n
    })
  }, [])

  const selectAllInFolder = useCallback(() => {
    setSelectedPaths(new Set(filteredFiles.map((f) => f.relPath)))
  }, [filteredFiles])

  const handleMkdir = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()
      const raw = newFolderName.trim()
      if (!raw || !folderFeaturesEnabled) return
      setMkdirBusy(true)
      setError(null)
      try {
        const pathToCreate = joinBrowsePrefix(browsePrefix, raw)
        const res = await fetch('/api/manage/media-library', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'mkdir', path: pathToCreate }),
        })
        const data = (await res.json().catch(() => ({}))) as {
          ok?: boolean
          path?: string
          error?: string
        }
        if (!res.ok || !data.ok || typeof data.path !== 'string') {
          setError(typeof data.error === 'string' ? data.error : 'Klasör oluşturulamadı.')
          return
        }
        setExtraFolders((prev) => (prev.includes(data.path!) ? prev : [...prev, data.path!]))
        setBrowsePrefix(data.path!)
        setCreatingFolder(false)
        setNewFolderName('')
      } catch {
        setError('Klasör oluşturulurken ağ hatası.')
      } finally {
        setMkdirBusy(false)
      }
    },
    [newFolderName, folderFeaturesEnabled, browsePrefix],
  )

  const handleRmdirFolder = useCallback(
    async (folderFullPath: string) => {
      if (
        !window.confirm(
          'Bu klasör listede görünen dosya içermiyor; disk üzerinde de boşsa kaldırılır. Devam edilsin mi?',
        )
      ) {
        return
      }
      setError(null)
      try {
        const res = await fetch('/api/manage/media-library', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'rmdir', path: folderFullPath }),
        })
        const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string }
        if (!res.ok || !data.ok) {
          setError(typeof data.error === 'string' ? data.error : 'Klasör silinemedi.')
          return
        }
        setExtraFolders((prev) =>
          prev.filter((f) => f !== folderFullPath && !f.startsWith(`${folderFullPath}/`)),
        )
        if (browsePrefix === folderFullPath || browsePrefix.startsWith(`${folderFullPath}/`)) {
          const parent = posixDirname(folderFullPath)
          setBrowsePrefix(browseAllowed(uploadBase, parent) ? parent || uploadBase : uploadBase)
        }
        await load()
      } catch {
        setError('Klasör silinirken ağ hatası.')
      }
    },
    [browsePrefix, uploadBase, load],
  )

  const runDeletePaths = useCallback(
    async (relPaths: string[]) => {
      if (relPaths.length === 0) return
      setDeletingPath(relPaths.length === 1 ? relPaths[0]! : '__bulk__')
      setError(null)
      try {
        const res = await fetch('/api/manage/media-library', {
          method: 'DELETE',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ relPaths }),
        })
        const data = (await res.json().catch(() => ({}))) as {
          ok?: boolean
          failed?: { relPath: string }[]
          error?: string
        }
        if (!res.ok) {
          setError(typeof data.error === 'string' ? data.error : 'Silme başarısız.')
          return
        }
        if (!data.ok && Array.isArray(data.failed) && data.failed.length > 0) {
          setError('Bazı dosyalar silinemedi.')
        }
        setSelectedPaths(new Set())
        await load()
      } catch {
        setError('Silme sırasında ağ hatası.')
      } finally {
        setDeletingPath(null)
      }
    },
    [load],
  )

  const confirmDeleteWithRefs = useCallback(
    async (relPaths: string[]): Promise<boolean> => {
      setRefsBusy(true)
      let refs: Record<string, string[]> = {}
      try {
        refs = await fetchRefs(relPaths)
      } finally {
        setRefsBusy(false)
      }
      const lines = formatRefsLines(refs)
      const baseMsg =
        relPaths.length === 1
          ? 'Bu görseli sunucudan kalıcı olarak silmek istediğinize emin misiniz?'
          : `${relPaths.length} görseli kalıcı olarak silmek istediğinize emin misiniz?`
      const scanNote =
        '\n\nNot: Aşağıdaki eşleşmeler yalnızca page-builder ve sliders JSON dosyalarında `/uploads/…` aramasına dayanır; DB dahil diğer kaynaklar taranmaz.'
      const refMsg = lines ? `\n\nYapılandırmada geçtiği görünen yerler:\n${lines}` : ''
      return window.confirm(`${baseMsg}${refMsg}${scanNote}`)
    },
    [fetchRefs],
  )

  const handleDeleteFile = useCallback(
    async (relPath: string) => {
      if (!(await confirmDeleteWithRefs([relPath]))) return
      await runDeletePaths([relPath])
    },
    [confirmDeleteWithRefs, runDeletePaths],
  )

  const handleBulkDelete = useCallback(async () => {
    const paths = [...selectedPaths]
    if (paths.length === 0) return
    if (!(await confirmDeleteWithRefs(paths))) return
    await runDeletePaths(paths)
  }, [selectedPaths, confirmDeleteWithRefs, runDeletePaths])

  const handleMoveSelected = useCallback(async () => {
    const relPaths = [...selectedPaths]
    if (relPaths.length === 0 || !moveDest.trim()) return
    const dest = moveDest.trim()
    if (!browseAllowed(uploadBase, dest)) {
      setError('Geçersiz hedef klasör.')
      return
    }
    setMoveBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/manage/media-library', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'files', relPaths, destFolder: dest }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean
        failed?: { relPath: string }[]
        error?: string
      }
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Taşıma başarısız.')
        return
      }
      if (!data.ok && Array.isArray(data.failed) && data.failed.length > 0) {
        setError('Bazı dosyalar taşınamadı.')
      }
      setMoveDialogOpen(false)
      setSelectedPaths(new Set())
      await load()
    } catch {
      setError('Taşıma sırasında ağ hatası.')
    } finally {
      setMoveBusy(false)
    }
  }, [selectedPaths, moveDest, uploadBase, load])

  const handleUploadFiles = useCallback(
    async (fileList: FileList | File[]) => {
      const files = Array.from(fileList).filter((f) => f.size > 0)
      if (files.length === 0) return

      const t = effectiveUploadTarget
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
    [effectiveUploadTarget, batchStartIndex, onSelect, onSelectBatch, onClose, load],
  )

  const onDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragDepth.current += 1
    if (e.dataTransfer.types.includes('Files')) setDragActive(true)
  }, [])

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragDepth.current -= 1
    if (dragDepth.current <= 0) {
      dragDepth.current = 0
      setDragActive(false)
    }
  }, [])

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      dragDepth.current = 0
      setDragActive(false)
      const fl = e.dataTransfer.files
      if (fl?.length) void handleUploadFiles(fl)
    },
    [handleUploadFiles],
  )

  if (!open) return null

  const showFolderChrome = folderFeaturesEnabled
  const canGoUp = showFolderChrome && browsePrefix !== uploadBase
  const emptyLibrary = items.length === 0
  const emptyView = !loading && filteredFolders.length === 0 && filteredFiles.length === 0
  const selectedCount = selectedPaths.size
  const bulkDeleting = deletingPath === '__bulk__'

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
                'Önce altta arayın; «Seç» ile kullanın. Çoklu seçimde taşıma/silme; görseli sürükleyip bırakarak yükleme. Silmeden önce page-builder ve sliders JSON’larında `/uploads/…` araması yapılır (tam garanti değil).'}
            </p>
            {!hideFullLibraryLink ? (
              <Link
                href="/manage/media"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:underline dark:text-primary-400"
              >
                <FolderOpen className="h-3.5 w-3.5" />
                Tam medya kütüphanesini yeni sekmede aç
              </Link>
            ) : null}
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
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Bu klasörde ara… (dosya adı veya yol)"
              className="w-full rounded-lg border border-neutral-200 py-1.5 ps-8 pe-3 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
            />
          </div>
          <div className="flex shrink-0 items-center gap-1 rounded-lg border border-neutral-200 p-0.5 dark:border-neutral-700">
            <button
              type="button"
              title="Izgara"
              onClick={() => setViewMode('grid')}
              className={`rounded p-1.5 ${viewMode === 'grid' ? 'bg-neutral-200 dark:bg-neutral-700' : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}
              aria-pressed={viewMode === 'grid'}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              title="Liste"
              onClick={() => setViewMode('list')}
              className={`rounded p-1.5 ${viewMode === 'list' ? 'bg-neutral-200 dark:bg-neutral-700' : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}
              aria-pressed={viewMode === 'list'}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
          <button
            type="button"
            title="Çoklu seçim"
            onClick={() => {
              setSelectionMode((v) => !v)
              setSelectedPaths(new Set())
            }}
            className={`inline-flex shrink-0 items-center gap-1 rounded-lg border px-2 py-1.5 text-[11px] font-medium ${
              selectionMode
                ? 'border-primary-400 bg-primary-50 text-primary-900 dark:border-primary-600 dark:bg-primary-950/40 dark:text-primary-100'
                : 'border-neutral-200 text-neutral-700 hover:bg-neutral-50 dark:border-neutral-600 dark:text-neutral-200 dark:hover:bg-neutral-800'
            }`}
          >
            <SquareMousePointer className="h-3.5 w-3.5" />
            Çoklu seçim
          </button>
        </div>

        {showFolderChrome ? (
          <div className="flex flex-wrap items-center gap-2 border-b border-neutral-100 px-4 py-2 dark:border-neutral-800">
            <nav className="flex min-w-0 flex-wrap items-center gap-0.5 text-[11px] text-neutral-600 dark:text-neutral-400">
              {breadcrumbSegments.map((crumb, idx) => (
                <span key={crumb.prefix} className="flex items-center gap-0.5">
                  {idx > 0 ? <ChevronRight className="h-3 w-3 shrink-0 opacity-50" aria-hidden /> : null}
                  <button
                    type="button"
                    className={
                      idx === breadcrumbSegments.length - 1
                        ? 'max-w-[140px] truncate font-semibold text-neutral-900 dark:text-neutral-100'
                        : 'max-w-[120px] truncate rounded hover:text-primary-600 dark:hover:text-primary-400'
                    }
                    title={crumb.prefix}
                    onClick={() => setBrowsePrefix(crumb.prefix)}
                  >
                    {crumb.label}
                  </button>
                </span>
              ))}
            </nav>
            <div className="ms-auto flex shrink-0 flex-wrap items-center gap-2">
              {canGoUp ? (
                <button
                  type="button"
                  onClick={() => {
                    const parent = posixDirname(browsePrefix)
                    if (browseAllowed(uploadBase, parent)) setBrowsePrefix(parent || uploadBase)
                  }}
                  className="rounded-lg border border-neutral-200 px-2 py-1 text-[11px] font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-600 dark:text-neutral-200 dark:hover:bg-neutral-800"
                >
                  Üst klasör
                </button>
              ) : null}
              {creatingFolder ? (
                <form onSubmit={handleMkdir} className="flex flex-wrap items-center gap-1">
                  <input
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="klasor-adi"
                    autoFocus
                    disabled={mkdirBusy}
                    className="w-36 rounded border border-neutral-200 px-2 py-1 text-[11px] dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
                  />
                  <button
                    type="submit"
                    disabled={mkdirBusy || !newFolderName.trim()}
                    className="inline-flex items-center gap-1 rounded-lg bg-primary-600 px-2 py-1 text-[11px] font-medium text-white hover:bg-primary-700 disabled:opacity-50"
                  >
                    {mkdirBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                    Oluştur
                  </button>
                  <button
                    type="button"
                    disabled={mkdirBusy}
                    onClick={() => {
                      setCreatingFolder(false)
                      setNewFolderName('')
                    }}
                    className="rounded px-2 py-1 text-[11px] text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  >
                    İptal
                  </button>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setCreatingFolder(true)}
                  className="inline-flex items-center gap-1 rounded-lg border border-primary-300 bg-primary-50 px-2 py-1 text-[11px] font-medium text-primary-800 hover:bg-primary-100 dark:border-primary-700 dark:bg-primary-950/50 dark:text-primary-100 dark:hover:bg-primary-950"
                >
                  <FolderPlus className="h-3.5 w-3.5" />
                  Yeni klasör
                </button>
              )}
            </div>
          </div>
        ) : null}

        {selectionMode ? (
          <div className="flex flex-wrap items-center gap-2 border-b border-neutral-100 bg-neutral-50 px-4 py-2 text-[11px] dark:border-neutral-800 dark:bg-neutral-950">
            <span className="text-neutral-600 dark:text-neutral-400">{selectedCount} seçili</span>
            <button
              type="button"
              disabled={filteredFiles.length === 0}
              onClick={selectAllInFolder}
              className="rounded border border-neutral-200 px-2 py-1 font-medium hover:bg-white disabled:opacity-50 dark:border-neutral-600 dark:hover:bg-neutral-800"
            >
              Bu klasördeki tümünü seç
            </button>
            <button
              type="button"
              disabled={selectedCount === 0}
              onClick={() => {
                setMoveDest(browsePrefix)
                setMoveDialogOpen(true)
              }}
              className="inline-flex items-center gap-1 rounded border border-neutral-200 px-2 py-1 font-medium hover:bg-white disabled:opacity-50 dark:border-neutral-600 dark:hover:bg-neutral-800"
            >
              <Move className="h-3 w-3" />
              Taşı…
            </button>
            <button
              type="button"
              disabled={selectedCount === 0 || refsBusy || bulkDeleting}
              onClick={() => void handleBulkDelete()}
              className="inline-flex items-center gap-1 rounded border border-red-200 px-2 py-1 font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/30"
            >
              {bulkDeleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
              Sil
            </button>
          </div>
        ) : null}

        {error ? (
          <div className="mx-4 mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-100">
            {error}
          </div>
        ) : null}

        <div
          className={`relative min-h-0 flex-1 overflow-y-auto px-4 py-3 ${dragActive ? 'ring-2 ring-inset ring-primary-400' : ''}`}
          onDragEnter={onDragEnter}
          onDragLeave={onDragLeave}
          onDragOver={onDragOver}
          onDrop={onDrop}
        >
          {dragActive ? (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-primary-500/10 text-sm font-medium text-primary-800 dark:text-primary-100">
              Dosyaları bırakın — geçerli klasöre yüklenecek
            </div>
          ) : null}
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary-400" />
            </div>
          ) : emptyView ? (
            <p className="py-12 text-center text-sm text-neutral-500 dark:text-neutral-400">
              {emptyLibrary
                ? 'Henüz görsel yok. Alttaki «Bilgisayardan seç…» ile bu konuma ekleyebilir veya dosya sürükleyip bırakabilirsiniz.'
                : q
                  ? 'Aramanızla eşleşen klasör veya görsel yok.'
                  : 'Bu klasörde henüz görsel yok. «Yeni klasör» ile alt klasör açabilir veya alttan / sürükleyerek dosya yükleyebilirsiniz.'}
            </p>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {showFolderChrome
                ? filteredFolders.map((name) => {
                    const folderPath = joinBrowsePrefix(browsePrefix, name)
                    const showTrash = !folderHasAnyContent(items, folderPath)
                    return (
                      <div key={`dir:${name}`} className="relative">
                        <button
                          type="button"
                          onClick={() => setBrowsePrefix(folderPath)}
                          className="flex w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-4 text-center transition hover:border-primary-400 hover:bg-primary-50/60 dark:border-neutral-600 dark:bg-neutral-800 dark:hover:border-primary-500 dark:hover:bg-neutral-800/80"
                        >
                          <Folder className="h-10 w-10 text-amber-600 dark:text-amber-400" />
                          <span className="line-clamp-2 text-[11px] font-medium text-neutral-800 dark:text-neutral-100">
                            {name}
                          </span>
                        </button>
                        {showTrash ? (
                          <button
                            type="button"
                            title="Boş klasörü sil"
                            onClick={(e) => {
                              e.stopPropagation()
                              void handleRmdirFolder(folderPath)
                            }}
                            className="absolute end-1 top-1 rounded bg-white/90 p-1 text-red-600 shadow hover:bg-red-50 dark:bg-neutral-900/90 dark:hover:bg-red-950/50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        ) : null}
                      </div>
                    )
                  })
                : null}
              {filteredFiles.map((it) => {
                const busy = deletingPath === it.relPath || bulkDeleting
                const checked = selectedPaths.has(it.relPath)
                return (
                  <div
                    key={it.relPath}
                    className={`relative flex flex-col overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 ${checked ? 'ring-2 ring-primary-500' : ''}`}
                  >
                    {selectionMode ? (
                      <label className="absolute start-2 top-2 z-[1] flex cursor-pointer items-center rounded bg-white/90 px-1 py-0.5 shadow dark:bg-neutral-900/90">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => togglePath(it.relPath)}
                          className="h-3.5 w-3.5 rounded border-neutral-400"
                        />
                      </label>
                    ) : null}
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
                      <div className="mt-2 flex flex-wrap gap-1">
                        <button
                          type="button"
                          disabled={busy || uploading}
                          onClick={() => {
                            onSelect(it.url)
                            onClose()
                          }}
                          className="flex-1 rounded-md bg-primary-600 px-1.5 py-1 text-[10px] font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
                        >
                          Seç
                        </button>
                        <button
                          type="button"
                          disabled={busy || uploading}
                          onClick={() => void handleDeleteFile(it.relPath)}
                          className="inline-flex flex-1 items-center justify-center gap-0.5 rounded-md border border-red-300 bg-white px-1.5 py-1 text-[10px] font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:bg-neutral-900 dark:text-red-300 dark:hover:bg-red-950/40"
                        >
                          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                          Sil
                        </button>
                        <button
                          type="button"
                          disabled={uploading}
                          onClick={triggerPickFiles}
                          className="inline-flex w-full items-center justify-center gap-0.5 rounded-md border border-neutral-300 bg-white px-1.5 py-1 text-[10px] font-medium text-neutral-800 hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
                          title="Bilgisayardan dosya yükler (geçerli hedef klasör)"
                        >
                          <Plus className="h-3 w-3" />
                          Ekle
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {showFolderChrome
                ? filteredFolders.map((name) => {
                    const folderPath = joinBrowsePrefix(browsePrefix, name)
                    const showTrash = !folderHasAnyContent(items, folderPath)
                    return (
                      <div
                        key={`dir:${name}`}
                        className="relative flex items-center gap-3 rounded-lg border border-dashed border-neutral-300 bg-neutral-50 px-3 py-2 dark:border-neutral-600 dark:bg-neutral-800"
                      >
                        <Folder className="h-8 w-8 shrink-0 text-amber-600 dark:text-amber-400" />
                        <button
                          type="button"
                          className="min-w-0 flex-1 truncate text-start text-sm font-medium text-neutral-800 dark:text-neutral-100"
                          onClick={() => setBrowsePrefix(folderPath)}
                        >
                          {name}
                        </button>
                        {showTrash ? (
                          <button
                            type="button"
                            title="Boş klasörü sil"
                            onClick={() => void handleRmdirFolder(folderPath)}
                            className="shrink-0 rounded p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        ) : null}
                      </div>
                    )
                  })
                : null}
              {filteredFiles.map((it) => {
                const busy = deletingPath === it.relPath || bulkDeleting
                const checked = selectedPaths.has(it.relPath)
                return (
                  <div
                    key={it.relPath}
                    className={`flex items-center gap-3 rounded-lg border border-neutral-200 bg-neutral-50 px-2 py-2 dark:border-neutral-700 dark:bg-neutral-800 ${checked ? 'ring-2 ring-primary-500' : ''}`}
                  >
                    {selectionMode ? (
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => togglePath(it.relPath)}
                        className="h-4 w-4 shrink-0 rounded border-neutral-400"
                      />
                    ) : null}
                    <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-md bg-neutral-200 dark:bg-neutral-950">
                      <img src={it.url} alt="" className="h-full w-full object-cover" loading="lazy" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-neutral-800 dark:text-neutral-100">
                        {it.relPath.split('/').pop()}
                      </p>
                      <p className="truncate text-[11px] text-neutral-400">{it.relPath}</p>
                      <p className="text-[11px] text-neutral-400">{formatBytes(it.size)}</p>
                    </div>
                    <div className="flex shrink-0 flex-col gap-1">
                      <button
                        type="button"
                        disabled={busy || uploading}
                        onClick={() => {
                          onSelect(it.url)
                          onClose()
                        }}
                        className="rounded bg-primary-600 px-2 py-1 text-[10px] font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
                      >
                        Seç
                      </button>
                      <button
                        type="button"
                        disabled={busy || uploading}
                        onClick={() => void handleDeleteFile(it.relPath)}
                        className="rounded border border-red-300 px-2 py-1 text-[10px] font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-300"
                      >
                        Sil
                      </button>
                      <button
                        type="button"
                        disabled={uploading}
                        onClick={triggerPickFiles}
                        className="rounded border border-neutral-300 px-2 py-1 text-[10px] font-medium disabled:opacity-50"
                      >
                        Ekle
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-neutral-200 bg-neutral-50 px-4 py-3 dark:border-neutral-700 dark:bg-neutral-950">
          <p className="mb-2 text-[11px] leading-snug text-neutral-500 dark:text-neutral-400">
            {showFolderChrome ? (
              <>
                Yüklemeler{' '}
                <span className="font-mono text-neutral-700 dark:text-neutral-300">{browsePrefix}</span> klasörüne
                gider. Dosyaları doğrudan liste alanına sürükleyip bırakabilirsiniz.
              </>
            ) : (
              <>
                Listede aradığınız görsel yoksa bilgisayarınızdan seçin veya sürükleyip bu alana bırakın — önce mevcut
                kütüphaneye göz atılmış olur.
              </>
            )}
          </p>
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
          <button
            type="button"
            disabled={uploading}
            onClick={triggerPickFiles}
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-800 shadow-sm hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Bilgisayardan seç…
          </button>
        </div>
      </div>

      {moveDialogOpen ? (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Taşıma hedefi"
          onClick={() => !moveBusy && setMoveDialogOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-xl border border-neutral-200 bg-white p-4 shadow-xl dark:border-neutral-700 dark:bg-neutral-900"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
              {selectedCount} dosyayı taşı
            </h3>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              Hedef, izin verilen kökün altında olmalıdır (bu iletişim kutusu yalnızca bilinen klasörleri listeler).
            </p>
            <label className="mt-3 block text-[11px] font-medium text-neutral-600 dark:text-neutral-300">
              Hedef klasör
            </label>
            <select
              value={moveDest}
              onChange={(e) => setMoveDest(e.target.value)}
              disabled={moveBusy}
              className="mt-1 w-full rounded-lg border border-neutral-200 px-2 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
            >
              {destFolderOptions.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                disabled={moveBusy}
                onClick={() => setMoveDialogOpen(false)}
                className="rounded-lg px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                İptal
              </button>
              <button
                type="button"
                disabled={moveBusy || selectedCount === 0}
                onClick={() => void handleMoveSelected()}
                className="inline-flex items-center gap-1 rounded-lg bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
              >
                {moveBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Move className="h-4 w-4" />}
                Taşı
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
