import { pickLocalized, normalizeLocalizedText, type LocalizedText } from '@/lib/localized-text'

export type ActivityExtraFeeUnit =
  | 'per_stay'
  | 'per_night'
  | 'per_person'
  | 'per_person_per_night'

export type ActivityExtraFeeRow = {
  label: LocalizedText
  amount: string
  unit: ActivityExtraFeeUnit
  currency_code: string
}

export type ActivityVitrinSectionTitles = {
  similar?: LocalizedText
  region?: LocalizedText
  extra_fees?: LocalizedText
}

export type ActivityVitrinMeta = {
  section_titles?: ActivityVitrinSectionTitles
  similar_listing_ids?: string[]
  region_listing_ids?: string[]
  extra_fees?: ActivityExtraFeeRow[]
}

const EXTRA_FEE_UNITS = new Set<ActivityExtraFeeUnit>([
  'per_stay',
  'per_night',
  'per_person',
  'per_person_per_night',
])

function parseIdList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  const out: string[] = []
  const seen = new Set<string>()
  for (const item of raw) {
    const id = typeof item === 'string' ? item.trim() : item == null ? '' : String(item).trim()
    if (!id || seen.has(id)) continue
    seen.add(id)
    out.push(id)
  }
  return out
}

function parseSectionTitles(raw: unknown): ActivityVitrinSectionTitles | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const o = raw as Record<string, unknown>
  const similar = normalizeLocalizedText(o.similar)
  const region = normalizeLocalizedText(o.region)
  const extra_fees = normalizeLocalizedText(o.extra_fees)
  if (!Object.keys(similar).length && !Object.keys(region).length && !Object.keys(extra_fees).length) {
    return undefined
  }
  return {
    ...(Object.keys(similar).length ? { similar } : {}),
    ...(Object.keys(region).length ? { region } : {}),
    ...(Object.keys(extra_fees).length ? { extra_fees } : {}),
  }
}

function parseExtraFees(raw: unknown): ActivityExtraFeeRow[] {
  if (!Array.isArray(raw)) return []
  const out: ActivityExtraFeeRow[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    const amount = row.amount == null ? '' : String(row.amount).trim()
    if (!amount) continue
    const unitRaw = String(row.unit ?? 'per_person').trim() as ActivityExtraFeeUnit
    const unit = EXTRA_FEE_UNITS.has(unitRaw) ? unitRaw : 'per_person'
    const label = normalizeLocalizedText(row.label)
    if (!Object.keys(label).length) continue
    out.push({
      label,
      amount,
      unit,
      currency_code: String(row.currency_code ?? 'TRY').trim().toUpperCase() || 'TRY',
    })
  }
  return out
}

/** Aktivite dikey `meta_json` içinden vitrin bölüm ayarları. */
export function parseActivityVitrinMeta(raw: unknown): ActivityVitrinMeta {
  const data = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const nested =
    data.vitrin && typeof data.vitrin === 'object' ? (data.vitrin as Record<string, unknown>) : data

  const section_titles = parseSectionTitles(nested.section_titles)
  const similar_listing_ids = parseIdList(nested.similar_listing_ids)
  const region_listing_ids = parseIdList(nested.region_listing_ids)
  const extra_fees = parseExtraFees(nested.extra_fees)

  return {
    ...(section_titles ? { section_titles } : {}),
    ...(similar_listing_ids.length ? { similar_listing_ids } : {}),
    ...(region_listing_ids.length ? { region_listing_ids } : {}),
    ...(extra_fees.length ? { extra_fees } : {}),
  }
}

export function pickActivitySectionTitle(
  meta: ActivityVitrinMeta | undefined,
  key: keyof ActivityVitrinSectionTitles,
  locale: string,
  fallback: string,
): string {
  const picked = pickLocalized(meta?.section_titles?.[key], locale, '').trim()
  return picked || fallback
}

export function activityVitrinMetaForSave(input: {
  sectionTitles: ActivityVitrinSectionTitles
  similarListingIds: string[]
  regionListingIds: string[]
  extraFees: ActivityExtraFeeRow[]
}): Record<string, unknown> {
  const section_titles: Record<string, LocalizedText> = {}
  if (input.sectionTitles.similar && Object.keys(input.sectionTitles.similar).length) {
    section_titles.similar = input.sectionTitles.similar
  }
  if (input.sectionTitles.region && Object.keys(input.sectionTitles.region).length) {
    section_titles.region = input.sectionTitles.region
  }
  if (input.sectionTitles.extra_fees && Object.keys(input.sectionTitles.extra_fees).length) {
    section_titles.extra_fees = input.sectionTitles.extra_fees
  }

  return {
    ...(Object.keys(section_titles).length ? { section_titles } : {}),
    ...(input.similarListingIds.length ? { similar_listing_ids: input.similarListingIds } : {}),
    ...(input.regionListingIds.length ? { region_listing_ids: input.regionListingIds } : {}),
    ...(input.extraFees.length ? { extra_fees: input.extraFees } : {}),
  }
}
