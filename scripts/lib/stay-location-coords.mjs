import { lookupYachtLocation, stripMarinaMarketingSuffix } from './yacht-location-resolve.mjs'

/** Marina / belde / ilçe — vitrin haritası için yeterli hassasiyet */
export const PLACE_COORDS = [
  { keys: ['göcek', 'gocek'], lat: 36.7532, lng: 28.9421 },
  { keys: ['ölüdeniz', 'oludeniz'], lat: 36.5493, lng: 29.1150 },
  { keys: ['ovacık', 'ovacik'], lat: 36.5745, lng: 29.1148 },
  { keys: ['fethiye'], lat: 36.6219, lng: 29.1164 },
  { keys: ['marmaris'], lat: 36.8550, lng: 28.2742 },
  { keys: ['bodrum'], lat: 37.0344, lng: 27.4305 },
  { keys: ['yalıkavak', 'yalikavak'], lat: 37.1031, lng: 27.2917 },
  { keys: ['turgutreis'], lat: 37.0036, lng: 27.2587 },
  { keys: ['gümbet', 'gumbet'], lat: 37.0315, lng: 27.3958 },
  { keys: ['datça', 'datca'], lat: 36.7269, lng: 27.6853 },
  { keys: ['dalyan'], lat: 36.8352, lng: 28.6435 },
  { keys: ['kaş', 'kas'], lat: 36.2019, lng: 29.6377 },
  { keys: ['kalkan'], lat: 36.2650, lng: 29.4134 },
  { keys: ['kemer'], lat: 36.5978, lng: 30.5605 },
  { keys: ['antalya'], lat: 36.8969, lng: 30.7133 },
  { keys: ['alanya'], lat: 36.5444, lng: 31.9954 },
  { keys: ['kuşadası', 'kusadasi', 'aydın', 'aydin'], lat: 37.8579, lng: 27.2610 },
  { keys: ['çeşme', 'cesme'], lat: 38.3225, lng: 26.3065 },
  { keys: ['istanbul'], lat: 41.0082, lng: 28.9784 },
  { keys: ['muğla', 'mugla'], lat: 37.2153, lng: 28.3636 },
  { keys: ['kapadokya', 'nevşehir', 'urgup', 'ürgüp'], lat: 38.6431, lng: 34.8289 },
  { keys: ['sapanca'], lat: 40.6914, lng: 30.2674 },
  { keys: ['kıbrıs', 'kibris', 'cyprus', 'girne', 'kyrenia'], lat: 35.3369, lng: 33.3173 },
  { keys: ['yunanistan', 'greece', 'athens', 'atina'], lat: 37.9838, lng: 23.7275 },
  { keys: ['hırvatistan', 'hirvatistan', 'croatia', 'split', 'dubrovnik'], lat: 43.5081, lng: 16.4402 },
  { keys: ['malta', 'valletta'], lat: 35.8989, lng: 14.5146 },
  { keys: ['türkiye', 'turkiye', 'turkey'], lat: 36.8969, lng: 30.7133 },
  { keys: ['karadağ', 'karadag', 'montenegro', 'budva'], lat: 42.2864, lng: 18.8400 },
  { keys: ['italya', 'italy', 'amalfi', 'napoli'], lat: 40.8518, lng: 14.2681 },
]

export function normLocationText(s) {
  return String(s ?? '')
    .toLocaleLowerCase('tr')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
}

export function parseCoord(v) {
  if (v == null || String(v).trim() === '') return null
  const n = parseFloat(String(v).replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

export function coordsFromText(...parts) {
  const text = normLocationText(parts.filter(Boolean).join(' '))
  if (!text.trim()) return null
  for (const row of PLACE_COORDS) {
    for (const key of row.keys) {
      if (text.includes(normLocationText(key))) {
        return { lat: row.lat, lng: row.lng, source: `text:${key}` }
      }
    }
  }
  return null
}

function coordsFromMeta(meta) {
  if (!meta || typeof meta !== 'object') return null
  const lat = parseCoord(meta.lat)
  const lng = parseCoord(meta.lng)
  if (lat != null && lng != null) return { lat, lng, source: 'meta_latlng' }
  return null
}

function coordsFromMarinaLookup(marina) {
  const hit = lookupYachtLocation(marina)
  if (!hit) return null
  const text = [hit.place, hit.district, hit.province].filter(Boolean).join(' ')
  return coordsFromText(text) ?? (hit.district ? coordsFromText(hit.district) : null)
}

export function coordsFromDistrictMap(districtMap, district, province) {
  const d = normLocationText(district)
  if (!d || !districtMap) return null
  const hit = districtMap.get(d)
  if (!hit) return null
  return { lat: hit.lat, lng: hit.lng, source: `district:${district}` }
}

/** İlçe tablosu olmadan — import ve hızlı eşleme */
export function resolveStayMapCoordsSync({
  location_name,
  meta_json,
  slug,
  port_lat,
  port_lng,
} = {}) {
  const meta = meta_json ?? {}

  const portLat = parseCoord(port_lat)
  const portLng = parseCoord(port_lng)
  if (portLat != null && portLng != null) {
    return { lat: portLat, lng: portLng, source: 'port_coords' }
  }

  const fromMeta = coordsFromMeta(meta)
  if (fromMeta) return fromMeta

  const marina = stripMarinaMarketingSuffix(meta.base_port || location_name || '')
  const fromMarina = coordsFromMarinaLookup(marina)
  if (fromMarina) return { ...fromMarina, source: fromMarina.source ?? 'marina_lookup' }

  const fromText = coordsFromText(
    location_name,
    meta.district_label,
    meta.city,
    meta.province_city,
    meta.base_port,
    meta.address,
    slug,
  )
  if (fromText) return fromText

  return null
}

export async function loadDistrictCoords(client) {
  const { rows } = await client.query(`
    SELECT lower(trim(d.name)) AS dkey,
           lower(trim(r.name)) AS rkey,
           d.center_lat::float8 AS lat,
           d.center_lng::float8 AS lng
    FROM districts d
    JOIN regions r ON r.id = d.region_id
    WHERE d.center_lat IS NOT NULL AND d.center_lng IS NOT NULL
  `)
  const byDistrict = new Map()
  for (const row of rows) {
    byDistrict.set(row.dkey, { lat: row.lat, lng: row.lng, region: row.rkey })
  }
  return byDistrict
}

export function resolveStayMapCoords(row, districtMap) {
  const meta = row.meta_json ?? {}
  const sync = resolveStayMapCoordsSync({
    location_name: row.location_name,
    meta_json: meta,
    slug: row.slug,
    port_lat: row.port_lat,
    port_lng: row.port_lng,
  })
  if (sync) return sync

  return coordsFromDistrictMap(districtMap, meta.district_label || meta.city, meta.province_city)
}

/** Yat import — koordinat yoksa marina/konum metninden doldur */
export async function applyListingMapCoordsIfEmpty(pgClient, listingId, fields) {
  const hit = resolveStayMapCoordsSync(fields)
  if (!hit) return false
  await pgClient.query(
    `UPDATE listings
     SET map_lat = $2, map_lng = $3, updated_at = now()
     WHERE id = $1::uuid
       AND (map_lat IS NULL OR map_lng IS NULL)`,
    [listingId, hit.lat, hit.lng],
  )
  return true
}
