import 'server-only'

import { cache } from 'react'
import { getLocationPageByName, getLocationPageBySlug, type LocationPage } from '@/lib/travel-api'
import { regionPlacesSlugFromCity } from '@/lib/region-places-slug'

const cachedBySlug = cache(async (slugPath: string): Promise<LocationPage | null> => {
  return getLocationPageBySlug(slugPath)
})

const cachedByName = cache(async (name: string): Promise<LocationPage | null> => {
  return getLocationPageByName(name)
})

function slugCandidatesFromRegionSlug(regionSlug: string): string[] {
  const slugPath = regionSlug.replace(/-/g, '/')
  const seen = new Set<string>()
  const out: string[] = []
  const add = (s: string) => {
    const t = s.trim()
    if (!t || seen.has(t)) return
    seen.add(t)
    out.push(t)
  }
  add(`tr/${slugPath}`)
  add(slugPath)
  add(regionSlug)
  return out
}

/** Adres sonunda yabancı ülke varsa CMS bölge sayfası aramayı atla (gereksiz API turu). */
function isLikelyNonTurkishLocationPin(pin: string): boolean {
  const parts = pin
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  if (!parts.length) return false
  if (/(türkiye|turkey)/i.test(pin)) return false
  const last = parts[parts.length - 1].toLowerCase()
  const foreign = new Set([
    'germany',
    'deutschland',
    'united arab emirates',
    'uae',
    'dubai',
    'spain',
    'france',
    'italy',
    'greece',
    'cyprus',
    'united kingdom',
    'uk',
    'usa',
    'united states',
    'egypt',
    'montenegro',
    'maldives',
    'thailand',
    'vietnam',
    'croatia',
    'bulgaria',
    'russia',
    'georgia',
    'malta',
    'austria',
    'switzerland',
    'netherlands',
    'belgium',
  ])
  return foreign.has(last)
}

/**
 * İlan detayında aynı render içinde tekrarlanan `by-slug` / `by-name` isteklerini
 * React `cache()` ile birleştirir; slug adaylarını tek sırayla dener.
 */
export async function resolveLocationPageCached(options: {
  regionSlug?: string
  regionLabel?: string
  city?: string
}): Promise<LocationPage | null> {
  const regionSlug = options.regionSlug?.trim()
  const regionLabel = options.regionLabel?.trim()
  const city = options.city?.trim()

  const pin = city || regionLabel || ''
  if (pin && isLikelyNonTurkishLocationPin(pin)) return null

  if (regionSlug) {
    for (const candidate of slugCandidatesFromRegionSlug(regionSlug)) {
      const page = await cachedBySlug(candidate)
      if (page) return page
    }
  }

  const name = regionLabel || city
  if (name) {
    const page = await cachedByName(name)
    if (page) return page
  }

  if (!regionSlug && city) {
    const slug = regionPlacesSlugFromCity(city)
    if (slug) {
      for (const candidate of slugCandidatesFromRegionSlug(slug)) {
        const page = await cachedBySlug(candidate)
        if (page) return page
      }
    }
  }

  return null
}
