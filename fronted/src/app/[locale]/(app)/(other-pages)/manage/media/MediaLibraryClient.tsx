'use client'

import clsx from 'clsx'
import {
  File,
  Film,
  Filter,
  GalleryHorizontalEnd,
  Grid2x2,
  List,
  Music,
  Search,
  Trash2,
  Upload,
} from 'lucide-react'
import Image from 'next/image'
import { useCallback, useRef, useState } from 'react'

type MediaItem = {
  id: string
  name: string
  url: string
  type: 'image' | 'video' | 'audio' | 'document'
  size: string
  width?: number
  height?: number
  createdAt: string
}

const MOCK_MEDIA: MediaItem[] = [
  { id: '1', name: 'hero-bodrum.avif', url: 'https://images.unsplash.com/photo-1533104816931-20fa691ff6ca?w=400', type: 'image', size: '142 KB', width: 1920, height: 1080, createdAt: '2 sa önce' },
  { id: '2', name: 'villa-terrace.avif', url: 'https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=400', type: 'image', size: '98 KB', width: 1600, height: 900, createdAt: 'Dün' },
  { id: '3', name: 'yacht-main.avif', url: 'https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?w=400', type: 'image', size: '210 KB', width: 2400, height: 1350, createdAt: 'Dün' },
  { id: '4', name: 'pool-view.avif', url: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400', type: 'image', size: '176 KB', width: 1920, height: 1280, createdAt: '3 gün önce' },
  { id: '5', name: 'hotel-lobby.avif', url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400', type: 'image', size: '234 KB', width: 2560, height: 1440, createdAt: '3 gün önce' },
  { id: '6', name: 'beach-sunset.avif', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400', type: 'image', size: '189 KB', width: 1920, height: 1080, createdAt: '5 gün önce' },
]

type ViewMode = 'grid' | 'list'
type FilterType = 'all' | 'image' | 'video' | 'document'

const TYPE_ICON: Record<string, React.ElementType> = {
  image: GalleryHorizontalEnd,
  video: Film,
  audio: Music,
  document: File,
}

export default function MediaLibraryClient() {
  const [items, setItems] = useState<MediaItem[]>(MOCK_MEDIA)
  const [view, setView] = useState<ViewMode>('grid')
  const [filter, setFilter] = useState<FilterType>('all')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const filtered = items.filter((item) => {
    if (filter !== 'all' && item.type !== filter) return false
    if (search && !item.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const files = Array.from(e.dataTransfer.files)
    const newItems: MediaItem[] = files.map((f, i) => ({
      id: `new-${Date.now()}-${i}`,
      name: f.name,
      url: URL.createObjectURL(f),
      type: f.type.startsWith('image/') ? 'image' : f.type.startsWith('video/') ? 'video' : 'document',
      size: `${Math.round(f.size / 1024)} KB`,
      createdAt: 'Az önce',
    }))
    setItems((prev) => [...newItems, ...prev])
  }, [])

  const handleDeleteSelected = useCallback(() => {
    setItems((prev) => prev.filter((i) => !selected.has(i.id)))
    setSelected(new Set())
  }, [selected])

  return (
    <div className="flex h-full flex-col">
      {/* Üst araç çubuğu */}
      <div className="flex flex-wrap items-center gap-3 border-b border-neutral-200 bg-white px-6 py-3 dark:border-neutral-700 dark:bg-neutral-900">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="search"
            placeholder="Dosya ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-neutral-200 bg-neutral-50 py-2 pl-9 pr-3 text-sm focus:border-[color:var(--manage-primary)] focus:outline-none dark:border-neutral-700 dark:bg-neutral-800"
          />
        </div>

        {/* Filtre */}
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

        {/* Görünüm */}
        <div className="flex items-center gap-1 rounded-lg border border-neutral-200 p-1 dark:border-neutral-700">
          <button
            type="button"
            onClick={() => setView('grid')}
            className={clsx('rounded p-1.5', view === 'grid' ? 'bg-[color:var(--manage-primary-soft)] text-[color:var(--manage-primary)]' : 'text-neutral-400 hover:text-neutral-700')}
          >
            <Grid2x2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setView('list')}
            className={clsx('rounded p-1.5', view === 'list' ? 'bg-[color:var(--manage-primary-soft)] text-[color:var(--manage-primary)]' : 'text-neutral-400 hover:text-neutral-700')}
          >
            <List className="h-4 w-4" />
          </button>
        </div>

        {selected.size > 0 ? (
          <button
            type="button"
            onClick={handleDeleteSelected}
            className="flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-100 dark:bg-red-950/30 dark:text-red-400"
          >
            <Trash2 className="h-4 w-4" />
            {selected.size} sil
          </button>
        ) : null}

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 rounded-lg bg-[color:var(--manage-primary)] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90"
        >
          <Upload className="h-4 w-4" />
          Yükle
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*,application/pdf,.doc,.docx"
          className="hidden"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? [])
            const newItems: MediaItem[] = files.map((f, i) => ({
              id: `new-${Date.now()}-${i}`,
              name: f.name,
              url: f.type.startsWith('image/') ? URL.createObjectURL(f) : '',
              type: f.type.startsWith('image/') ? 'image' : f.type.startsWith('video/') ? 'video' : 'document',
              size: `${Math.round(f.size / 1024)} KB`,
              createdAt: 'Az önce',
            }))
            setItems((prev) => [...newItems, ...prev])
          }}
        />
      </div>

      {/* Drag & Drop alanı + içerik */}
      <div
        className={clsx(
          'flex-1 overflow-y-auto p-6 transition-colors',
          dragging && 'ring-inset ring-4 ring-[color:var(--manage-primary)] bg-[color:var(--manage-primary-soft)]',
        )}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        {dragging ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3 text-[color:var(--manage-primary)]">
            <Upload className="h-12 w-12" />
            <p className="text-lg font-semibold">Dosyaları buraya bırakın</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3 text-neutral-400">
            <GalleryHorizontalEnd className="h-12 w-12" />
            <p className="text-sm">Henüz medya yok. Yükle butonuna basın veya sürükleyin.</p>
          </div>
        ) : view === 'grid' ? (
          <div className="grid gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
            {filtered.map((item) => (
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
                      sizes="200px"
                      unoptimized={item.url.startsWith('blob:')}
                    />
                  </div>
                ) : (
                  <div className="flex aspect-square items-center justify-center bg-neutral-100 dark:bg-neutral-800">
                    {(() => { const Icon = TYPE_ICON[item.type] ?? File; return <Icon className="h-10 w-10 text-neutral-400" /> })()}
                  </div>
                )}
                {selected.has(item.id) ? (
                  <div className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-[color:var(--manage-primary)] text-white text-xs font-bold">✓</div>
                ) : null}
                <div className="bg-white p-2 dark:bg-neutral-900">
                  <p className="truncate text-xs font-medium text-neutral-800 dark:text-neutral-200">{item.name}</p>
                  <p className="text-[10px] text-neutral-400">{item.size} · {item.createdAt}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100 bg-neutral-50 text-xs font-medium text-neutral-500 dark:border-neutral-700 dark:bg-neutral-800">
                  <th className="py-2 pl-4 text-left">Ad</th>
                  <th className="py-2 text-left">Tür</th>
                  <th className="py-2 text-left">Boyut</th>
                  <th className="py-2 pr-4 text-left">Eklenme</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item, idx) => {
                  const Icon = TYPE_ICON[item.type] ?? File
                  return (
                    <tr
                      key={item.id}
                      onClick={() => toggleSelect(item.id)}
                      className={clsx(
                        'cursor-pointer border-b border-neutral-50 transition-colors last:border-0 dark:border-neutral-800',
                        selected.has(item.id)
                          ? 'bg-[color:var(--manage-primary-soft)]'
                          : idx % 2 === 0 ? '' : 'bg-neutral-50/50 dark:bg-neutral-800/30',
                        'hover:bg-[color:var(--manage-primary-soft)]',
                      )}
                    >
                      <td className="flex items-center gap-3 py-2.5 pl-4">
                        {item.type === 'image' && item.url ? (
                          <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded">
                            <Image src={item.url} alt={item.name} fill className="object-cover" sizes="32px" unoptimized={item.url.startsWith('blob:')} />
                          </div>
                        ) : (
                          <Icon className="h-8 w-8 text-neutral-400" />
                        )}
                        <span className="max-w-xs truncate font-medium text-neutral-800 dark:text-neutral-200">{item.name}</span>
                      </td>
                      <td className="py-2.5 text-neutral-500 capitalize">{item.type}</td>
                      <td className="py-2.5 text-neutral-500">{item.size}</td>
                      <td className="py-2.5 pr-4 text-neutral-400">{item.createdAt}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Alt durum çubuğu */}
      <div className="flex items-center justify-between border-t border-neutral-200 bg-white px-6 py-2 text-xs text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900">
        <span>{filtered.length} öğe</span>
        {selected.size > 0 ? <span>{selected.size} seçili</span> : null}
        <span>Sürükle & bırak veya &quot;Yükle&quot; butonu ile dosya ekleyin · AVIF dönüşümü otomatik uygulanır</span>
      </div>
    </div>
  )
}
