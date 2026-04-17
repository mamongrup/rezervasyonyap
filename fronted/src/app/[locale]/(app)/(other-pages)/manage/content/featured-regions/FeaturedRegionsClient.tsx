'use client'

import type { FeaturedByRegionConfig, FeaturedRegionEntry } from '@/types/listing-types'
import type { TStayListing } from '@/data/listings'
import { useEffect, useState } from 'react'
import ButtonPrimary from '@/shared/ButtonPrimary'
import ButtonSecondary from '@/shared/ButtonSecondary'

interface Props {
  /** Hangi sayfa için config yükleniyor (ör. "homepage", "oteller") */
  pageKey: string
  pageLabel: string
  /** Tüm ilan listesi (seçim için) */
  allListings: TStayListing[]
  /** Mevcut tüm şehirler */
  availableCities: string[]
}

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/İ/g, 'i').replace(/ı/g, 'i').replace(/ş/g, 's')
    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/\s+/g, '-')
}

export default function FeaturedRegionsClient({ pageKey, pageLabel, allListings, availableCities }: Props) {
  const [config, setConfig] = useState<FeaturedByRegionConfig>({
    heading: 'Öne Çıkan İlanlar',
    subheading: 'Popüler bölgelerdeki en iyi seçenekler',
    viewAllHref: '',
    regions: [],
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/featured-regions?page=${pageKey}`)
      .then((r) => r.json())
      .then((data) => {
        if (data) setConfig(data)
      })
      .finally(() => setLoading(false))
  }, [pageKey])

  async function handleSave() {
    setSaving(true)
    try {
      await fetch(`/api/featured-regions?page=${pageKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  function addRegion(cityName: string) {
    if (config.regions.find((r) => r.name === cityName)) return
    setConfig((prev) => ({
      ...prev,
      regions: [...prev.regions, { name: cityName, slug: slugify(cityName), listingIds: [] }],
    }))
  }

  function removeRegion(slug: string) {
    setConfig((prev) => ({ ...prev, regions: prev.regions.filter((r) => r.slug !== slug) }))
  }

  function moveRegion(slug: string, dir: -1 | 1) {
    setConfig((prev) => {
      const arr = [...prev.regions]
      const idx = arr.findIndex((r) => r.slug === slug)
      const newIdx = idx + dir
      if (newIdx < 0 || newIdx >= arr.length) return prev
      ;[arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]]
      return { ...prev, regions: arr }
    })
  }

  function toggleListingPin(regionSlug: string, listingId: string) {
    setConfig((prev) => ({
      ...prev,
      regions: prev.regions.map((r) => {
        if (r.slug !== regionSlug) return r
        const ids = r.listingIds ?? []
        return {
          ...r,
          listingIds: ids.includes(listingId) ? ids.filter((id) => id !== listingId) : [...ids, listingId],
        }
      }),
    }))
  }

  function clearPins(regionSlug: string) {
    setConfig((prev) => ({
      ...prev,
      regions: prev.regions.map((r) => (r.slug === regionSlug ? { ...r, listingIds: [] } : r)),
    }))
  }

  if (loading) {
    return <div className="py-12 text-center text-sm text-neutral-400">Yükleniyor…</div>
  }

  const unusedCities = availableCities.filter((c) => !config.regions.find((r) => r.name === c))

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
            Bölgeye Göre Öne Çıkar
          </h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Sayfa: <strong>{pageLabel}</strong>
          </p>
        </div>
        <ButtonPrimary onClick={handleSave} disabled={saving}>
          {saving ? 'Kaydediliyor…' : saved ? '✓ Kaydedildi' : 'Kaydet'}
        </ButtonPrimary>
      </div>

      {/* Section settings */}
      <div className="rounded-2xl border border-neutral-200 p-6 dark:border-neutral-700 space-y-4">
        <h2 className="font-semibold text-neutral-800 dark:text-neutral-200">Bölüm Başlığı</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Başlık
            </label>
            <input
              className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-800 dark:text-white"
              value={config.heading ?? ''}
              onChange={(e) => setConfig((prev) => ({ ...prev, heading: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Alt başlık
            </label>
            <input
              className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-800 dark:text-white"
              value={config.subheading ?? ''}
              onChange={(e) => setConfig((prev) => ({ ...prev, subheading: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              "Tümünü gör" linki
            </label>
            <input
              className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-800 dark:text-white"
              placeholder="/oteller/all"
              value={config.viewAllHref ?? ''}
              onChange={(e) => setConfig((prev) => ({ ...prev, viewAllHref: e.target.value }))}
            />
          </div>
        </div>
      </div>

      {/* Add regions */}
      <div className="rounded-2xl border border-neutral-200 p-6 dark:border-neutral-700">
        <h2 className="mb-4 font-semibold text-neutral-800 dark:text-neutral-200">Bölge Ekle</h2>
        {unusedCities.length === 0 ? (
          <p className="text-sm text-neutral-400">Tüm mevcut bölgeler eklenmiş.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {unusedCities.map((city) => (
              <button
                key={city}
                onClick={() => addRegion(city)}
                className="rounded-full border border-dashed border-neutral-300 px-4 py-1.5 text-sm text-neutral-600 hover:border-primary-500 hover:text-primary-600 dark:border-neutral-600 dark:text-neutral-400"
              >
                + {city}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Region list */}
      <div className="space-y-4">
        <h2 className="font-semibold text-neutral-800 dark:text-neutral-200">
          Aktif Bölgeler ({config.regions.length})
        </h2>

        {config.regions.length === 0 ? (
          <p className="text-sm text-neutral-400">Henüz bölge eklenmedi. Yukarıdan ekleyin.</p>
        ) : (
          config.regions.map((region, idx) => {
            const regionListings = allListings.filter(
              (l) => l.city?.toLowerCase() === region.name.toLowerCase(),
            )
            const pinnedIds = region.listingIds ?? []

            return (
              <div
                key={region.slug}
                className="rounded-2xl border border-neutral-200 p-5 dark:border-neutral-700"
              >
                {/* Region header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => moveRegion(region.slug, -1)}
                        disabled={idx === 0}
                        className="rounded p-0.5 text-xs text-neutral-400 hover:text-neutral-700 disabled:opacity-30"
                        title="Yukarı taşı"
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => moveRegion(region.slug, 1)}
                        disabled={idx === config.regions.length - 1}
                        className="rounded p-0.5 text-xs text-neutral-400 hover:text-neutral-700 disabled:opacity-30"
                        title="Aşağı taşı"
                      >
                        ▼
                      </button>
                    </div>
                    <div>
                      <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
                        {region.name}
                      </h3>
                      <p className="text-xs text-neutral-400">
                        {regionListings.length} ilan mevcut
                        {pinnedIds.length > 0 && ` · ${pinnedIds.length} sabitlenmiş`}
                        {pinnedIds.length === 0 && ' · Tümü gösteriliyor'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {pinnedIds.length > 0 && (
                      <ButtonSecondary
                        className="px-3 py-1.5 text-xs"
                        onClick={() => clearPins(region.slug)}
                      >
                        Sabitlemeleri kaldır
                      </ButtonSecondary>
                    )}
                    <button
                      onClick={() => removeRegion(region.slug)}
                      className="rounded-full p-2 text-red-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                      title="Bölgeyi kaldır"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Listing pins */}
                {regionListings.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">
                      İlanları Sabitle (boş bırakırsan tümü gösterilir):
                    </p>
                    <div className="flex flex-col gap-1.5">
                      {regionListings.map((listing) => {
                        const isPinned = pinnedIds.includes(listing.id)
                        return (
                          <label
                            key={listing.id}
                            className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors ${
                              isPinned
                                ? 'bg-primary-50 dark:bg-primary-900/20'
                                : 'hover:bg-neutral-50 dark:hover:bg-neutral-800'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isPinned}
                              onChange={() => toggleListingPin(region.slug, listing.id)}
                              className="h-4 w-4 rounded accent-primary-600"
                            />
                            <span className="font-medium text-neutral-800 dark:text-neutral-200">
                              {listing.title}
                            </span>
                            <span className="ml-auto text-xs text-neutral-400">
                              {listing.price} · ★{listing.reviewStart}
                            </span>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
