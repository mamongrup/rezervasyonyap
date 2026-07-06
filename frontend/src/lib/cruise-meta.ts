import { unwrapVerticalMetaPayload } from '@/lib/listing-pools'
import { sanitizeRichCmsHtml } from '@/lib/sanitize-cms-html'
import {
  formatCruisePlaceName,
  formatCruiseRouteSummary,
} from '@/lib/cruise-route-display'
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
  transport?: string | null
  visa_info?: string | null
  tour_code?: string | null
  visits?: string[]
  departure_points?: string[]
  ship_specs?: string[]
  ship_activities?: string[]
  ship_image_url?: string | null
  deck_plan_image_url?: string | null
  gallery_urls?: string[]
  tatilsepeti_url?: string | null
  tatilsepeti_tour_id?: string | null
  info_sections?: Array<{ id: string; title: string; html: string }>
  program_days?: Array<{
    day?: number
    day_label?: string
    title: string
    description?: string
    body_html?: string
  }>
  cabins?: CruiseCabinOption[]
  included_services?: string[]
  excluded_services?: string[]
  periods?: Array<{
    id?: number | string | null
    start?: string
    end?: string
    label?: string
    isAvailable?: boolean
  }>
}

export type CruiseMoney = { amount: number; currency: string }

export type CruiseCabinOption = {
  id: string
  name: string
  campaign?: string | null
  description?: string
  footnote?: string | null
  image_urls?: string[]
  prices?: {
    double_per_person?: CruiseMoney | null
    extra_bed?: CruiseMoney | null
    single?: CruiseMoney | null
    children?: Array<CruiseMoney & { label: string }>
  }
  from_price?: CruiseMoney | null
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
    transport?: string
    visa?: string
    tourCode?: string
  },
  nightFallback?: number | null,
): TourOverviewItem[] {
  if (!meta) return []
  const nights = meta.night_count ?? nightFallback
  const items: TourOverviewItem[] = []
  if (meta.cruise_line) {
    items.push({ label: labels.cruiseLine, value: formatCruisePlaceName(meta.cruise_line), icon: 'location' })
  }
  if (meta.ship_name) {
    items.push({ label: labels.ship, value: meta.ship_name, icon: 'transport' })
  }
  // Rota ayrı tam genişlik bileşende gösterilir (CruiseRouteSection)
  if (meta.cabin_category) {
    items.push({ label: labels.cabin, value: meta.cabin_category, icon: 'location' })
  }
  if (nights != null && nights > 0) {
    items.push({ label: labels.nights, value: String(nights), icon: 'duration' })
  }
  if (meta.tour_departure) {
    items.push({ label: labels.departure, value: formatCruisePlaceName(meta.tour_departure), icon: 'location' })
  }
  if (meta.concept_name) {
    items.push({ label: labels.concept, value: meta.concept_name, icon: 'location' })
  }
  if (meta.transport?.trim() && labels.transport) {
    items.push({ label: labels.transport, value: meta.transport.trim(), icon: 'transport' })
  }
  if (meta.visa_info?.trim() && labels.visa) {
    items.push({ label: labels.visa, value: meta.visa_info.trim(), icon: 'visa' })
  }
  if (meta.tour_code?.trim() && labels.tourCode) {
    items.push({ label: labels.tourCode, value: meta.tour_code.trim(), icon: 'guide' })
  }
  return items
}

export function cruiseInfoSections(meta: CruiseVerticalMeta | null, locale = 'tr'): TourInfoSection[] {
  const rows = meta?.info_sections ?? []
  const fromMeta = rows
    .filter((s) => s?.html?.trim())
    .map((s) => ({
      id: s.id || `cruise-info-${s.title}`,
      title: s.title,
      html: sanitizeRichCmsHtml(s.html),
    }))
  if (fromMeta.length > 0) return fromMeta
  if (meta?.detail_text?.trim()) {
    return [
      {
        id: 'cruise-detail-text',
        title: locale.startsWith('en') ? 'Notes' : 'Açıklamalar',
        html: sanitizeRichCmsHtml(meta.detail_text),
      },
    ]
  }
  return []
}

export function cruiseItineraryDays(meta: CruiseVerticalMeta | null): TourItineraryDay[] {
  const rows = meta?.program_days ?? []
  const days: TourItineraryDay[] = []
  for (let i = 0; i < rows.length; i++) {
    const d = rows[i]!
    const day =
      Number(d.day) ||
      Number(String(d.day_label || '').replace(/\D/g, '')) ||
      i + 1
    const plain = String(d.description || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    const rawHtml = String(d.body_html || d.description || '').trim()
    if (!plain && !rawHtml) continue
    const row: TourItineraryDay = {
      day,
      title: d.title?.trim() ? formatCruiseRouteSummary(d.title) : `Gün ${day}`,
      description: plain || rawHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
    }
    if (rawHtml.includes('<')) {
      row.descriptionHtml = sanitizeRichCmsHtml(rawHtml)
    }
    days.push(row)
  }
  return days
}

export function cabinDisplayPrice(cabin: CruiseCabinOption): CruiseMoney | null {
  return (
    cabin.from_price ??
    cabin.prices?.double_per_person ??
    cabin.prices?.single ??
    cabin.prices?.extra_bed ??
    cabin.prices?.children?.[0] ??
    null
  )
}

/** Kabin özellik metnini madde listesine ayırır (Tatilsepeti cabin-info). */
export function parseCabinFeatureLines(description: string | undefined | null): string[] {
  const raw = String(description || '').trim()
  if (!raw) return []
  const bulletSplit = raw.split(/\s*[•·▪]\s*/).map((s) => s.trim()).filter(Boolean)
  if (bulletSplit.length > 1) return bulletSplit
  const semicolonSplit = raw.split(/\s*;\s*/).map((s) => s.trim()).filter((s) => s.length > 2)
  if (semicolonSplit.length >= 3) return semicolonSplit
  const commaSplit = raw
    .split(/\s*,\s*/)
    .map((s) => s.trim())
    .filter((s) => s.length > 2 && s.length < 90)
  if (commaSplit.length >= 4) return commaSplit
  return [raw]
}

export function cheapestCabinId(cabins: CruiseCabinOption[]): string {
  if (cabins.length === 0) return ''
  let best = cabins[0]!
  let bestAmount = cabinDisplayPrice(best)?.amount ?? Number.POSITIVE_INFINITY
  for (const cabin of cabins.slice(1)) {
    const amount = cabinDisplayPrice(cabin)?.amount ?? Number.POSITIVE_INFINITY
    if (amount < bestAmount) {
      best = cabin
      bestAmount = amount
    }
  }
  return best.id
}

export function cruiseCabins(meta: CruiseVerticalMeta | null): CruiseCabinOption[] {
  const rows = meta?.cabins ?? []
  const gallery = (meta?.gallery_urls ?? []).filter(Boolean)
  let galleryIdx = 0
  return rows
    .filter((c) => c?.name?.trim())
    .map((c, i) => {
      let image_urls = c.image_urls?.filter(Boolean)
      if (!image_urls?.length && gallery.length > 0) {
        image_urls = [gallery[galleryIdx % gallery.length]]
        galleryIdx += 1
      }
      return {
        id: c.id || `cabin-${i}`,
        name: String(c.name).trim(),
        campaign: c.campaign ?? null,
        description: c.description?.trim() || undefined,
        footnote: c.footnote?.trim() || null,
        image_urls,
        prices: c.prices,
        from_price: c.from_price ?? c.prices?.double_per_person ?? c.prices?.single ?? null,
      }
    })
}

export function cruiseIncludedExcluded(meta: CruiseVerticalMeta | null): {
  included: string[]
  excluded: string[]
} {
  const included = (meta?.included_services ?? []).filter(Boolean)
  const excluded = (meta?.excluded_services ?? []).filter(Boolean)
  return { included, excluded }
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
  opts: { fallbackPrice?: number | null; currencyCode?: string; /** Gezinomi: API isAvailable yanıltıcı — gelecek dönemleri listele */ listedOnly?: boolean },
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
      bookable: opts.listedOnly ? true : p.isAvailable !== false,
      onlineCheckout: opts.listedOnly ? false : true,
    })
  }

  options.sort((a, b) => a.startDate.localeCompare(b.startDate))
  return options
}
