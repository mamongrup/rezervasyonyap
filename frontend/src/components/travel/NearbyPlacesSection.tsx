'use client'

import { MapPin } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { RegionPlaceData } from '@/app/api/region-places/route'
import { interpolate } from '@/utils/interpolate'
import { getMessages } from '@/utils/getT'

// ─── Haversine (kuş uçuşu km) ─────────────────────────────────────────────────
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * (Math.PI / 180)
  const dLng = (lng2 - lng1) * (Math.PI / 180)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ─── Mesafe badge ─────────────────────────────────────────────────────────────
function distanceLabel(km: number, metersTpl: string, kmTpl: string): string {
  return km < 1
    ? interpolate(metersTpl, { distance: String(Math.round(km * 1000)) })
    : interpolate(kmTpl, { distance: km.toFixed(1) })
}

function distanceColor(km: number): string {
  if (km < 5) return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
  if (km < 20) return 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300'
  return 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
}

interface Place {
  placeId: string
  name: string
  address: string
  distanceKm: number
  rating?: number
  openNow?: boolean
  lat: number
  lng: number
}

function googleMapsHrefForSavedPlace(place: Place): string {
  const pid = place.placeId?.trim() ?? ''
  if (pid.includes('travel_idea:') || pid.startsWith('svc:'))
    return `https://www.google.com/maps?q=${place.lat},${place.lng}`
  return `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(pid)}`
}

interface PlaceTypeData {
  id: string
  name: string
  emoji: string
  googleType: string
  places: Place[]
}

interface CategoryData {
  id: string
  name: string
  icon: string
  types: PlaceTypeData[]
}

function formatSavedDate(iso: string, locale: string): string {
  try {
    const d = new Date(iso)
    const lang = locale.split('-')[0]?.toLowerCase() ?? 'en'
    const tag =
      lang === 'tr'
        ? 'tr-TR'
        : lang === 'de'
          ? 'de-DE'
          : lang === 'fr'
            ? 'fr-FR'
            : lang === 'ru'
              ? 'ru-RU'
              : lang === 'zh'
                ? 'zh-CN'
                : 'en-GB'
    return d.toLocaleDateString(tag)
  } catch {
    return iso
  }
}

// ─── Tek mekan satırı ─────────────────────────────────────────────────────────
function PlaceRow({
  place,
  openLabel,
  closedLabel,
  metersTpl,
  kmTpl,
}: {
  place: Place
  openLabel: string
  closedLabel: string
  metersTpl: string
  kmTpl: string
}) {
  return (
    <a
      href={googleMapsHrefForSavedPlace(place)}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center justify-between gap-4 rounded-xl px-4 py-3 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/60"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-neutral-900 group-hover:text-primary-600 dark:text-white dark:group-hover:text-primary-400">
          {place.name}
        </p>
        {place.address ? (
          <p className="mt-0.5 truncate text-xs text-neutral-500">{place.address}</p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {place.rating ? (
          <span className="flex items-center gap-0.5 text-xs font-medium text-amber-500">
            ★ {place.rating.toFixed(1)}
          </span>
        ) : null}
        {place.openNow !== undefined ? (
          <span className={`text-[10px] font-medium ${place.openNow ? 'text-emerald-600' : 'text-red-500'}`}>
            {place.openNow ? openLabel : closedLabel}
          </span>
        ) : null}
        <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${distanceColor(place.distanceKm)}`}>
          {distanceLabel(place.distanceKm, metersTpl, kmTpl)}
        </span>
      </div>
    </a>
  )
}

// ─── Tek kategori bloğu ───────────────────────────────────────────────────────
function CategoryBlock({
  category,
  placesCountTemplate,
  openLabel,
  closedLabel,
  metersTpl,
  kmTpl,
}: {
  category: CategoryData
  placesCountTemplate: string
  openLabel: string
  closedLabel: string
  metersTpl: string
  kmTpl: string
}) {
  const [openTypes, setOpenTypes] = useState<Set<string>>(
    new Set(category.types.slice(0, 2).map((t) => t.id)),
  )

  const toggle = (typeId: string) =>
    setOpenTypes((prev) => {
      const next = new Set(prev)
      next.has(typeId) ? next.delete(typeId) : next.add(typeId)
      return next
    })

  const allPlaces = category.types.flatMap((t) => t.places)
  if (allPlaces.length === 0) return null

  return (
    <div className="rounded-2xl border border-neutral-100 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
      {/* Kategori başlığı */}
      <div className="flex items-center gap-3 border-b border-neutral-50 px-5 py-4 dark:border-neutral-800">
        <span className="text-2xl">{category.icon}</span>
        <div>
          <h3 className="text-base font-semibold text-neutral-900 dark:text-white">{category.name}</h3>
          <p className="text-xs text-neutral-500">
            {interpolate(placesCountTemplate, { count: String(allPlaces.length) })}
          </p>
        </div>
      </div>

      {/* Tür grupları */}
      <div className="divide-y divide-neutral-50 dark:divide-neutral-800">
        {category.types.map((tp) => {
          if (tp.places.length === 0) return null
          const isOpen = openTypes.has(tp.id)

          return (
            <div key={tp.id}>
              <button
                type="button"
                onClick={() => toggle(tp.id)}
                className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40"
              >
                <span className="text-lg">{tp.emoji}</span>
                <span className="flex-1 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  {tp.name}
                </span>
                <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
                  {tp.places.length}
                </span>
                <svg
                  className={`h-4 w-4 shrink-0 text-neutral-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isOpen ? (
                <div className="border-t border-neutral-50 dark:border-neutral-800">
                  {tp.places.map((place) => (
                    <PlaceRow
                      key={place.placeId}
                      place={place}
                      openLabel={openLabel}
                      closedLabel={closedLabel}
                      metersTpl={metersTpl}
                      kmTpl={kmTpl}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Harita altı: tek kartta sıralı liste (mesafeye göre) ─────────────────────
function FlatPlaceRow({
  place,
  typeEmoji,
  typeName,
  metersTpl,
  kmTpl,
}: {
  place: Place
  typeEmoji: string
  typeName: string
  metersTpl: string
  kmTpl: string
}) {
  return (
    <a
      href={googleMapsHrefForSavedPlace(place)}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/70"
    >
      <span
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-neutral-100 to-neutral-50 text-lg shadow-inner dark:from-neutral-800 dark:to-neutral-900"
        aria-hidden
      >
        {typeEmoji}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-neutral-900 group-hover:text-primary-600 dark:text-white dark:group-hover:text-primary-400">
          {place.name}
        </p>
        <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">{typeName}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-0.5">
        {place.rating ? (
          <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">★ {place.rating.toFixed(1)}</span>
        ) : null}
        <span
          className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${distanceColor(place.distanceKm)}`}
        >
          {distanceLabel(place.distanceKm, metersTpl, kmTpl)}
        </span>
      </div>
    </a>
  )
}

// ─── Ana bileşen ──────────────────────────────────────────────────────────────
interface NearbyPlacesSectionProps {
  /** Vitrin dili — metinler `site.region` çevirilerinden gelir */
  locale?: string
  /** Bölgenin URL slug'ı — /api/region-places?slug={regionSlug} üzerinden veri çekilir */
  regionSlug?: string
  /** Sunucu tarafından önceden yüklenmiş veri (varsa fetch atlanır) */
  initialData?: RegionPlaceData | null
  /** Özelleştirilmiş başlık */
  title?: string
  /** Max kaç kategori gösterilsin (varsayılan: tümü) */
  maxCategories?: number
  /**
   * `flat`: harita altında tek kartta mesafeye göre sıralı liste (varsayılan: `grid`).
   */
  variant?: 'grid' | 'flat'
  /** `variant="flat"` iken en fazla kaç satır */
  maxPlaces?: number
  /**
   * İlanın koordinatları — girilirse tüm mekan mesafeleri bu noktadan
   * Haversine formülüyle yeniden hesaplanır.
   */
  overrideLat?: number
  overrideLng?: number
  /** Varsayılan `listingSection__wrap`; ilan detay yığınında `listingSection__wrap--stacked` */
  sectionClassName?: string
}

export default function NearbyPlacesSection({
  locale = 'tr',
  regionSlug,
  initialData,
  title,
  maxCategories,
  variant = 'grid',
  maxPlaces = 12,
  overrideLat,
  overrideLng,
  sectionClassName = 'listingSection__wrap',
}: NearbyPlacesSectionProps) {
  const copy = useMemo(() => getMessages(locale).site.region, [locale])

  const [rawData, setRawData] = useState<RegionPlaceData | null>(initialData ?? null)
  const [loading, setLoading] = useState(initialData === undefined && !!regionSlug)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Eğer initialData verilmişse (null dahil) fetch yapma
    if (initialData !== undefined) return
    if (!regionSlug) { setLoading(false); return }

    let cancelled = false
    setLoading(true)
    setError(null)

    fetch(`/api/region-places?slug=${encodeURIComponent(regionSlug)}`)
      .then(async (res) => {
        if (res.status === 404) return null
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json() as Promise<RegionPlaceData>
      })
      .then((d) => {
        if (!cancelled) {
          setRawData(d)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : copy.nearbyPlacesLoadFailed)
          setLoading(false)
        }
      })

    return () => { cancelled = true }
  }, [regionSlug, initialData, copy.nearbyPlacesLoadFailed])

  // ─── Mesafe yeniden hesaplama (ilan koordinatından) ───────────────────────
  const data = useMemo<RegionPlaceData | null>(() => {
    if (!rawData) return null
    if (overrideLat == null || overrideLng == null) return rawData

    return {
      ...rawData,
      categories: rawData.categories.map((cat) => ({
        ...cat,
        types: cat.types.map((tp) => ({
          ...tp,
          places: tp.places
            .map((p) => {
              if (p.lat != null && p.lng != null) {
                return { ...p, distanceKm: haversineKm(overrideLat, overrideLng, p.lat, p.lng) }
              }
              return p
            })
            .sort((a, b) => a.distanceKm - b.distanceKm),
        })),
      })),
    }
  }, [rawData, overrideLat, overrideLng])

  const flatItems = useMemo(() => {
    if (!data || variant !== 'flat') return []
    const cats = data.categories.filter((cat) => cat.types.some((tp) => tp.places.length > 0))
    const out: Array<Place & { typeEmoji: string; typeName: string }> = []
    for (const cat of cats) {
      for (const tp of cat.types) {
        for (const p of tp.places) {
          out.push({ ...p, typeEmoji: tp.emoji, typeName: tp.name })
        }
      }
    }
    return out.sort((a, b) => a.distanceKm - b.distanceKm).slice(0, maxPlaces)
  }, [data, variant, maxPlaces])

  if (loading) {
    return (
      <div
        className={`flex items-center justify-center text-neutral-400 ${variant === 'flat' ? 'py-6' : 'py-12'}`}
      >
        <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span className="ml-2 text-sm">{copy.nearbyPlacesLoading}</span>
      </div>
    )
  }

  if (error || !data) return null

  const categories = (maxCategories ? data.categories.slice(0, maxCategories) : data.categories)
    .filter((cat) => cat.types.some((tp) => tp.places.length > 0))

  if (categories.length === 0) return null

  const totalPlaces = categories.flatMap((c) => c.types).flatMap((t) => t.places).length
  const hasOverride = overrideLat != null && overrideLng != null

  if (variant === 'flat') {
    if (flatItems.length === 0) return null
    const heading = title ?? copy.nearbyPlacesFlatHeadingFallback
    const savedFmt = data.savedAt ? formatSavedDate(data.savedAt, locale) : ''
    return (
      <section className={sectionClassName}>
        <div className="overflow-hidden rounded-2xl border border-neutral-200/90 bg-white shadow-sm ring-1 ring-black/[0.03] dark:border-neutral-700 dark:bg-neutral-900 dark:ring-white/5">
          <div className="border-b border-neutral-100 bg-gradient-to-r from-neutral-50/90 to-white px-4 py-3.5 dark:border-neutral-800 dark:from-neutral-900 dark:to-neutral-950">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-500/10 text-primary-600 dark:bg-primary-500/15 dark:text-primary-400">
                <MapPin className="h-5 w-5" strokeWidth={2} />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold tracking-tight text-neutral-900 dark:text-white">{heading}</h2>
                <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                  {data.regionName}
                  {hasOverride ? copy.nearbyPlacesFlatListingDistanceSuffix : ''}
                  {data.savedAt ? interpolate(copy.nearbyPlacesFlatDateSuffix, { date: savedFmt }) : ''}
                </p>
              </div>
            </div>
          </div>
          <div className="divide-y divide-neutral-100 p-2 dark:divide-neutral-800">
            {flatItems.map((p, idx) => (
              <FlatPlaceRow
                key={`${p.placeId}-${idx}`}
                place={p}
                typeEmoji={p.typeEmoji}
                typeName={p.typeName}
                metersTpl={copy.nearbyPlacesDistanceMeters}
                kmTpl={copy.nearbyPlacesDistanceKm}
              />
            ))}
          </div>
        </div>
      </section>
    )
  }

  const coordsStr = `${data.coordinates.lat.toFixed(4)}, ${data.coordinates.lng.toFixed(4)}`
  const savedFmtGrid = data.savedAt ? formatSavedDate(data.savedAt, locale) : ''

  return (
    <section className={sectionClassName}>
      {/* Başlık */}
      <div>
        <h2 className="text-2xl font-semibold text-neutral-900 dark:text-white">
          {title ?? interpolate(copy.nearbyPlacesGridAroundHeading, { regionName: data.regionName })}
        </h2>
        <p className="mt-1 text-sm text-neutral-500">
          {hasOverride
            ? interpolate(copy.nearbyPlacesGridSubtitleListing, { count: String(totalPlaces) })
            : interpolate(copy.nearbyPlacesGridSubtitleCoords, {
                coords: coordsStr,
                count: String(totalPlaces),
              })}
          {data.savedAt ? interpolate(copy.nearbyPlacesGridUpdatedSuffix, { date: savedFmtGrid }) : ''}
        </p>
        {hasOverride ? (
          <p className="mt-0.5 text-xs text-neutral-400">{copy.nearbyPlacesFootnoteCrowFlight}</p>
        ) : null}
      </div>

      {/* Kategori grid */}
      <div className="grid gap-4 lg:grid-cols-2">
        {categories.map((cat) => (
          <CategoryBlock
            key={cat.id}
            category={cat as CategoryData}
            placesCountTemplate={copy.nearbyPlacesPlacesCount}
            openLabel={copy.nearbyPlacesOpenNow}
            closedLabel={copy.nearbyPlacesClosedNow}
            metersTpl={copy.nearbyPlacesDistanceMeters}
            kmTpl={copy.nearbyPlacesDistanceKm}
          />
        ))}
      </div>
    </section>
  )
}
