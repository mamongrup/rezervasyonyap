import { unwrapVerticalMetaPayload } from '@/lib/listing-pools'
import { sanitizeRichCmsHtml } from '@/lib/sanitize-cms-html'
import { stripHtml } from '@/lib/social-share/strip-html'
import { formatCruisePlaceName } from '@/lib/cruise-route-display'
import { kulturRegionLabel } from '@/lib/tour-kultur-regions'
import { cruisePeriodSelectOptions, type CruiseVerticalMeta } from '@/lib/cruise-meta'
import type { TourPeriodOption } from '@/lib/tour-periods'
import type { TourInfoSection, TourItineraryDay, TourOverviewItem } from '@/app/[locale]/(app)/(listings)/TourDetailSections'

export type GezinomiTourVerticalMeta = {
  tour_region?: string | null
  duration_days?: string | null
  travel_type?: string | null
  accommodation_type?: string | null
  departure_city?: string | null
  night_count?: number | null
  concept_name?: string | null
  tour_departure?: string | null
  product_id?: number | null
  gezinomi_link?: string | null
  gezinomi_page_url?: string | null
  detail_text?: string | null
  info_sections?: Array<{ id: string; title: string; html: string }>
  program_days?: Array<{ day: number; title: string; description: string }>
  periods?: Array<{
    id?: number | string | null
    start?: string
    end?: string
    label?: string
    isAvailable?: boolean
  }>
  tour_departures?: Array<{ id?: number | string | null; city?: string; name?: string }>
  period_times?: Array<{ id?: number | string | null; label?: string }>
  price_basis?: string | null
}

/** `vertical_tour` kök alanları — `unwrapVerticalMetaPayload` yalnızca `data` içini döndürür. */
export function parseGezinomiTourVerticalMeta(raw: unknown): GezinomiTourVerticalMeta | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const root = raw as Record<string, unknown>
  const inner = unwrapVerticalMetaPayload(raw)
  const merged: GezinomiTourVerticalMeta = {
    ...(inner as GezinomiTourVerticalMeta),
    tour_region: pickStr(root.tour_region) || pickStr(inner.tour_region),
    duration_days: pickStr(root.duration_days) || pickStr(inner.duration_days),
    travel_type: pickStr(root.travel_type) || pickStr(inner.travel_type),
    accommodation_type: pickStr(root.accommodation_type) || pickStr(inner.accommodation_type),
    departure_city: pickStr(root.departure_city) || pickStr(inner.departure_city),
    night_count: pickNum(root.night_count) ?? pickNum(inner.night_count),
    concept_name: pickStr(root.concept_name) || pickStr(inner.concept_name),
    tour_departure: pickStr(root.tour_departure) || pickStr(inner.tour_departure),
    product_id: pickNum(root.product_id) ?? pickNum(inner.product_id),
    gezinomi_link: pickStr(root.gezinomi_link) || pickStr(inner.gezinomi_link),
    gezinomi_page_url: pickStr(root.gezinomi_page_url) || pickStr(inner.gezinomi_page_url),
    detail_text: pickStr(root.detail_text) || pickStr(inner.detail_text),
    info_sections: pickInfoSections(root.info_sections) ?? pickInfoSections(inner.info_sections) ?? undefined,
    program_days: pickProgramDays(root.program_days) ?? pickProgramDays(inner.program_days) ?? undefined,
    periods: pickPeriods(root.periods) ?? pickPeriods(inner.periods) ?? undefined,
    tour_departures: pickDepartures(root.tour_departures) ?? pickDepartures(inner.tour_departures) ?? undefined,
    period_times: pickPeriodTimes(root.period_times) ?? pickPeriodTimes(inner.period_times) ?? undefined,
    price_basis: pickStr(root.price_basis) || pickStr(inner.price_basis),
  }
  return merged
}

export function hasGezinomiTourStructuredContent(meta: GezinomiTourVerticalMeta | null): boolean {
  if (!meta) return false
  return Boolean(
    meta.gezinomi_link?.trim() ||
      meta.product_id ||
      (meta.program_days?.length ?? 0) > 0 ||
      (meta.info_sections?.length ?? 0) > 0,
  )
}

export function gezinomiTourOverviewItems(
  meta: GezinomiTourVerticalMeta | null,
  labels: {
    departure: string
    concept: string
    region: string
  },
  locale = 'tr',
): TourOverviewItem[] {
  if (!meta) return []
  const items: TourOverviewItem[] = []
  if (meta.tour_departure?.trim()) {
    items.push({
      label: labels.departure,
      value: formatCruisePlaceName(meta.tour_departure),
      icon: 'location',
    })
  } else if (meta.departure_city?.trim()) {
    items.push({
      label: labels.departure,
      value: formatCruisePlaceName(meta.departure_city),
      icon: 'location',
    })
  }
  if (meta.concept_name?.trim()) {
    items.push({ label: labels.concept, value: meta.concept_name.trim(), icon: 'location' })
  }
  if (meta.tour_region?.trim()) {
    items.push({
      label: labels.region,
      value: kulturRegionLabel(meta.tour_region.trim(), locale),
      icon: 'location',
    })
  }
  return items
}

export function gezinomiTourInfoSections(meta: GezinomiTourVerticalMeta | null): TourInfoSection[] {
  const rows = meta?.info_sections ?? []
  return rows
    .filter((s) => s?.html?.trim())
    .map((s) => ({
      id: s.id || `gezinomi-info-${s.title}`,
      title: s.title,
      html: sanitizeRichCmsHtml(s.html),
    }))
}

export function gezinomiTourItineraryDays(meta: GezinomiTourVerticalMeta | null): TourItineraryDay[] {
  const rows = meta?.program_days ?? []
  return rows
    .filter((d) => d?.description?.trim())
    .map((d) => {
      const descriptionHtml = sanitizeGezinomiDayHtml(d.description)
      return {
        day: Number(d.day) || 0,
        title: d.title?.trim() ? formatCruisePlaceName(d.title) : '',
        description: plainDayDescription(d.description),
        descriptionHtml,
      }
    })
    .filter((d) => d.day > 0)
}

export function gezinomiTourPeriodSelectOptions(
  meta: GezinomiTourVerticalMeta | null,
  opts: { fallbackPrice?: number | null; currencyCode?: string; locale?: string },
): TourPeriodOption[] {
  const locale = opts.locale ?? 'tr'
  const base = cruisePeriodSelectOptions(meta as CruiseVerticalMeta, opts)
  return base.map((p) => ({
    ...p,
    monthLabel: monthLabelFromIso(p.startDate, locale),
  }))
}

export type GezinomiTourDeparturePoint = {
  id: string
  city: string
  address: string
}

export function gezinomiTourDeparturePoints(meta: GezinomiTourVerticalMeta | null): GezinomiTourDeparturePoint[] {
  const rows = meta?.tour_departures ?? []
  return rows
    .map((d, i) => ({
      id: String(d.id ?? `dep-${i}`),
      city: String(d.city ?? '').trim(),
      address: String(d.name ?? '').trim(),
    }))
    .filter((d) => d.city || d.address)
}

export function gezinomiTourPeriodTimeLabels(meta: GezinomiTourVerticalMeta | null): string[] {
  return (meta?.period_times ?? []).map((p) => String(p.label ?? '').trim()).filter(Boolean)
}

export function gezinomiTourHasBookablePeriod(meta: GezinomiTourVerticalMeta | null): boolean {
  return (meta?.periods ?? []).some((p) => p.isAvailable !== false)
}

export type TourSectionNavItem = {
  id: string
  label: string
}

/** Detay sayfası anchor menüsü */
export function gezinomiTourSectionNavItems(
  meta: GezinomiTourVerticalMeta | null,
  labels: {
    about: string
    program: string
    included: string
    departures: string
    info: string
    map: string
  },
  opts: {
    hasProgram: boolean
    hasIncluded: boolean
    hasInfo: boolean
    hasDepartures: boolean
    hasMap: boolean
  },
): TourSectionNavItem[] {
  const items: TourSectionNavItem[] = [{ id: 'tour-section-about', label: labels.about }]
  if (opts.hasProgram) items.push({ id: 'tour-section-program', label: labels.program })
  if (opts.hasIncluded) items.push({ id: 'tour-section-services', label: labels.included })
  if (opts.hasDepartures) items.push({ id: 'tour-section-departures', label: labels.departures })
  if (opts.hasInfo) items.push({ id: 'tour-section-extra-info', label: labels.info })
  if (opts.hasMap) items.push({ id: 'tour-section-map', label: labels.map })
  return items.length > 1 ? items : []
}

/** Kısa tanıtım — program ve bilgi bölümleri hariç. */
export function gezinomiTourIntroHtml(meta: GezinomiTourVerticalMeta | null): string {
  const raw = meta?.detail_text?.trim()
  if (!raw) return ''
  const plain = stripHtml(sanitizeRichCmsHtml(raw)).trim()
  if (!plain) return ''
  return `<p class="text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">${escapeHtml(plain)}</p>`
}

export function gezinomiIncludedExcludedLists(meta: GezinomiTourVerticalMeta | null): {
  included: string[]
  excluded: string[]
} {
  const sections = meta?.info_sections ?? []
  const included = sections.find((s) => s.id === 'cruise-section-included')
  const excluded = sections.find((s) => s.id === 'cruise-section-excluded')
  return {
    included: parseListItemsFromHtml(included?.html ?? ''),
    excluded: parseListItemsFromHtml(excluded?.html ?? ''),
  }
}

/** Harita pinleri için gün programı HTML'i */
export function gezinomiTourProgramHtmlForPins(meta: GezinomiTourVerticalMeta | null): string {
  return gezinomiTourItineraryDays(meta)
    .map((d) => `<h3>${d.day}. Gün ${d.title}</h3><p>${d.description}</p>`)
    .join('\n')
}

function pickStr(value: unknown): string | null {
  if (value == null) return null
  const s = String(value).trim()
  return s || null
}

function pickNum(value: unknown): number | null {
  if (value == null || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function pickInfoSections(value: unknown): GezinomiTourVerticalMeta['info_sections'] | null {
  if (!Array.isArray(value)) return null
  const rows = value
    .filter((x) => x && typeof x === 'object')
    .map((x) => {
      const row = x as Record<string, unknown>
      return {
        id: String(row.id ?? '').trim(),
        title: String(row.title ?? '').trim(),
        html: String(row.html ?? '').trim(),
      }
    })
    .filter((s) => s.html)
  return rows.length ? rows : null
}

function pickProgramDays(value: unknown): GezinomiTourVerticalMeta['program_days'] | null {
  if (!Array.isArray(value)) return null
  const rows = value
    .filter((x) => x && typeof x === 'object')
    .map((x) => {
      const row = x as Record<string, unknown>
      return {
        day: Number(row.day) || 0,
        title: String(row.title ?? '').trim(),
        description: String(row.description ?? '').trim(),
      }
    })
    .filter((d) => d.day > 0 && d.description)
  return rows.length ? rows : null
}

function pickPeriods(value: unknown): GezinomiTourVerticalMeta['periods'] | null {
  if (!Array.isArray(value)) return null
  return value as GezinomiTourVerticalMeta['periods']
}

function pickDepartures(value: unknown): GezinomiTourVerticalMeta['tour_departures'] | null {
  if (!Array.isArray(value)) return null
  const rows = value
    .filter((x) => x && typeof x === 'object')
    .map((x) => {
      const row = x as Record<string, unknown>
      return {
        id: row.id ?? row.tourDepartureId ?? null,
        city: String(row.city ?? row.cityName ?? '').trim(),
        name: String(row.name ?? row.address ?? '').trim(),
      }
    })
    .filter((d) => d.city || d.name)
  return rows.length ? rows : null
}

function pickPeriodTimes(value: unknown): GezinomiTourVerticalMeta['period_times'] | null {
  if (!Array.isArray(value)) return null
  const rows = value
    .filter((x) => x && typeof x === 'object')
    .map((x) => {
      const row = x as Record<string, unknown>
      return {
        id: row.id ?? row.tourPeriodTimeId ?? null,
        label: String(row.label ?? row.tourPeriodTimeName ?? '').trim(),
      }
    })
    .filter((p) => p.label)
  return rows.length ? rows : null
}

function monthLabelFromIso(iso: string, locale: string): string {
  if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return ''
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return ''
  try {
    return new Intl.DateTimeFormat(locale.startsWith('en') ? 'en-GB' : 'tr-TR', {
      month: 'long',
      year: 'numeric',
    }).format(new Date(y, m - 1, d))
  } catch {
    return ''
  }
}

function normalizeGezinomiHtml(raw: string): string {
  return String(raw ?? '')
    .replace(/\r/g, '')
    .replace(/<p\s+Align=/gi, '<p align=')
    .replace(/&nbsp;/gi, ' ')
}

function sanitizeGezinomiDayHtml(raw: string): string {
  const normalized = normalizeGezinomiHtml(raw)
  return sanitizeRichCmsHtml(normalized)
}

function plainDayDescription(raw: string): string {
  return stripHtml(sanitizeGezinomiDayHtml(raw)).replace(/\s+/g, ' ').trim()
}

function parseListItemsFromHtml(html: string): string[] {
  if (!html.trim()) return []
  const sanitized = sanitizeRichCmsHtml(html)
  const liMatches = [...sanitized.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)]
  if (liMatches.length > 0) {
    return uniqueLines(liMatches.map((m) => stripHtml(m[1] ?? '')))
  }
  const plain = stripHtml(sanitized)
  const starItems = plain
    .split(/\s*\*\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
  if (starItems.length > 1) return uniqueLines(starItems)
  return uniqueLines(
    plain
      .split(/\n+/)
      .map((s) => s.replace(/^[-•]\s*/, '').trim())
      .filter(Boolean),
  )
}

function uniqueLines(lines: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const line of lines) {
    const clean = line.trim()
    if (!clean) continue
    const key = clean.toLocaleLowerCase('tr')
    if (seen.has(key)) continue
    seen.add(key)
    out.push(clean)
  }
  return out
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
