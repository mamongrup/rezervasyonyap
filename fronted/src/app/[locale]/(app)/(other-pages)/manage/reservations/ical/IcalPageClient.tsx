'use client'

import {
  createIcalFeed,
  deleteIcalFeed,
  listIcalFeeds,
  patchIcalFeed,
  type IcalFeed,
} from '@/lib/travel-api'
import clsx from 'clsx'
import {
  CalendarSync,
  Link2,
  Loader2,
  Minus,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useState, type FormEvent } from 'react'

function FeedRow({
  feed,
  onDelete,
  onPatch,
  deleting,
}: {
  feed: IcalFeed
  onDelete: (id: string) => void
  onPatch: (id: string, data: { day_offset_plus?: number; day_offset_minus?: number }) => void
  deleting: boolean
}) {
  const [editMode, setEditMode] = useState(false)
  const [plus, setPlus] = useState(feed.day_offset_plus)
  const [minus, setMinus] = useState(feed.day_offset_minus)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    await onPatch(feed.id, { day_offset_plus: plus, day_offset_minus: minus })
    setSaving(false)
    setEditMode(false)
  }

  return (
    <tr className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
      <td className="py-3 pl-5 pr-2">
        <div className="flex items-center gap-1.5">
          <Link2 className="h-3.5 w-3.5 shrink-0 text-neutral-300" />
          <a
            href={feed.url}
            target="_blank"
            rel="noopener noreferrer"
            className="max-w-[320px] truncate font-mono text-xs text-[color:var(--manage-primary)] hover:underline"
          >
            {feed.url}
          </a>
        </div>
        <p className="mt-0.5 text-[11px] text-neutral-400">
          İlan: <span className="font-mono">{feed.listing_id.slice(0, 8)}…</span>
        </p>
      </td>
      <td className="py-3 text-center">
        {editMode ? (
          <input
            type="number"
            value={plus}
            onChange={(e) => setPlus(parseInt(e.target.value, 10) || 0)}
            className="w-16 rounded-lg border border-neutral-200 px-2 py-1 text-center text-sm dark:border-neutral-700 dark:bg-neutral-800"
          />
        ) : (
          <span className="text-sm text-neutral-700 dark:text-neutral-300">+{feed.day_offset_plus}</span>
        )}
      </td>
      <td className="py-3 text-center">
        {editMode ? (
          <input
            type="number"
            value={minus}
            onChange={(e) => setMinus(parseInt(e.target.value, 10) || 0)}
            className="w-16 rounded-lg border border-neutral-200 px-2 py-1 text-center text-sm dark:border-neutral-700 dark:bg-neutral-800"
          />
        ) : (
          <span className="text-sm text-neutral-700 dark:text-neutral-300">-{feed.day_offset_minus}</span>
        )}
      </td>
      <td className="py-3 text-xs text-neutral-400">
        {feed.last_sync_at ? new Date(feed.last_sync_at).toLocaleString('tr-TR') : 'Henüz senkronize edilmedi'}
      </td>
      <td className="py-3 pr-5">
        <div className="flex items-center justify-end gap-1">
          {editMode ? (
            <>
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving}
                className="rounded-lg bg-[color:var(--manage-primary)] px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Kaydet'}
              </button>
              <button
                type="button"
                onClick={() => { setEditMode(false); setPlus(feed.day_offset_plus); setMinus(feed.day_offset_minus) }}
                className="rounded-lg border border-neutral-200 px-2.5 py-1 text-xs text-neutral-500 dark:border-neutral-700"
              >
                İptal
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setEditMode(true)}
              className="rounded-lg border border-neutral-200 px-2.5 py-1 text-xs text-neutral-500 hover:bg-neutral-50 dark:border-neutral-700"
            >
              Düzenle
            </button>
          )}
          <button
            type="button"
            disabled={deleting}
            onClick={() => onDelete(feed.id)}
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
          >
            {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          </button>
        </div>
      </td>
    </tr>
  )
}

export default function IcalPageClient() {
  const [feeds, setFeeds] = useState<IcalFeed[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Add form
  const [showForm, setShowForm] = useState(false)
  const [fListingId, setFListingId] = useState('')
  const [fUrl, setFUrl] = useState('')
  const [fPlus, setFPlus] = useState(0)
  const [fMinus, setFMinus] = useState(0)
  const [addingBusy, setAddingBusy] = useState(false)

  // Search by listing ID
  const [searchListingId, setSearchListingId] = useState('')
  const [searched, setSearched] = useState(false)

  const loadFeeds = useCallback(async (listingId: string) => {
    if (!listingId.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await listIcalFeeds(listingId.trim())
      setFeeds(res.feeds)
      setSearched(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Yüklenemedi')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleDelete = useCallback(async (id: string) => {
    if (!window.confirm('Bu iCal beslemesi silinsin mi?')) return
    setDeletingId(id)
    try {
      await deleteIcalFeed(id)
      setFeeds((prev) => prev.filter((f) => f.id !== id))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Silinemedi')
    } finally {
      setDeletingId(null)
    }
  }, [])

  const handlePatch = useCallback(
    async (id: string, data: { day_offset_plus?: number; day_offset_minus?: number }) => {
      try {
        await patchIcalFeed(id, data)
        setFeeds((prev) =>
          prev.map((f) =>
            f.id === id
              ? {
                  ...f,
                  day_offset_plus: data.day_offset_plus ?? f.day_offset_plus,
                  day_offset_minus: data.day_offset_minus ?? f.day_offset_minus,
                }
              : f,
          ),
        )
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Güncellenemedi')
      }
    },
    [],
  )

  const handleAdd = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()
      setAddingBusy(true)
      try {
        const { id } = await createIcalFeed({
          listing_id: fListingId.trim(),
          url: fUrl.trim(),
          day_offset_plus: fPlus,
          day_offset_minus: fMinus,
        })
        const newFeed: IcalFeed = {
          id,
          listing_id: fListingId.trim(),
          url: fUrl.trim(),
          day_offset_plus: fPlus,
          day_offset_minus: fMinus,
          last_sync_at: null,
          last_hash: null,
        }
        setFeeds((prev) => [...prev, newFeed])
        setShowForm(false)
        setFUrl('')
        setFListingId('')
        setFPlus(0)
        setFMinus(0)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Eklenemedi')
      } finally {
        setAddingBusy(false)
      }
    },
    [fListingId, fUrl, fPlus, fMinus],
  )

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-100 text-teal-600 dark:bg-teal-950/40">
            <CalendarSync className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">iCal Takvimleri</h1>
            <p className="mt-1 text-sm text-neutral-500">
              İlanlar için harici takvim besleme URL'leri. +/- gün ofseti ile doluluk tamponu ekleyin.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 rounded-xl bg-[color:var(--manage-primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Yeni eklenti
        </button>
      </div>

      {error ? (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
          <button type="button" onClick={() => setError(null)} className="ml-auto"><X className="h-4 w-4" /></button>
        </div>
      ) : null}

      {/* Add form */}
      {showForm ? (
        <div className="mb-6 rounded-2xl border border-[color:var(--manage-primary)] bg-white p-6 shadow-sm dark:bg-neutral-900">
          <h2 className="mb-4 text-base font-semibold">Yeni iCal Bağlantısı</h2>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-500">İlan ID <span className="text-red-500">*</span></label>
                <input
                  required
                  type="text"
                  placeholder="uuid..."
                  value={fListingId}
                  onChange={(e) => setFListingId(e.target.value)}
                  className="w-full rounded-xl border border-neutral-200 px-3 py-2 font-mono text-sm focus:border-[color:var(--manage-primary)] focus:outline-none dark:border-neutral-700 dark:bg-neutral-800"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-500">iCal URL <span className="text-red-500">*</span></label>
                <input
                  required
                  type="url"
                  placeholder="https://..."
                  value={fUrl}
                  onChange={(e) => setFUrl(e.target.value)}
                  className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:border-[color:var(--manage-primary)] focus:outline-none dark:border-neutral-700 dark:bg-neutral-800"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-500">
                  <Plus className="inline h-3.5 w-3.5 text-emerald-500" /> Öncesi tampon (gün)
                </label>
                <input
                  type="number"
                  min={0}
                  value={fPlus}
                  onChange={(e) => setFPlus(parseInt(e.target.value, 10) || 0)}
                  className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-500">
                  <Minus className="inline h-3.5 w-3.5 text-red-400" /> Sonrası tampon (gün)
                </label>
                <input
                  type="number"
                  min={0}
                  value={fMinus}
                  onChange={(e) => setFMinus(parseInt(e.target.value, 10) || 0)}
                  className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-neutral-200 px-4 py-2 text-sm text-neutral-600 dark:border-neutral-700">İptal</button>
              <button type="submit" disabled={addingBusy} className="flex items-center gap-2 rounded-xl bg-[color:var(--manage-primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                {addingBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Ekle
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {/* Search by listing */}
      <div className="mb-4 flex gap-3">
        <input
          type="text"
          placeholder="İlan ID girin ve Ara butonuna basın…"
          value={searchListingId}
          onChange={(e) => setSearchListingId(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void loadFeeds(searchListingId)}
          className="flex-1 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm font-mono focus:border-[color:var(--manage-primary)] focus:outline-none dark:border-neutral-700 dark:bg-neutral-800"
        />
        <button
          type="button"
          onClick={() => void loadFeeds(searchListingId)}
          disabled={loading || !searchListingId.trim()}
          className="flex items-center gap-2 rounded-xl bg-[color:var(--manage-primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Ara
        </button>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-neutral-100 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
        {!searched ? (
          <div className="flex flex-col items-center justify-center py-16 text-neutral-400">
            <CalendarSync className="mb-3 h-10 w-10 opacity-40" />
            <p className="text-sm">İlan ID girerek besleme listesini görüntüleyin.</p>
          </div>
        ) : feeds.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-neutral-400">
            <p className="text-sm">Bu ilana ait iCal beslemesi yok.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-50 bg-neutral-50 text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:border-neutral-800 dark:bg-neutral-800/50">
                <th className="py-3 pl-5 text-left">URL</th>
                <th className="py-3 text-center">+Tampon</th>
                <th className="py-3 text-center">-Tampon</th>
                <th className="py-3 text-left">Son senkron</th>
                <th className="py-3 pr-5 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50 dark:divide-neutral-800">
              {feeds.map((f) => (
                <FeedRow
                  key={f.id}
                  feed={f}
                  onDelete={(id) => void handleDelete(id)}
                  onPatch={handlePatch}
                  deleting={deletingId === f.id}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
