import type { RegionPlaceData } from '@/app/api/region-places/route'
import type { NearbyPoi } from '@/lib/travel-api'
import {
  applyListingCoordsToRegionPlaces,
} from '@/lib/region-places-from-location-page'
import {
  formatNearbyVitrinDistanceKm,
  resolveNearbyVitrinForDisplay,
  type NearbyVitrinColumnsConfig,
  type ResolvedNearbyVitrinColumn,
} from '@/lib/nearby-vitrin-columns'
import { getMessages } from '@/utils/getT'
import Link from 'next/link'

function enrichVitrinWithListingPois(
  columns: ResolvedNearbyVitrinColumn[],
  pois: NearbyPoi[],
): ResolvedNearbyVitrinColumn[] {
  if (!pois.length || !columns.length) return columns

  const seen = new Set(
    columns.flatMap((col) =>
      col.cells.map((cell) => cell.placeName?.trim().toLocaleLowerCase('tr-TR')).filter(Boolean),
    ),
  )

  const extras = [...pois]
    .sort((a, b) => (a.distance_km ?? 0) - (b.distance_km ?? 0))
    .filter((poi) => {
      const key = poi.title.trim().toLocaleLowerCase('tr-TR')
      if (!key || seen.has(key)) return false
      seen.add(key)
      return true
    })
    .slice(0, 5)
    .map((poi) => ({
      rowLabel: poi.summary?.trim().slice(0, 48) || poi.title,
      placeName: poi.title,
      distanceLabel:
        poi.distance_km > 0 ? formatNearbyVitrinDistanceKm(poi.distance_km) : null,
      mapsHref: poi.link?.trim() || null,
    }))

  if (!extras.length) return columns

  return columns.map((col, index) =>
    index === 0 ? { ...col, cells: [...extras, ...col.cells].slice(0, 10) } : col,
  )
}

interface Props {
  placesData: RegionPlaceData
  config: NearbyVitrinColumnsConfig
  locale?: string
  listingLat?: number | null
  listingLng?: number | null
  nearbyPois?: NearbyPoi[]
  title?: string
}

export default function ListingNearbyPlacesVitrinSection({
  placesData,
  config,
  locale = 'tr',
  listingLat,
  listingLng,
  nearbyPois = [],
  title,
}: Props) {
  const copy = getMessages(locale).site.region
  const heading = title ?? copy.nearbyVitrinHeading

  const data =
    listingLat != null && listingLng != null
      ? applyListingCoordsToRegionPlaces(placesData, listingLat, listingLng)
      : placesData

  const columns = enrichVitrinWithListingPois(
    resolveNearbyVitrinForDisplay(data, config),
    nearbyPois,
  ).filter((col) => col.cells.length > 0)

  if (columns.length === 0) return null

  const hasListingCoords = listingLat != null && listingLng != null

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">{heading}</h3>
        <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
          {data.regionName}
          {hasListingCoords ? copy.nearbyPlacesFlatListingDistanceSuffix : ''}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {columns.map((col) => (
          <div
            key={col.title}
            className="min-w-0 rounded-2xl border border-neutral-100 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/40"
          >
            <h4 className="border-b border-neutral-100 pb-2.5 text-sm font-semibold text-neutral-900 dark:border-neutral-800 dark:text-white">
              {col.title}
            </h4>
            <ul className="mt-3 flex flex-col gap-3">
              {col.cells.map((cell) => (
                <li key={`${col.title}-${cell.rowLabel}-${cell.placeName}`} className="flex flex-col gap-0.5">
                  {cell.placeName && cell.distanceLabel ? (
                    cell.mapsHref ? (
                      <Link
                        href={cell.mapsHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex flex-col gap-0.5"
                      >
                        {cell.rowLabel.trim().toLocaleLowerCase('tr-TR') !==
                        cell.placeName.trim().toLocaleLowerCase('tr-TR') ? (
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
                            {cell.rowLabel}
                          </span>
                        ) : null}
                        <span className="flex items-start justify-between gap-2">
                          <span className="min-w-0 flex-1 text-sm font-medium leading-snug text-neutral-800 group-hover:text-primary-600 dark:text-neutral-200 dark:group-hover:text-primary-400">
                            {cell.placeName}
                          </span>
                          <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">
                            {cell.distanceLabel}
                          </span>
                        </span>
                      </Link>
                    ) : (
                      <div className="flex flex-col gap-0.5">
                        {cell.rowLabel.trim().toLocaleLowerCase('tr-TR') !==
                        cell.placeName.trim().toLocaleLowerCase('tr-TR') ? (
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
                            {cell.rowLabel}
                          </span>
                        ) : null}
                        <div className="flex items-start justify-between gap-2">
                          <span className="min-w-0 flex-1 text-sm font-medium leading-snug text-neutral-800 dark:text-neutral-200">
                            {cell.placeName}
                          </span>
                          <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">
                            {cell.distanceLabel}
                          </span>
                        </div>
                      </div>
                    )
                  ) : (
                    <span className="text-sm text-neutral-400 dark:text-neutral-500">{copy.nearbyVitrinEmpty}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {hasListingCoords ? (
        <p className="text-[11px] leading-relaxed text-neutral-400 dark:text-neutral-500">
          {copy.nearbyPlacesFootnoteCrowFlight}
        </p>
      ) : null}
    </div>
  )
}
