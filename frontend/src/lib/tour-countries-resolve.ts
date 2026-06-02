import { parseCountryTourInfo, countryTourInfoHasContent, type CountryTourInfo } from '@/lib/country-tour-info'
import { getLocationPageBySlug, getPublicListingAttributes, type LocationPage } from '@/lib/travel-api'

export type TourCountryCard = {
  iso2: string
  name: string
  page: LocationPage | null
  info: CountryTourInfo
}

type WtatilCountryRef = { name?: string; code?: string }

function parseWtatilCountries(raw: string): WtatilCountryRef[] {
  try {
    const j = JSON.parse(raw) as { countries?: unknown; catalog?: { countries?: unknown } }
    const list = j.countries ?? j.catalog?.countries
    if (!Array.isArray(list)) return []

    const refs: WtatilCountryRef[] = []
    for (const item of list) {
      if (!item || typeof item !== 'object') continue
      const o = item as Record<string, unknown>
      const name = String(o.name ?? o.text ?? '').trim()
      const code = String(o.code ?? o.iso2 ?? o.countryCode ?? '').trim().toUpperCase()
      if (!name && !code) continue
      refs.push({ name, code })
    }
    return refs
  } catch {
    return []
  }
}

function countryNameFromPage(page: LocationPage | null, iso2: string, fallback?: string): string {
  if (fallback?.trim()) return fallback.trim()
  if (page?.title?.trim()) return page.title.trim()
  try {
    const tr = JSON.parse(page?.translations_json ?? '{}') as { tr?: { name?: string } }
    if (tr.tr?.name?.trim()) return tr.tr.name.trim()
  } catch {
    /* ignore */
  }
  return iso2
}

/** Tur ilanındaki Wtatil ülkelerini `location_pages` ile eşleştirir. */
export async function resolveTourCountryCards(listingId: string): Promise<TourCountryCard[]> {
  let refs: WtatilCountryRef[] = []
  try {
    const attrs = await getPublicListingAttributes(listingId)
    const snap = attrs.values.find((a) => a.group_code === 'wtatil' && a.key === 'snapshot')
    if (snap?.value_json) refs = parseWtatilCountries(snap.value_json)
  } catch {
    return []
  }

  const seen = new Set<string>()
  const cards: TourCountryCard[] = []

  for (const ref of refs) {
    const iso2 = ref.code?.trim().toUpperCase()
    if (!iso2 || iso2.length !== 2 || seen.has(iso2)) continue
    seen.add(iso2)

    const page = await getLocationPageBySlug(iso2).catch(() => null)
    const info = parseCountryTourInfo(page?.country_info_json ?? '{}')
    cards.push({
      iso2,
      name: countryNameFromPage(page, iso2, ref.name),
      page,
      info,
    })
  }

  return cards.filter((c) => countryTourInfoHasContent(c.info) || c.name.trim())
}
