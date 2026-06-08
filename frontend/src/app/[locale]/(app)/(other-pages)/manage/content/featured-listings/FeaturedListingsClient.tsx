'use client'

import type { TStayListing } from '@/data/listings'
import {
  DEFAULT_FEATURED_DISPLAY_COUNT,
  MAX_FEATURED_DISPLAY_COUNT,
  normalizeFeaturedDisplayCount,
} from '@/lib/featured-listings-utils'
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
] as const

interface Props {
  categorySlug: string
  categoryLabel: string
  allListings: TStayListing[]
}

export default function FeaturedListingsClient({
  categorySlug,
  categoryLabel,
  allListings,
}: Props) {
  const [featuredIds, setFeaturedIds] = useState<string[]>([])
  const [displayCount, setDisplayCount] = useState(DEFAULT_FEATURED_DISPLAY_COUNT)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/featured-listings?category=${encodeURIComponent(categorySlug)}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data?.listingIds)) setFeaturedIds(data.listingIds)
        else setFeaturedIds([])
        setDisplayCount(normalizeFeaturedDisplayCount(data?.displayCount))
      })
      .finally(() => setLoading(false))
  }, [categorySlug])

  const byId = useMemo(() => new Map(allListings.map((l) => [l.id, l])), [allListings])

  const featuredListings = useMemo(
    () => featuredIds.map((id) => byId.get(id)).filter((l): l is TStayListing => Boolean(l)),
    [featuredIds, byId],
  )

  const filteredPool = useMemo(() => {
    const q = query.trim().toLowerCase()
    const featuredSet = new Set(featuredIds)
    return allListings.filter((l) => {
      if (featuredSet.has(l.id)) return false
      if (!q) return true
      const hay = `${l.title} ${l.city ?? ''} ${l.address ?? ''}`.toLowerCase()
      return hay.includes(q)
    })
  }, [allListings, featuredIds, query])

  async function handleSave() {
    setSaving(true)
    try {
      await fetch(`/api/featured-listings?category=${encodeURIComponent(categorySlug)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categorySlug, listingIds: featuredIds, displayCount }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  function addListing(id: string) {
    if (featuredIds.includes(id)) return
    setFeaturedIds((prev) => [...prev, id])
  }

  function removeListing(id: string) {
    setFeaturedIds((prev) => prev.filter((x) => x !== id))
  }

  function moveListing(id: string, dir: -1 | 1) {
    setFeaturedIds((prev) => {
      const idx = prev.indexOf(id)
      if (idx < 0) return prev
      const next = idx + dir
      if (next < 0 || next >= prev.length) return prev
      const arr = [...prev]
      ;[arr[idx], arr[next]] = [arr[next], arr[idx]]
      return arr
    })
  }

  function clearAll() {
    setFeaturedIds([])
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
            Anasayfa ve kategori vitrinlerinde «Önerilenler» ve «Öne Çıkan» sekmelerini yönetin.
          </p>
        </div>
        <ButtonPrimary onClick={handleSave} disabled={saving}>
          {saving ? 'Kaydediliyor…' : saved ? '✓ Kaydedildi' : 'Kaydet'}
        </ButtonPrimary>
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
          Her sekmede (Önerilenler, Yeni, …) en fazla kaç kart gösterilsin.
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

      <div className="rounded-2xl border border-primary-200 bg-primary-50/60 p-5 dark:border-primary-900/40 dark:bg-primary-950/20">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-neutral-900 dark:text-neutral-100">
              {categoryLabel} — vitrin sırası
            </h2>
            <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
              {featuredIds.length === 0
                ? 'Henüz seçim yok — vitrin API sırasını kullanır.'
                : `${featuredIds.length} ilan öne çekildi · sıra yukarıdan aşağıya`}
            </p>
          </div>
          {featuredIds.length > 0 ? (
            <ButtonSecondary className="px-3 py-1.5 text-xs" onClick={clearAll}>
              Tümünü kaldır
            </ButtonSecondary>
          ) : null}
        </div>

        {featuredListings.length === 0 ? (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Aşağıdaki listeden ilan ekleyin. Vitrinde ilk {displayCount} ilan kart olarak görünür.
          </p>
        ) : (
          <ol className="space-y-2">
            {featuredListings.map((listing, idx) => (
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
                    disabled={idx === featuredListings.length - 1}
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
            <h2 className="font-semibold text-neutral-800 dark:text-neutral-200">İlan ekle</h2>
            <p className="mt-0.5 text-xs text-neutral-400">
              {allListings.length} yayında ilan · arama başlık ve konuma göre
            </p>
          </div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="İlan ara…"
            className="w-full max-w-xs rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-800 dark:text-white"
          />
        </div>

        {filteredPool.length === 0 ? (
          <p className="text-sm text-neutral-400">Eklenecek ilan bulunamadı.</p>
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
                  onClick={() => addListing(listing.id)}
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
