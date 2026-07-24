'use client'

import type { TStayListing } from '@/data/listings'
import {
  DEFAULT_FEATURED_DISPLAY_COUNT,
  EMPTY_FEATURED_TAB_IDS,
  featuredEditorTabOptions,
  filterListingsForFeaturedPicker,
  MAX_FEATURED_DISPLAY_COUNT,
  normalizeFeaturedDisplayCount,
  normalizeFeaturedTabListingIds,
  type FeaturedTabKind,
} from '@/lib/featured-listings-utils'
import type { FeaturedTabListingIds } from '@/types/listing-types'
import ButtonPrimary from '@/shared/ButtonPrimary'
import ButtonSecondary from '@/shared/ButtonSecondary'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

const MANAGED_CATEGORIES = [
  { slug: 'oteller', label: 'Oteller' },
  { slug: 'tatil-evleri', label: 'Tatil Evleri' },
  { slug: 'yat-kiralama', label: 'Yat Kiralama' },
  { slug: 'turlar', label: 'Turlar' },
  { slug: 'aktiviteler', label: 'Aktiviteler' },
  { slug: 'feribot', label: 'Feribot' },
] as const

interface Props {
  categorySlug: string
  categoryLabel: string
  locale: string
  allListings: TStayListing[]
  totalListings: number
}

export default function FeaturedListingsClient({
  categorySlug,
  categoryLabel,
  locale,
  allListings,
  totalListings,
}: Props) {
  const [tabIds, setTabIds] = useState<FeaturedTabListingIds>(EMPTY_FEATURED_TAB_IDS)
  const [activeTab, setActiveTab] = useState<FeaturedTabKind>('recommended')
  const [featuredCache, setFeaturedCache] = useState<Map<string, TStayListing>>(new Map())
  const [displayCount, setDisplayCount] = useState(DEFAULT_FEATURED_DISPLAY_COUNT)
  const [query, setQuery] = useState('')
  const [poolListings, setPoolListings] = useState<TStayListing[]>(allListings)
  const [poolTotal, setPoolTotal] = useState(totalListings)
  const [searchLoading, setSearchLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const editorTabs = useMemo(() => featuredEditorTabOptions(categorySlug), [categorySlug])

  useEffect(() => {
    if (!editorTabs.some((t) => t.kind === activeTab)) {
      setActiveTab('recommended')
    }
  }, [editorTabs, activeTab])

  const activeIds = tabIds[activeTab]

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch(
      `/api/featured-listings?category=${encodeURIComponent(categorySlug)}&locale=${encodeURIComponent(locale)}`,
    )
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        setTabIds(
          normalizeFeaturedTabListingIds(data?.tabs, data?.listingIds),
        )
        setDisplayCount(normalizeFeaturedDisplayCount(data?.displayCount))
        const cache = new Map<string, TStayListing>()
        if (Array.isArray(data?.listings)) {
          for (const listing of data.listings as TStayListing[]) {
            if (listing?.id) cache.set(listing.id, listing)
          }
        }
        setFeaturedCache(cache)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [categorySlug, locale])

  useEffect(() => {
    setPoolListings(allListings)
    setPoolTotal(totalListings)
    setQuery('')
  }, [allListings, totalListings, categorySlug])

  useEffect(() => {
    const q = query.trim()
    if (!q) {
      setPoolListings(allListings)
      setPoolTotal(totalListings)
      setSearchLoading(false)
      return
    }

    setSearchLoading(true)
    const timer = window.setTimeout(() => {
      fetch(
        `/api/featured-listings/search?category=${encodeURIComponent(categorySlug)}&q=${encodeURIComponent(q)}&locale=${encodeURIComponent(locale)}`,
      )
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data?.listings)) {
            const rows = filterListingsForFeaturedPicker(data.listings as TStayListing[])
            setPoolListings(rows)
            setPoolTotal(typeof data.total === 'number' ? data.total : rows.length)
          }
        })
        .finally(() => setSearchLoading(false))
    }, 300)

    return () => window.clearTimeout(timer)
  }, [query, categorySlug, locale, allListings, totalListings])

  const byId = useMemo(() => {
    const map = new Map(allListings.map((l) => [l.id, l]))
    for (const listing of poolListings) map.set(listing.id, listing)
    return map
  }, [allListings, poolListings])

  const activeTabListings = useMemo(
    () =>
      activeIds
        .map((id) => featuredCache.get(id) ?? byId.get(id))
        .filter((l): l is TStayListing => Boolean(l)),
    [activeIds, featuredCache, byId],
  )

  const activeTabLabel = editorTabs.find((t) => t.kind === activeTab)?.label ?? 'Önerilenler'

  const filteredPool = useMemo(() => {
    const tabSet = new Set(activeIds)
    return poolListings.filter((l) => !tabSet.has(l.id))
  }, [poolListings, activeIds])

  const poolTruncated = query.trim() !== '' && poolTotal > poolListings.length

  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    try {
      const res = await fetch(`/api/featured-listings?category=${encodeURIComponent(categorySlug)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categorySlug, tabs: tabIds, displayCount }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null
        throw new Error(data?.error ?? `Kayıt başarısız (HTTP ${res.status})`)
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Kayıt başarısız')
    } finally {
      setSaving(false)
    }
  }

  function updateActiveTabIds(updater: (prev: string[]) => string[]) {
    setTabIds((prev) => ({
      ...prev,
      [activeTab]: updater(prev[activeTab]),
    }))
  }

  function addListing(listing: TStayListing) {
    if (activeIds.includes(listing.id)) return
    setFeaturedCache((prev) => new Map(prev).set(listing.id, listing))
    updateActiveTabIds((prev) => [...prev, listing.id])
  }

  function removeListing(id: string) {
    updateActiveTabIds((prev) => prev.filter((x) => x !== id))
  }

  function moveListing(id: string, dir: -1 | 1) {
    updateActiveTabIds((prev) => {
      const idx = prev.indexOf(id)
      if (idx < 0) return prev
      const next = idx + dir
      if (next < 0 || next >= prev.length) return prev
      const arr = [...prev]
      ;[arr[idx], arr[next]] = [arr[next], arr[idx]]
      return arr
    })
  }

  function clearActiveTab() {
    updateActiveTabIds(() => [])
  }

  if (loading) {
    return <div className="py-12 text-center text-sm text-neutral-400">Yükleniyor…</div>
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
            Öne Çıkan İlanlar
          </h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Anasayfa vitrin sekmelerine (Önerilenler, Lüks, Ekonomik, Yeni, …) ayrı ayrı ilan atayın.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {saveError ? (
            <p className="text-xs text-red-600 dark:text-red-400">{saveError}</p>
          ) : null}
          <ButtonPrimary onClick={handleSave} disabled={saving}>
            {saving ? 'Kaydediliyor…' : saved ? '✓ Kaydedildi' : 'Kaydet'}
          </ButtonPrimary>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {MANAGED_CATEGORIES.map((cat) => {
          const active = cat.slug === categorySlug
          return (
            <Link
              key={cat.slug}
              href={`/manage/content/featured-listings?category=${cat.slug}`}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                active
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'border border-neutral-200 text-neutral-600 hover:border-primary-400 hover:text-primary-700 dark:border-neutral-700 dark:text-neutral-300'
              }`}
            >
              {cat.label}
            </Link>
          )
        })}
      </div>

      <div className="rounded-2xl border border-neutral-200 p-5 dark:border-neutral-700">
        <h2 className="font-semibold text-neutral-800 dark:text-neutral-200">Vitrin ayarları</h2>
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          Her sekmede en fazla kaç kart gösterilsin.
        </p>
        <label className="mt-4 flex max-w-xs flex-col gap-1.5">
          <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Gösterilecek ilan sayısı
          </span>
          <input
            type="number"
            min={1}
            max={MAX_FEATURED_DISPLAY_COUNT}
            value={displayCount}
            onChange={(e) => setDisplayCount(normalizeFeaturedDisplayCount(e.target.value))}
            className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-800 dark:text-white"
          />
          <span className="text-xs text-neutral-400">
            Varsayılan {DEFAULT_FEATURED_DISPLAY_COUNT} · en fazla {MAX_FEATURED_DISPLAY_COUNT}
          </span>
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        {editorTabs.map((tab) => {
          const count = tabIds[tab.kind].length
          const isActive = activeTab === tab.kind
          return (
            <button
              key={tab.kind}
              type="button"
              onClick={() => setActiveTab(tab.kind)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900'
                  : 'border border-neutral-200 text-neutral-600 hover:border-neutral-400 dark:border-neutral-700 dark:text-neutral-300'
              }`}
            >
              {tab.label}
              {count > 0 ? (
                <span className="ml-1.5 text-xs opacity-70">({count})</span>
              ) : null}
            </button>
          )
        })}
      </div>

      <div className="rounded-2xl border border-primary-200 bg-primary-50/60 p-5 dark:border-primary-900/40 dark:bg-primary-950/20">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-neutral-900 dark:text-neutral-100">
              {categoryLabel} — {activeTabLabel}
            </h2>
            <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
              {activeIds.length === 0
                ? 'Henüz seçim yok — vitrin otomatik filtre kullanır.'
                : `${activeIds.length} ilan · sıra yukarıdan aşağıya`}
            </p>
          </div>
          {activeIds.length > 0 ? (
            <ButtonSecondary className="px-3 py-1.5 text-xs" onClick={clearActiveTab}>
              Sekmeyi temizle
            </ButtonSecondary>
          ) : null}
        </div>

        {activeIds.length > 0 && activeTabListings.length === 0 ? (
          <p className="text-sm text-amber-700 dark:text-amber-300">
            {activeIds.length} ilan kayıtlı ama vitrinde gösterilemedi — ilanlar yayından kalkmış veya
            kategori uyuşmuyor olabilir. Kaldırıp yeniden ekleyin.
          </p>
        ) : activeTabListings.length === 0 ? (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Aşağıdaki listeden «{activeTabLabel}» sekmesine ilan ekleyin. Vitrinde ilk {displayCount}{' '}
            kart görünür.
          </p>
        ) : (
          <ol className="space-y-2">
            {activeTabListings.map((listing, idx) => (
              <li
                key={listing.id}
                className="flex items-center gap-3 rounded-xl border border-white/80 bg-white px-3 py-2.5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
                  {idx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-neutral-900 dark:text-neutral-100">
                    {listing.title}
                  </p>
                  <p className="truncate text-xs text-neutral-400">
                    {listing.city ?? listing.address ?? '—'} · {listing.price}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => moveListing(listing.id, -1)}
                    disabled={idx === 0}
                    className="rounded p-1 text-xs text-neutral-400 hover:text-neutral-700 disabled:opacity-30"
                    title="Yukarı"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    onClick={() => moveListing(listing.id, 1)}
                    disabled={idx === activeTabListings.length - 1}
                    className="rounded p-1 text-xs text-neutral-400 hover:text-neutral-700 disabled:opacity-30"
                    title="Aşağı"
                  >
                    ▼
                  </button>
                  <button
                    type="button"
                    onClick={() => removeListing(listing.id)}
                    className="rounded p-1 text-red-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                    title="Kaldır"
                  >
                    ✕
                  </button>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="rounded-2xl border border-neutral-200 p-5 dark:border-neutral-700">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-semibold text-neutral-800 dark:text-neutral-200">
              İlan ekle — {activeTabLabel}
            </h2>
            <p className="mt-0.5 text-xs text-neutral-400">
              {poolTotal} yayında ilan
              {query.trim() ? ' · arama tüm ilanlar arasında' : ''}
              {searchLoading ? ' · aranıyor…' : ''}
            </p>
          </div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Başlık veya slug ile ara…"
            className="w-full max-w-xs rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-800 dark:text-white"
          />
        </div>

        {poolTruncated ? (
          <p className="mb-3 text-xs text-amber-600 dark:text-amber-400">
            {poolListings.length} sonuç gösteriliyor — aramanızı daraltın veya daha spesifik yazın.
          </p>
        ) : null}

        {filteredPool.length === 0 ? (
          <p className="text-sm text-neutral-400">
            {searchLoading ? 'Aranıyor…' : 'Eklenecek ilan bulunamadı.'}
          </p>
        ) : (
          <ul className="max-h-[28rem] space-y-1.5 overflow-y-auto">
            {filteredPool.map((listing) => (
              <li
                key={listing.id}
                className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-800/60"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-neutral-800 dark:text-neutral-200">
                    {listing.title}
                  </p>
                  <p className="truncate text-xs text-neutral-400">
                    {listing.city ?? listing.address ?? '—'} · {listing.price}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => addListing(listing)}
                  className="shrink-0 rounded-lg border border-dashed border-primary-300 px-3 py-1 text-xs font-medium text-primary-700 hover:bg-primary-50 dark:border-primary-700 dark:text-primary-300 dark:hover:bg-primary-950/30"
                >
                  + Ekle
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
