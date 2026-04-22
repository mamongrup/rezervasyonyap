'use client'

import { ManageFormPageHeader } from '@/components/manage/ManageFormShell'
import clsx from 'clsx'
import {
  File,
  Film,
  Filter,
  FolderOpen,
  FolderInput,
  GalleryHorizontalEnd,
  Grid2x2,
  List,
  Loader2,
  Move,
  Music,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import Image from 'next/image'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

type MediaSource = 'server' | 'local'

type MediaItem = {
  id: string
  name: string
  url: string
  type: 'image' | 'video' | 'audio' | 'document'
  size: string
  width?: number
  height?: number
  createdAt: string
  source: MediaSource
  /** Sunucudaki göreli yol: `blog/yazi/img.avif` */
  relPath?: string
}

type ApiMediaRow = { relPath: string; url: string; size: number; mtime: string }

type ViewMode = 'grid' | 'list'
type FilterType = 'all' | 'image' | 'video' | 'document'

const TYPE_ICON: Record<string, React.ElementType> = {
  image: GalleryHorizontalEnd,
  video: Film,
  audio: Music,
  document: File,
}

/** API (`route.ts`) ile aynı `SAFE_FOLDERS` kökleri. Taşıma hedefinde her zaman listelenir. */
const KNOWN_TOP_FOLDERS = [
  'branding',
  'general',
  'hero',
  'regions',
  'listings',
  'blog',
  'pages',
  'tours',
  'events',
  'travel_ideas',
  'supplier-docs',
  'site',
  'icerik',
] as const

type MoveTarget =
  | { kind: 'files'; relPaths: string[]; hint: string }
  | { kind: 'folder'; source: string }

function dirname(relPath: string): string {
  const i = relPath.lastIndexOf('/')
  return i === -1 ? '' : relPath.slice(0, i)
}

function basenamePath(relPath: string): string {
  const i = relPath.lastIndexOf('/')
  return i === -1 ? relPath : relPath.slice(i + 1)
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

function formatMtime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('tr-TR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function mapApiToItems(rows: ApiMediaRow[]): MediaItem[] {
  return rows.map((r) => ({
    id: r.relPath,
    name: basenamePath(r.relPath),
    url: r.url,
    type: 'image' as const,
    size: formatBytes(r.size),
    createdAt: formatMtime(r.mtime),
    source: 'server' as const,
    relPath: r.relPath,
  }))
}

export default function MediaLibraryClient() {
  const [items, setItems] = useState<MediaItem[]>([])
  const [loadState, setLoadState] = useState<'idle' | 'loading' | 'error'>('idle')
  const [loadError, setLoadError] = useState<string | null>(null)
  const [truncated, setTruncated] = useState(false)
  const [view, setView] = useState<ViewMode>('grid')
  const [filter, setFilter] = useState<FilterType>('all')
  const [search, setSearch] = useState('')
  const [folderFilter, setFolderFilter] = useState<string | ''>('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const refresh = useCallback(async () => {
    setLoadState('loading')
    setLoadError(null)
    try {
      const res = await fetch('/api/manage/media-library', { credentials: 'include', cache: 'no-store' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setLoadState('error')
        setLoadError(typeof data?.error === 'string' ? data.error : 'Liste yüklenemedi.')
        setItems([])
        return
      }
      if (data?.ok && Array.isArray(data.items)) {
        setItems(mapApiToItems(data.items as ApiMediaRow[]))
        setTruncated(Boolean(data.truncated))
        setLoadState('idle')
      } else {
        setLoadState('error')
        setLoadError('Beklenmeyen yanıt.')
        setItems([])
      }
    } catch {
      setLoadState('error')
      setLoadError('Ağ hatası.')
      setItems([])
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const folderOptions = useMemo(() => {
    const set = new Set<string>()
    for (const it of items) {
      if (it.relPath) {
        const d = dirname(it.relPath)
        if (d) set.add(d)
      }
    }
    return [...set].sort((a, b) => a.localeCompare(b, 'tr'))
  }, [items])

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (filter !== 'all' && item.type !== filter) return false
      if (folderFilter && item.relPath && dirname(item.relPath) !== folderFilter) return false
      if (search) {
        const q = search.toLowerCase()
        const hitName = item.name.toLowerCase().includes(q)
        const hitPath = (item.relPath ?? '').toLowerCase().includes(q)
        if (!hitName && !hitPath) return false
      }
      return true
    })
  }, [items, filter, search, folderFilter])

  const groupedByFolder = useMemo(() => {
    if (folderFilter) return null
    const m = new Map<string, MediaItem[]>()
    for (const it of filtered) {
      const key = it.relPath ? dirname(it.relPath) || '(kök)' : '(yerel)'
      if (!m.has(key)) m.set(key, [])
      m.get(key)!.push(it)
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0], 'tr'))
  }, [filtered, folderFilter])

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const [deleting, setDeleting] = useState(false)
  const [moving, setMoving] = useState(false)
  const [moveTarget, setMoveTarget] = useState<MoveTarget | null>(null)

  const openMoveForSelection = useCallback(() => {
    const serverRelPaths = items
      .filter((i) => selected.has(i.id) && i.source === 'server' && i.relPath)
      .map((i) => i.relPath as string)
    if (serverRelPaths.length === 0) {
      window.alert('Taşınacak sunucu dosyası seçilmedi.')
      return
    }
    const hint = dirname(serverRelPaths[0] ?? '')
    setMoveTarget({ kind: 'files', relPaths: serverRelPaths, hint })
  }, [items, selected])

  const openMoveForFolder = useCallback((source: string) => {
    setMoveTarget({ kind: 'folder', source })
  }, [])

  const performMove = useCallback(
    async (destPath: string) => {
      if (!moveTarget) return
      const dest = destPath.trim().replace(/^[/\\]+/, '').replace(/[/\\]+$/, '')
      if (!dest) {
        window.alert('Hedef yol boş olamaz.')
        return
      }
      setMoving(true)
      try {
        const payload =
          moveTarget.kind === 'files'
            ? { kind: 'files', relPaths: moveTarget.relPaths, destFolder: dest }
            : { kind: 'folder', source: moveTarget.source, dest }
        const res = await fetch('/api/manage/media-library', {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          window.alert(typeof data?.error === 'string' ? data.error : 'Taşıma başarısız.')
          return
        }
        if (Array.isArray(data?.failed) && data.failed.length > 0) {
          window.alert(`${data.failed.length} dosya taşınamadı.`)
        }
        setMoveTarget(null)
        setSelected(new Set())
        if (moveTarget.kind === 'folder' && folderFilter === moveTarget.source) {
          setFolderFilter(dest)
        }
        await refresh()
      } catch {
        window.alert('Ağ hatası.')
      } finally {
        setMoving(false)
      }
    },
    [folderFilter, moveTarget, refresh],
  )

  const handleDeleteSelected = useCallback(async () => {
    if (selected.size === 0) return
    const selectedItems = items.filter((i) => selected.has(i.id))
    const serverRelPaths = selectedItems
      .filter((i) => i.source === 'server' && i.relPath)
      .map((i) => i.relPath as string)
    const localIds = selectedItems.filter((i) => i.source === 'local').map((i) => i.id)

    const total = serverRelPaths.length + localIds.length
    if (total === 0) return

    const msg =
      serverRelPaths.length > 0
        ? `${total} dosya silinecek (${serverRelPaths.length} sunucu dosyası kalıcı olarak silinir). Devam edilsin mi?`
        : `${total} yerel önizleme kaldırılacak. Devam edilsin mi?`
    if (!window.confirm(msg)) return

    setDeleting(true)
    try {
      if (serverRelPaths.length > 0) {
        const res = await fetch('/api/manage/media-library', {
          method: 'DELETE',
          credentials: 'include',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ relPaths: serverRelPaths }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          const err = typeof data?.error === 'string' ? data.error : 'Silme başarısız.'
          window.alert(err)
          return
        }
        if (Array.isArray(data?.failed) && data.failed.length > 0) {
          window.alert(`${data.failed.length} dosya silinemedi.`)
        }
      }
      if (localIds.length > 0) {
        setItems((prev) => prev.filter((i) => !(i.source === 'local' && localIds.includes(i.id))))
      }
      setSelected(new Set())
      if (serverRelPaths.length > 0) {
        await refresh()
      }
    } catch {
      window.alert('Ağ hatası.')
    } finally {
      setDeleting(false)
    }
  }, [items, refresh, selected])

  const uploadWithTarget = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return
      setUploading(true)
      try {
        for (const file of files) {
          const fd = new FormData()
          fd.append('file', file)
          fd.append('useOriginalStem', '1')
          if (!folderFilter) {
            fd.append('folder', 'general')
          } else {
            const parts = folderFilter.split('/')
            fd.append('folder', parts[0] ?? 'general')
            if (parts.length > 1) {
              fd.append('subPath', parts.slice(1).join('/'))
            }
          }
          const res = await fetch('/api/upload-image', { method: 'POST', body: fd, credentials: 'include' })
          const j = await res.json().catch(() => ({}))
          if (!res.ok || !j?.ok) {
            const msg = typeof j?.error === 'string' ? j.error : 'Yükleme başarısız.'
            window.alert(msg)
            break
          }
        }
        await refresh()
      } finally {
        setUploading(false)
      }
    },
    [folderFilter, refresh],
  )

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      const files = Array.from(e.dataTransfer.files)
      const images = files.filter((f) => f.type.startsWith('image/'))
      if (images.length === 0) {
        const newItems: MediaItem[] = files.map((f, i) => ({
          id: `new-${Date.now()}-${i}`,
          name: f.name,
          url: f.type.startsWith('image/') ? URL.createObjectURL(f) : '',
          type: f.type.startsWith('image/') ? 'image' : f.type.startsWith('video/') ? 'video' : 'document',
          size: formatBytes(f.size),
          createdAt: 'Az önce',
          source: 'local',
        }))
        setItems((prev) => [...newItems, ...prev])
        return
      }
      await uploadWithTarget(images)
    },
    [uploadWithTarget],
  )


  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <ManageFormPageHeader
        title="Medya kütüphanesi"
        subtitle="Yüklenen görselleri klasörlere göre görüntüleyin; yeni dosya yükleyebilirsiniz."
      />

      <div className="flex min-h-0 flex-1 gap-4">
        {/* Klasörler */}
        <aside className="hidden w-56 shrink-0 flex-col rounded-xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900 md:flex">
          <div className="border-b border-neutral-100 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:border-neutral-800">
            Klasörler
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            <button
              type="button"
              onClick={() => setFolderFilter('')}
              className={clsx(
                'mb-1 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors',
                folderFilter === ''
                  ? 'bg-[color:var(--manage-primary-soft)] font-medium text-[color:var(--manage-primary)]'
                  : 'text-neutral-700 hover:bg-neutral-50 dark:text-neutral-200 dark:hover:bg-neutral-800',
              )}
            >
              <GalleryHorizontalEnd className="h-4 w-4 shrink-0 opacity-70" />
              Tümü
            </button>
            {folderOptions.map((f) => (
              <div
                key={f}
                className={clsx(
                  'group mb-0.5 flex items-center gap-1 rounded-lg pr-1 transition-colors',
                  folderFilter === f
                    ? 'bg-[color:var(--manage-primary-soft)]'
                    : 'hover:bg-neutral-50 dark:hover:bg-neutral-800',
                )}
              >
                <button
                  type="button"
                  title={f}
                  onClick={() => setFolderFilter(f)}
                  className={clsx(
                    'flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-2 text-left text-sm',
                    folderFilter === f
                      ? 'font-medium text-[color:var(--manage-primary)]'
                      : 'text-neutral-700 dark:text-neutral-200',
                  )}
                >
                  <FolderOpen className="h-4 w-4 shrink-0 opacity-70" />
                  <span className="truncate">{f}</span>
                </button>
                <button
                  type="button"
                  title="Bu klasörü taşı"
                  onClick={(e) => {
                    e.stopPropagation()
                    openMoveForFolder(f)
                  }}
                  className="shrink-0 rounded p-1 text-neutral-400 opacity-0 transition-opacity hover:bg-neutral-100 hover:text-[color:var(--manage-primary)] group-hover:opacity-100 dark:hover:bg-neutral-800"
                >
                  <FolderInput className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {folderOptions.length === 0 && loadState !== 'loading' ? (
              <p className="px-2 py-3 text-xs text-neutral-400">Henüz alt klasör yok.</p>
            ) : null}
          </div>
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
          {/* Üst araç çubuğu */}
          <div className="flex flex-wrap items-center gap-3 border-b border-neutral-200 px-4 py-3 dark:border-neutral-700">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <input
                type="search"
                placeholder="Dosya veya yol ara..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-neutral-200 bg-neutral-50 py-2 pl-9 pr-3 text-sm focus:border-[color:var(--manage-primary)] focus:outline-none dark:border-neutral-700 dark:bg-neutral-800"
              />
            </div>

            <div className="flex md:hidden">
              <select
                value={folderFilter}
                onChange={(e) => setFolderFilter(e.target.value)}
                className="rounded-lg border border-neutral-200 bg-neutral-50 px-2 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
              >
                <option value="">Tüm klasörler</option>
                {folderOptions.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1 rounded-lg border border-neutral-200 p-1 dark:border-neutral-700">
              <Filter className="ms-1 h-3.5 w-3.5 text-neutral-400" />
              {(['all', 'image', 'video', 'document'] as FilterType[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={clsx(
                    'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                    filter === f
                      ? 'bg-[color:var(--manage-primary)] text-white'
                      : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800',
                  )}
                >
                  {f === 'all' ? 'Tümü' : f === 'image' ? 'Görseller' : f === 'video' ? 'Video' : 'Belgeler'}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 rounded-lg border border-neutral-200 p-1 dark:border-neutral-700">
              <button
                type="button"
                onClick={() => setView('grid')}
                className={clsx(
                  'rounded p-1.5',
                  view === 'grid'
                    ? 'bg-[color:var(--manage-primary-soft)] text-[color:var(--manage-primary)]'
                    : 'text-neutral-400 hover:text-neutral-700',
                )}
              >
                <Grid2x2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setView('list')}
                className={clsx(
                  'rounded p-1.5',
                  view === 'list'
                    ? 'bg-[color:var(--manage-primary-soft)] text-[color:var(--manage-primary)]'
                    : 'text-neutral-400 hover:text-neutral-700',
                )}
              >
                <List className="h-4 w-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => void refresh()}
              disabled={loadState === 'loading'}
              className="flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
            >
              <RefreshCw className={clsx('h-4 w-4', loadState === 'loading' && 'animate-spin')} />
              Yenile
            </button>

            {selected.size > 0 ? (
              <>
                <button
                  type="button"
                  disabled={moving}
                  onClick={openMoveForSelection}
                  className="flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
                >
                  <Move className="h-4 w-4" />
                  {selected.size} taşı
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => void handleDeleteSelected()}
                  className="flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-100 disabled:opacity-50 dark:bg-red-950/30 dark:text-red-400"
                >
                  {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  {selected.size} sil
                </button>
              </>
            ) : null}

            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 rounded-lg bg-[color:var(--manage-primary)] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-50"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Yükle
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const list = e.target.files
                if (list?.length) void uploadWithTarget(Array.from(list))
                e.target.value = ''
              }}
            />
          </div>

          {/* İçerik */}
          <div
            className={clsx(
              'flex-1 overflow-y-auto p-4 transition-colors md:p-6',
              dragging && 'bg-[color:var(--manage-primary-soft)] ring-inset ring-2 ring-[color:var(--manage-primary)]',
            )}
            onDragOver={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
          >
            {loadState === 'loading' && items.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center gap-3 text-neutral-400">
                <Loader2 className="h-10 w-10 animate-spin" />
                <p className="text-sm">Medya taranıyor…</p>
              </div>
            ) : loadState === 'error' ? (
              <div className="flex h-64 flex-col items-center justify-center gap-3 text-neutral-500">
                <p className="text-sm">{loadError ?? 'Hata'}</p>
                <button
                  type="button"
                  onClick={() => void refresh()}
                  className="rounded-lg bg-[color:var(--manage-primary)] px-4 py-2 text-sm font-medium text-white"
                >
                  Tekrar dene
                </button>
              </div>
            ) : dragging ? (
              <div className="flex h-64 flex-col items-center justify-center gap-3 text-[color:var(--manage-primary)]">
                <Upload className="h-12 w-12" />
                <p className="text-lg font-semibold">Görselleri buraya bırakın</p>
                <p className="text-xs text-neutral-500">
                  {folderFilter
                    ? `Hedef klasör: ${folderFilter}`
                    : 'Klasör seçili değil; dosyalar “general” altına gider.'}
                </p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center gap-3 text-neutral-400">
                <GalleryHorizontalEnd className="h-12 w-12" />
                <p className="text-sm text-center">
                  Bu görünümde dosya yok. Soldan klasör seçin veya yükleyin.
                  {truncated ? ' (Liste üst sınıra ulaştı; daha fazla dosya olabilir.)' : ''}
                </p>
              </div>
            ) : !folderFilter && groupedByFolder ? (
              <div className="space-y-10">
                {groupedByFolder.map(([dir, groupItems]) => (
                  <section key={dir}>
                    <div className="mb-3 flex items-center justify-between gap-2 border-b border-neutral-100 pb-2 dark:border-neutral-800">
                      <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">{dir}</h3>
                      {dir !== '(yerel)' && dir !== '(kök)' ? (
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            className="flex items-center gap-1 text-xs font-medium text-neutral-600 hover:text-[color:var(--manage-primary)] dark:text-neutral-300"
                            onClick={() => openMoveForFolder(dir)}
                          >
                            <FolderInput className="h-3.5 w-3.5" />
                            Klasörü taşı
                          </button>
                          <button
                            type="button"
                            className="text-xs font-medium text-[color:var(--manage-primary)] hover:underline"
                            onClick={() => setFolderFilter(dir)}
                          >
                            Sadece bu klasör
                          </button>
                        </div>
                      ) : null}
                    </div>
                    {view === 'grid' ? (
                      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 2xl:grid-cols-12">
                        {groupItems.map((item) => renderGridCard(item, selected, toggleSelect))}
                      </div>
                    ) : (
                      renderListTable(groupItems, selected, toggleSelect)
                    )}
                  </section>
                ))}
              </div>
            ) : view === 'grid' ? (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 2xl:grid-cols-12">
                {filtered.map((item) => renderGridCard(item, selected, toggleSelect))}
              </div>
            ) : (
              renderListTable(filtered, selected, toggleSelect)
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-neutral-200 px-4 py-2 text-xs text-neutral-500 dark:border-neutral-700">
            <span>
              {filtered.length} öğe
              {truncated ? ' · en fazla 800 dosya listelenir' : ''}
            </span>
            {selected.size > 0 ? <span>{selected.size} seçili</span> : null}
            <span className="text-neutral-400">
              Seçip “sil” butonu ile kaldırın. Sunucudaki dosyalar kalıcı olarak silinir.
            </span>
          </div>
        </div>
      </div>

      {moveTarget ? (
        <MoveDialog
          target={moveTarget}
          folderOptions={folderOptions}
          moving={moving}
          onCancel={() => setMoveTarget(null)}
          onConfirm={(dest) => void performMove(dest)}
        />
      ) : null}
    </div>
  )
}

function MoveDialog({
  target,
  folderOptions,
  moving,
  onCancel,
  onConfirm,
}: {
  target: MoveTarget
  folderOptions: string[]
  moving: boolean
  onCancel: () => void
  onConfirm: (dest: string) => void
}) {
  const isFolder = target.kind === 'folder'
  const sourcePath = isFolder ? target.source : target.hint
  const topFromSource = sourcePath.split('/')[0] ?? ''

  const suggested = useMemo(() => {
    const set = new Set<string>()
    for (const t of KNOWN_TOP_FOLDERS) set.add(t)
    for (const f of folderOptions) set.add(f)
    if (isFolder) set.delete(target.source)
    return [...set].sort((a, b) => a.localeCompare(b, 'tr'))
  }, [folderOptions, isFolder, target])

  const [custom, setCustom] = useState(() => {
    if (isFolder) {
      return target.source
    }
    return topFromSource || 'general'
  })

  const title = isFolder ? `Klasörü taşı: ${target.source}` : `${target.relPaths.length} dosyayı taşı`

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !moving) onCancel()
      }}
    >
      <div className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-xl dark:bg-neutral-900">
        <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
          <h2 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">{title}</h2>
          <button
            type="button"
            className="rounded p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            onClick={onCancel}
            disabled={moving}
            aria-label="Kapat"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto px-4 py-3">
          <p className="mb-2 text-xs text-neutral-500">
            {isFolder
              ? 'Yeni klasör yolunu yazın (örn. `branding/eski-logolar`). Kök, izinli üst klasörlerden biri olmalıdır.'
              : 'Aşağıdan hedef klasörü seçin veya yolu kendiniz yazın.'}
          </p>
          {!isFolder ? (
            <div className="mb-3 grid grid-cols-2 gap-1">
              {suggested.map((f) => (
                <button
                  key={f}
                  type="button"
                  disabled={moving}
                  onClick={() => onConfirm(f)}
                  className="flex items-center gap-2 truncate rounded-lg border border-neutral-200 bg-white px-2 py-2 text-left text-xs text-neutral-700 hover:border-[color:var(--manage-primary)] hover:bg-[color:var(--manage-primary-soft)] disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
                  title={f}
                >
                  <FolderOpen className="h-3.5 w-3.5 shrink-0 opacity-70" />
                  <span className="truncate">{f}</span>
                </button>
              ))}
            </div>
          ) : null}
          <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-300">
            {isFolder ? 'Yeni yol' : 'Özel hedef (isteğe bağlı)'}
          </label>
          <input
            type="text"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder={isFolder ? 'branding/yeni-ad' : 'branding/logos'}
            className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm focus:border-[color:var(--manage-primary)] focus:outline-none dark:border-neutral-700 dark:bg-neutral-800"
            disabled={moving}
          />
          <p className="mt-2 text-[11px] text-neutral-400">
            İzinli kökler: {KNOWN_TOP_FOLDERS.join(', ')}.
          </p>
        </div>
        <div className="flex justify-end gap-2 border-t border-neutral-200 px-4 py-3 dark:border-neutral-800">
          <button
            type="button"
            onClick={onCancel}
            disabled={moving}
            className="rounded-lg border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
          >
            İptal
          </button>
          <button
            type="button"
            onClick={() => onConfirm(custom)}
            disabled={moving || !custom.trim()}
            className="flex items-center gap-1.5 rounded-lg bg-[color:var(--manage-primary)] px-3 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-50"
          >
            {moving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Move className="h-4 w-4" />}
            Taşı
          </button>
        </div>
      </div>
    </div>
  )
}

function renderGridCard(
  item: MediaItem,
  selected: Set<string>,
  toggleSelect: (id: string) => void,
) {
  const Icon = TYPE_ICON[item.type] ?? File
  return (
    <div
      key={item.id}
      onClick={() => toggleSelect(item.id)}
      className={clsx(
        'group relative cursor-pointer overflow-hidden rounded-xl border-2 transition-all',
        selected.has(item.id)
          ? 'border-[color:var(--manage-primary)] shadow-md'
          : 'border-transparent hover:border-neutral-300 dark:hover:border-neutral-600',
      )}
    >
      {item.type === 'image' && item.url ? (
        <div className="relative aspect-square bg-neutral-100 dark:bg-neutral-800">
          <Image
            src={item.url}
            alt={item.name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 33vw, (max-width: 1024px) 16vw, 120px"
            unoptimized={item.url.startsWith('blob:')}
          />
        </div>
      ) : (
        <div className="flex aspect-square items-center justify-center bg-neutral-100 dark:bg-neutral-800">
          <Icon className="h-10 w-10 text-neutral-400" />
        </div>
      )}
      {selected.has(item.id) ? (
        <div className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[color:var(--manage-primary)] text-xs font-bold text-white shadow">
          ✓
        </div>
      ) : null}
      <div className="bg-white px-1.5 py-1 dark:bg-neutral-900">
        <p className="truncate text-[11px] font-medium text-neutral-800 dark:text-neutral-200" title={item.name}>
          {item.name}
        </p>
        <p className="truncate text-[10px] text-neutral-400">{item.size}</p>
      </div>
    </div>
  )
}

function renderListTable(items: MediaItem[], selected: Set<string>, toggleSelect: (id: string) => void) {
  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-100 bg-neutral-50 text-xs font-medium text-neutral-500 dark:border-neutral-700 dark:bg-neutral-800">
            <th className="py-2 pl-4 text-left">Ad</th>
            <th className="py-2 text-left">Yol</th>
            <th className="py-2 text-left">Boyut</th>
            <th className="py-2 pr-4 text-left">Tarih</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => {
            const Icon = TYPE_ICON[item.type] ?? File
            return (
              <tr
                key={item.id}
                onClick={() => toggleSelect(item.id)}
                className={clsx(
                  'cursor-pointer border-b border-neutral-50 transition-colors last:border-0 dark:border-neutral-800',
                  selected.has(item.id)
                    ? 'bg-[color:var(--manage-primary-soft)]'
                    : idx % 2 === 1
                      ? 'bg-neutral-50/50 dark:bg-neutral-800/30'
                      : '',
                  'hover:bg-[color:var(--manage-primary-soft)]',
                )}
              >
                <td className="flex items-center gap-3 py-2.5 pl-4">
                  {item.type === 'image' && item.url ? (
                    <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded">
                      <Image
                        src={item.url}
                        alt={item.name}
                        fill
                        className="object-cover"
                        sizes="32px"
                        unoptimized={item.url.startsWith('blob:')}
                      />
                    </div>
                  ) : (
                    <Icon className="h-8 w-8 shrink-0 text-neutral-400" />
                  )}
                  <span className="max-w-[10rem] truncate font-medium text-neutral-800 dark:text-neutral-200">
                    {item.name}
                  </span>
                </td>
                <td className="max-w-xs truncate py-2.5 text-neutral-500" title={item.relPath}>
                  {item.relPath ?? '—'}
                </td>
                <td className="py-2.5 text-neutral-500">{item.size}</td>
                <td className="py-2.5 pr-4 text-neutral-400">{item.createdAt}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
