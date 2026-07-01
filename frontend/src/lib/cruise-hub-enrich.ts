import type { CategoryHubGridCard } from '@/components/page-builder/modules/CategoryHubGridModule'
import { cruiseBrandFacetPath } from '@/data/cruise-hub-categories'
import { categoryFacetSlugForCode } from '@/lib/category-facet-routes'
import {
  cruiseNightCountLabel,
  cruiseRouteStartLabel,
  formatCruiseBrandLabel,
  hubOfferMetaLabel,
} from '@/lib/cruise-route-display'

export type CruiseHubStatsRow = {
  cruise_line: string
  route_summary: string
  category_link: string
  count: number
  night_count?: number
}

/** API cruise_line / category_link filtresiyle aynı eşleşme */
export function cruiseLineMatchesHubCode(
  hubCode: string,
  cruiseLine: string,
  categoryLink: string,
): boolean {
  const code = hubCode.trim().toLowerCase()
  if (!code) return false
  const line = cruiseLine.toLowerCase()
  const link = categoryLink.toLowerCase()
  return line.includes(code) || link.includes(code)
}

/** API cruise_route filtresiyle aynı eşleşme (kısaltılmış) */
export function cruiseRouteMatchesHubCode(
  hubCode: string,
  routeSummary: string,
  categoryLink: string,
  locationName = '',
): boolean {
  const code = hubCode.trim().toLowerCase()
  if (!code) return false
  const hay = `${routeSummary} ${categoryLink} ${locationName}`.toLowerCase()
  if (hay.includes(code.replace(/-/g, ' ')) || hay.includes(code)) return true
  const first = code.split('-')[0] ?? code
  return first.length >= 4 && hay.includes(first)
}

function facetPath(locale: string, queryKey: 'cruise_line' | 'cruise_route', code: string): string {
  const slug = categoryFacetSlugForCode('kruvaziyer', locale, queryKey, code)
  return slug ? `/kruvaziyer/${slug}` : `/kruvaziyer/all?${queryKey}=${encodeURIComponent(code)}`
}

function routeSummaryToFacetPath(routeSummary: string, locale: string): string | null {
  const s = routeSummary.toLowerCase()
  const pairs: Array<{ code: string; keywords: string[] }> = [
    { code: 'akdeniz-gemi-turlari', keywords: ['akdeniz', 'mediterranean', 'batı akdeniz', 'bati akdeniz'] },
    { code: 'yunan-adalari-gemi-turlari', keywords: ['yunan', 'greek', 'adalar'] },
    { code: 'ege-akdeniz-gemi-turlari', keywords: ['ege'] },
    { code: 'amerika-gemi-turlari', keywords: ['amerika', 'alaska', 'america'] },
    { code: 'turkiye-cikisli-gemi-turlari', keywords: ['türkiye çıkış', 'turkiye cikis', 'istanbul hareket', 'galataport'] },
    { code: 'vizesiz-gemi-turlari', keywords: ['vizesiz', 'visa-free'] },
    { code: 'baltik-baskentleri-gemi-turlari', keywords: ['baltık', 'baltik', 'baltic'] },
    { code: 'uzakdogu-gemi-turlari', keywords: ['uzakdoğu', 'uzakdogu', 'japonya', 'japan', 'asya'] },
    { code: 'kanarya-adalari-gemi-turlari', keywords: ['kanarya', 'canary'] },
    { code: 'guney-amerika-gemi-turlari', keywords: ['güney amerika', 'guney amerika', 'south america'] },
    { code: 'misir-gemi-turlari', keywords: ['mısır', 'misir', 'egypt', 'suveyş', 'suveys'] },
    { code: 'karayipler', keywords: ['karayip', 'caribbean'] },
  ]
  for (const p of pairs) {
    if (p.keywords.some((k) => s.includes(k))) return facetPath(locale, 'cruise_route', p.code)
  }
  return null
}

function tourCountLabel(count: number, locale: string): string {
  const en = locale === 'en' || locale.startsWith('en-')
  if (en) return count === 1 ? '1 cruise' : `${count} cruises`
  return `${count} tur`
}

function offerSublabel(nightCount: number, tourCount: number, locale: string): string | undefined {
  const parts: string[] = []
  if (nightCount > 0) parts.push(cruiseNightCountLabel(nightCount, locale))
  if (tourCount > 0) parts.push(tourCountLabel(tourCount, locale))
  return parts.length > 0 ? hubOfferMetaLabel(parts) : undefined
}

type RouteAgg = {
  routeSummary: string
  count: number
  nightCount: number
  path: string
}

type RouteHubOfferAgg = {
  brandLabel: string
  startLabel: string
  nightCount: number
  tourCount: number
  path: string
}

function aggregateBrandRoutes(
  hubCode: string,
  rows: CruiseHubStatsRow[],
  locale: string,
  brandPath: string,
): RouteAgg[] {
  const map = new Map<string, RouteAgg>()
  for (const row of rows) {
    if (!cruiseLineMatchesHubCode(hubCode, row.cruise_line, row.category_link)) continue
    const routeSummary = row.route_summary.trim()
    if (!routeSummary) continue
    const key = routeSummary.toLowerCase()
    const path = routeSummaryToFacetPath(routeSummary, locale) ?? brandPath
    const nights = row.night_count && row.night_count > 0 ? row.night_count : 0
    const prev = map.get(key)
    if (prev) {
      prev.count += row.count
      if (nights > prev.nightCount) prev.nightCount = nights
    } else {
      map.set(key, { routeSummary, count: row.count, nightCount: nights, path })
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count).slice(0, 6)
}

function aggregateRouteHubOffers(
  hubCode: string,
  rows: CruiseHubStatsRow[],
  locale: string,
  routePath: string,
): RouteHubOfferAgg[] {
  const map = new Map<string, RouteHubOfferAgg>()
  for (const row of rows) {
    if (!cruiseRouteMatchesHubCode(hubCode, row.route_summary, row.category_link)) continue
    const brandLabel = formatCruiseBrandLabel(row.cruise_line)
    if (!brandLabel) continue
    const startLabel = cruiseRouteStartLabel(row.route_summary)
    const nights = row.night_count && row.night_count > 0 ? row.night_count : 0
    const key = `${brandLabel.toLowerCase()}|${startLabel.toLowerCase()}|${nights}`
    const path =
      cruiseBrandFacetPath(locale, row.cruise_line, row.category_link) ??
      routeSummaryToFacetPath(row.route_summary, locale) ??
      routePath
    const prev = map.get(key)
    if (prev) {
      prev.tourCount += row.count
      if (nights > prev.nightCount) prev.nightCount = nights
    } else {
      map.set(key, {
        brandLabel,
        startLabel,
        nightCount: nights,
        tourCount: row.count,
        path,
      })
    }
  }
  return [...map.values()].sort((a, b) => b.tourCount - a.tourCount).slice(0, 7)
}

function hubFilterCode(card: CategoryHubGridCard): string {
  return (card.hubCode ?? card.id).trim()
}

export function enrichCruiseBrandHubCards(
  cards: CategoryHubGridCard[],
  rows: CruiseHubStatsRow[],
  locale: string,
): CategoryHubGridCard[] {
  const en = locale === 'en' || locale.startsWith('en-')
  const viewAll = en ? 'View all cruises' : 'Tüm turları gör'
  return cards.map((card) => {
    const code = hubFilterCode(card)
    const total = rows.reduce((sum, row) => {
      if (!cruiseLineMatchesHubCode(code, row.cruise_line, row.category_link)) return sum
      return sum + row.count
    }, 0)
    const routes = aggregateBrandRoutes(code, rows, locale, card.path)
    const links = routes.map((r) => {
      const start = cruiseRouteStartLabel(r.routeSummary)
      return {
        label: start,
        sublabel: offerSublabel(r.nightCount, r.count, locale),
        path: r.path,
      }
    })
    links.push({ label: viewAll, sublabel: undefined, path: card.path })
    return {
      ...card,
      metaLine: total > 0 ? tourCountLabel(total, locale) : undefined,
      links: links.length > 1 ? links : card.links,
    }
  })
}

export function enrichCruiseRouteHubCards(
  cards: CategoryHubGridCard[],
  rows: CruiseHubStatsRow[],
  locale: string,
): CategoryHubGridCard[] {
  const en = locale === 'en' || locale.startsWith('en-')
  const viewAll = en ? 'View all cruises' : 'Tüm turları gör'
  return cards.map((card) => {
    const code = hubFilterCode(card)
    const total = rows.reduce((sum, row) => {
      if (!cruiseRouteMatchesHubCode(code, row.route_summary, row.category_link)) return sum
      return sum + row.count
    }, 0)
    const offers = aggregateRouteHubOffers(code, rows, locale, card.path)
    const links = offers.map((o) => ({
      label: o.startLabel ? `${o.brandLabel} · ${o.startLabel}` : o.brandLabel,
      sublabel: offerSublabel(o.nightCount, o.tourCount, locale),
      path: o.path,
    }))
    links.push({ label: viewAll, sublabel: undefined, path: card.path })
    return {
      ...card,
      metaLine: total > 0 ? tourCountLabel(total, locale) : undefined,
      links: links.length > 1 ? links : [{ label: viewAll, sublabel: undefined, path: card.path }],
    }
  })
}
