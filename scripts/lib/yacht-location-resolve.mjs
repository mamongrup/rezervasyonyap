import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const MAP_PATH = path.join(__dirname, '..', '..', 'frontend', 'src', 'data', 'yacht-marina-locations.json')
const LOCATION_MAP = JSON.parse(readFileSync(MAP_PATH, 'utf8'))

export function stripMarinaMarketingSuffix(text) {
  let s = String(text ?? '').trim()
  if (!s) return ''
  s = s.replace(/\s+yat\s+kiralama\b/gi, '')
  s = s.replace(/\s+tatil\s+evi\b/gi, '')
  s = s.replace(/\s+yacht\s+charter\b/gi, '')
  return s.replace(/\s{2,}/g, ' ').trim()
}

function locKey(text) {
  return stripMarinaMarketingSuffix(text)
    .toLocaleLowerCase('tr')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim()
}

function titleCaseTr(text) {
  return String(text)
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toLocaleUpperCase('tr') + w.slice(1).toLocaleLowerCase('tr'))
    .join(' ')
}

export function formatYachtLocationPin({ place, district, province } = {}) {
  const parts = []
  const add = (v) => {
    const s = stripMarinaMarketingSuffix(String(v ?? '').trim())
    if (!s) return
    const t = titleCaseTr(s)
    if (!parts.some((x) => x.toLocaleLowerCase('tr') === t.toLocaleLowerCase('tr'))) parts.push(t)
  }
  add(place)
  add(district)
  add(province)
  return parts.join(', ')
}

export function lookupYachtLocation(raw) {
  const cleaned = stripMarinaMarketingSuffix(raw)
  if (!cleaned) return null
  const first = cleaned.split(',')[0].trim()
  const key = locKey(first)
  const hit = LOCATION_MAP[key] || LOCATION_MAP[locKey(cleaned)]
  if (hit) return { ...hit }
  return { district: titleCaseTr(first) }
}

export function resolveYachtLocationFromMarina(marina) {
  const hit = lookupYachtLocation(marina)
  if (!hit) return null
  const pin = formatYachtLocationPin(hit)
  return {
    city: hit.place ? titleCaseTr(hit.place) : '',
    district_label: hit.district ? titleCaseTr(hit.district) : '',
    province_city: hit.province ? titleCaseTr(hit.province) : '',
    location_pin: pin,
  }
}

/** Meta + listings.location_name için marina → ilçe/il hiyerarşisi. */
export function applyYachtLocationToMeta(meta, marina) {
  const raw = String(marina ?? '').trim()
  meta.base_port = stripMarinaMarketingSuffix(raw) || raw
  const loc = resolveYachtLocationFromMarina(raw)
  if (!loc) return meta.base_port
  if (loc.city) meta.city = loc.city
  if (loc.district_label) meta.district_label = loc.district_label
  if (loc.province_city) meta.province_city = loc.province_city
  return loc.location_pin || meta.base_port
}
