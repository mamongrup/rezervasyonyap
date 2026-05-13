import type { RegionPlaceData } from '@/app/api/region-places/route'
import { defaultLocale, isAppLocale } from '@/lib/i18n-config'
import { getMessages } from '@/utils/getT'

/** Panel / API JSON şeması */
export type NearbyVitrinRow = {
  /** Satır başlığı (sol sütunda görünür) */
  label: string
  /** `public/region-places/*.json` içindeki `types[].id` — öncelikli eşleme */
  typeIds?: string[]
  /** Google Places tür ipuçları (`types[].googleType` veya mekan `types[]`) */
  googleTypes?: string[]
}

export type NearbyVitrinColumn = {
  title: string
  rows: NearbyVitrinRow[]
}

export type NearbyVitrinColumnsConfig = {
  columns: NearbyVitrinColumn[]
}

export type ResolvedNearbyVitrinCell = {
  rowLabel: string
  placeName: string | null
  distanceLabel: string | null
  mapsHref: string | null
}

export type ResolvedNearbyVitrinColumn = {
  title: string
  cells: ResolvedNearbyVitrinCell[]
}

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/_/g, ' ')
    .trim()
}

function hintMatches(hints: string[], googleType: string, placeTypes: string[]): boolean {
  const gt = norm(googleType)
  const pts = placeTypes.map(norm)
  for (const h of hints) {
    const hn = norm(h).replace(/\s+/g, '')
    if (hn === '') continue
    if (gt === hn || gt.endsWith(hn) || hn.endsWith(gt)) return true
    for (const pt of pts) {
      if (pt.includes(hn) || hn.includes(pt)) return true
    }
  }
  return false
}

function flattenTypes(data: RegionPlaceData) {
  return data.categories.flatMap((cat) =>
    cat.types.map((t) => ({ type: t, categoryName: cat.name })),
  )
}

type VitrinPlaceCandidate = {
  name: string
  distanceKm: number
  placeId: string
  lat: number
  lng: number
}

function pushPlace(out: VitrinPlaceCandidate[], p: RegionPlaceData['categories'][0]['types'][0]['places'][0]) {
  const lat = typeof p.lat === 'number' ? p.lat : Number.NaN
  const lng = typeof p.lng === 'number' ? p.lng : Number.NaN
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return
  out.push({ name: p.name, distanceKm: p.distanceKm, placeId: p.placeId, lat, lng })
}

/** Bir satır için aday mekanlar + mesafe */
function collectCandidates(data: RegionPlaceData, row: NearbyVitrinRow): VitrinPlaceCandidate[] {
  const flat = flattenTypes(data)
  const out: VitrinPlaceCandidate[] = []

  const typeIds = row.typeIds?.map((x) => String(x).trim()).filter(Boolean) ?? []
  if (typeIds.length > 0) {
    for (const tid of typeIds) {
      const hit = flat.find((x) => x.type.id === tid)
      if (!hit) continue
      for (const p of hit.type.places) {
        pushPlace(out, p)
      }
    }
    return dedupeByPlaceId(out)
  }

  const hints = row.googleTypes?.map((x) => String(x).trim()).filter(Boolean) ?? []
  if (hints.length > 0) {
    const lh = hints.map((h) => h.toLowerCase())
    for (const { type: t } of flat) {
      const match =
        hintMatches(lh, t.googleType ?? '', [
          ...(t.places.flatMap((p) => p.types ?? []) as string[]),
        ]) || lh.some((h) => norm(t.googleType).includes(norm(h)))
      if (!match) continue
      for (const p of t.places) {
        pushPlace(out, p)
      }
    }
    return dedupeByPlaceId(out)
  }

  const lab = norm(row.label)
  if (!lab) return []
  for (const { type: t } of flat) {
    const tn = norm(t.name)
    if (!tn.includes(lab) && !lab.includes(tn)) continue
    for (const p of t.places) {
      pushPlace(out, p)
    }
  }
  return dedupeByPlaceId(out)
}

function dedupeByPlaceId(rows: VitrinPlaceCandidate[]): VitrinPlaceCandidate[] {
  const seen = new Set<string>()
  const out: typeof rows = []
  for (const r of rows) {
    const k = r.placeId || `${r.name}:${r.distanceKm}:${r.lat}:${r.lng}`
    if (seen.has(k)) continue
    seen.add(k)
    out.push(r)
  }
  return out
}

function pickClosest(candidates: VitrinPlaceCandidate[]): VitrinPlaceCandidate | null {
  if (!candidates.length) return null
  return candidates.reduce((a, b) => (a.distanceKm <= b.distanceKm ? a : b))
}

function googleMapsHrefForVitrinPick(picked: VitrinPlaceCandidate | null): string | null {
  if (!picked) return null
  const pid = picked.placeId ?? ''
  if (pid.includes('travel_idea:') || pid.startsWith('svc:'))
    return `https://www.google.com/maps?q=${picked.lat},${picked.lng}`
  return `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(pid)}`
}

function formatKm(km: number): string {
  if (!Number.isFinite(km) || km < 0) return ''
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`
}

/** location_pages JSON alanı → yapı (geçersizse null) */
export function parseNearbyVitrinColumnsJson(raw: unknown): NearbyVitrinColumnsConfig | null {
  if (raw == null) return null
  let obj: unknown = raw
  if (typeof raw === 'string') {
    const s = raw.trim()
    if (!s) return null
    try {
      obj = JSON.parse(s) as unknown
    } catch {
      return null
    }
  }
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return null
  const cols = (obj as { columns?: unknown }).columns
  if (!Array.isArray(cols)) return null
  const columns: NearbyVitrinColumn[] = []
  for (const c of cols) {
    if (!c || typeof c !== 'object' || Array.isArray(c)) continue
    const title = String((c as { title?: unknown }).title ?? '').trim()
    const rowsRaw = (c as { rows?: unknown }).rows
    if (!title || !Array.isArray(rowsRaw)) continue
    const rows: NearbyVitrinRow[] = []
    for (const r of rowsRaw) {
      if (!r || typeof r !== 'object' || Array.isArray(r)) continue
      const label = String((r as { label?: unknown }).label ?? '').trim()
      if (!label) continue
      const typeIds = Array.isArray((r as { typeIds?: unknown }).typeIds)
        ? ((r as { typeIds: unknown[] }).typeIds.map((x) => String(x))).filter(Boolean)
        : undefined
      const googleTypes = Array.isArray((r as { googleTypes?: unknown }).googleTypes)
        ? ((r as { googleTypes: unknown[] }).googleTypes.map((x) => String(x))).filter(Boolean)
        : undefined
      rows.push({ label, typeIds, googleTypes })
    }
    if (rows.length) columns.push({ title, rows })
  }
  return columns.length ? { columns } : null
}

/** Vitrin JSON sütun başlığı → `service_pois_json` için kategori */
export function inferServicePoiCategoryForColumn(
  columnTitle: string,
  columnIndex: number,
  totalColumns: number,
  locale: string,
): 'sightseeing' | 'amenity' | 'transport' {
  const order: ('sightseeing' | 'amenity' | 'transport')[] = ['sightseeing', 'amenity', 'transport']
  const tryLocales = [locale, defaultLocale, 'tr', 'en', 'de', 'ru', 'zh', 'fr'].filter(
    (v, i, arr) => arr.indexOf(v) === i,
  )
  for (const loc of tryLocales) {
    if (!isAppLocale(loc)) continue
    const r = getMessages(loc).site.region
    const t = columnTitle.trim()
    if (t === String(r.nearbyVitrinColSightseeing).trim()) return 'sightseeing'
    if (t === String(r.nearbyVitrinColEssentials).trim()) return 'amenity'
    if (t === String(r.nearbyVitrinColTransport).trim()) return 'transport'
  }
  if (totalColumns === 3 && columnIndex >= 0 && columnIndex < 3) {
    return order[columnIndex] ?? 'amenity'
  }
  return 'amenity'
}

export function buildDefaultNearbyVitrinColumns(locale: string): NearbyVitrinColumnsConfig {
  const r = getMessages(locale).site.region
  return {
    columns: [
      {
        title: r.nearbyVitrinColSightseeing,
        rows: [
          { label: r.nearbyVitrinRowBeaches, googleTypes: ['beach'] },
          {
            label: r.nearbyVitrinRowHistoric,
            googleTypes: ['tourist_attraction', 'historical_landmark', 'church', 'mosque'],
          },
          {
            label: r.nearbyVitrinRowRuins,
            googleTypes: ['archaeological_site', 'tourist_attraction', 'historical_landmark', 'monument'],
          },
          { label: r.nearbyVitrinRowMuseums, googleTypes: ['museum', 'art_gallery'] },
        ],
      },
      {
        title: r.nearbyVitrinColEssentials,
        rows: [
          {
            label: r.nearbyVitrinRowMarket,
            googleTypes: ['supermarket', 'grocery_store', 'convenience_store'],
          },
          { label: r.nearbyVitrinRowRestaurants, googleTypes: ['restaurant', 'meal_takeaway', 'cafe'] },
          {
            label: r.nearbyVitrinRowPharmacy,
            googleTypes: ['pharmacy', 'drugstore'],
          },
        ],
      },
      {
        title: r.nearbyVitrinColTransport,
        rows: [
          { label: r.nearbyVitrinRowAirport, googleTypes: ['airport'] },
          { label: r.nearbyVitrinRowBusStation, googleTypes: ['bus_station'] },
          { label: r.nearbyVitrinRowMinibus, googleTypes: ['bus_stop'] },
          {
            label: r.nearbyVitrinRowMetro,
            googleTypes: ['subway_station', 'light_rail_station', 'transit_station'],
          },
        ],
      },
    ],
  }
}

/** Boş / silinmiş yapılandırma → site varsayılanı */
export function resolveNearbyVitrinConfig(locale: string, pageField: unknown): NearbyVitrinColumnsConfig {
  const parsed = parseNearbyVitrinColumnsJson(pageField ?? null)
  if (!parsed?.columns?.length) return buildDefaultNearbyVitrinColumns(locale)
  return parsed
}

/** Panel «varsayılan şablon» düğmesi — geçerli dil başlıklarıyla JSON üretir */
export function formatNearbyVitrinTemplateJson(locale: string): string {
  return JSON.stringify(buildDefaultNearbyVitrinColumns(locale), null, 2)
}

export function resolveNearbyVitrinForDisplay(
  data: RegionPlaceData,
  config: NearbyVitrinColumnsConfig,
): ResolvedNearbyVitrinColumn[] {
  return config.columns.map((col) => ({
    title: col.title,
    cells: col.rows.map((row) => {
      const picked = pickClosest(collectCandidates(data, row))
      const mapsHref = googleMapsHrefForVitrinPick(picked)
      return {
        rowLabel: row.label,
        placeName: picked?.name ?? null,
        distanceLabel: picked != null ? formatKm(picked.distanceKm) : null,
        mapsHref,
      }
    }),
  }))
}
