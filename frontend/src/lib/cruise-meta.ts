import { unwrapVerticalMetaPayload } from '@/lib/listing-pools'
import { sanitizeRichCmsHtml } from '@/lib/sanitize-cms-html'
import type { TourPeriodOption } from '@/lib/tour-periods'
import type { TourInfoSection, TourItineraryDay, TourOverviewItem } from '@/app/[locale]/(app)/(listings)/TourDetailSections'

function normalizeIsoDate(raw: string | undefined | null): string {
  if (!raw) return ''
  const s = String(raw).trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
  const m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/)
  if (m) return `${m[3]}-${m[2]!.padStart(2, '0')}-${m[1]!.padStart(2, '0')}`
  return s.slice(0, 10)
}

export type CruiseVerticalMeta = {
  cruise_line?: string | null
  ship_name?: string | null
  route_summary?: string | null
  cabin_category?: string | null
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
}

export function parseCruiseVerticalMeta(raw: unknown): CruiseVerticalMeta | null {
  const payload = unwrapVerticalMetaPayload(raw) as CruiseVerticalMeta | null
  if (!payload || typeof payload !== 'object') return null
  return payload
}

export function cruiseOverviewItems(
  meta: CruiseVerticalMeta | null,
  labels: {
    cruiseLine: string
    ship: string
    route: string
    cabin: string
    nights: string
    departure: string
    concept: string
  },
  nightFallback?: number | null,
): TourOverviewItem[] {
  if (!meta) return []
  const nights = meta.night_count ?? nightFallback
  const items: TourOverviewItem[] = []
  if (meta.cruise_line) {
    items.push({ label: labels.cruiseLine, value: meta.cruise_line, icon: 'location' })
  }
  if (meta.ship_name) {
    items.push({ label: labels.ship, value: meta.ship_name, icon: 'transport' })
  }
  if (meta.route_summary) {
    items.push({ label: labels.route, value: meta.route_summary, icon: 'location' })
  }
  if (meta.cabin_category) {
    items.push({ label: labels.cabin, value: meta.cabin_category, icon: 'location' })
  }
  if (nights != null && nights > 0) {
    items.push({ label: labels.nights, value: String(nights), icon: 'duration' })
  }
  if (meta.tour_departure) {
    items.push({ label: labels.departure, value: meta.tour_departure, icon: 'location' })
  }
  if (meta.concept_name) {
    items.push({ label: labels.concept, value: meta.concept_name, icon: 'location' })
  }
  return items
}

export function cruiseInfoSections(meta: CruiseVerticalMeta | null, locale = 'tr'): TourInfoSection[] {
  const rows = meta?.info_sections ?? []
  return rows
    .filter((s) => s?.html?.trim())
    .map((s) => ({
      id: s.id || `cruise-info-${s.title}`,
      title: s.title,
      html: sanitizeRichCmsHtml(s.html),
    }))
}

export function cruiseItineraryDays(meta: CruiseVerticalMeta | null): TourItineraryDay[] {
  const rows = meta?.program_days ?? []
  return rows
    .filter((d) => d?.description?.trim())
    .map((d) => ({
      day: Number(d.day) || 0,
      title: d.title || `Gün ${d.day}`,
      description: d.description,
    }))
    .filter((d) => d.day > 0)
}

export function cruisePeriodLabels(meta: CruiseVerticalMeta | null): string[] {
  const periods = meta?.periods ?? []
  return periods
    .map((p) => p.label || (p.start && p.end ? `${p.start} – ${p.end}` : p.start || ''))
    .filter(Boolean)
}

/** Gezinomi dönemleri → tur rezervasyon formu (TourPeriodSelect) seçenekleri */
export function cruisePeriodSelectOptions(
  meta: CruiseVerticalMeta | null,
  opts: { fallbackPrice?: number | null; currencyCode?: string },
): TourPeriodOption[] {
  const periods = meta?.periods ?? []
  if (periods.length === 0) return []

  const currency = (opts.currencyCode || 'TRY').trim().toUpperCase()
  const today = new Date().toISOString().slice(0, 10)
  const fallbackPrice =
    opts.fallbackPrice != null && Number.isFinite(opts.fallbackPrice) && opts.fallbackPrice > 0
      ? opts.fallbackPrice
      : null

  const options: TourPeriodOption[] = []
  for (const p of periods) {
    const startDate = normalizeIsoDate(p.start)
    const endDate = normalizeIsoDate(p.end) || startDate
    if (!startDate && !endDate) continue
    const start = startDate || endDate
    const end = endDate || startDate
    if (end < today) continue

    options.push({
      id: String(p.id ?? `${start}-${end}`),
      startDate: start,
      endDate: end,
      price: fallbackPrice,
      currencyCode: currency,
      bookable: p.isAvailable !== false,
    })
  }

  options.sort((a, b) => a.startDate.localeCompare(b.startDate))
  return options
}
