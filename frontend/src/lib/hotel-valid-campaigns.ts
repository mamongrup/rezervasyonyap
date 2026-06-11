import { normalizeLocalizedText, pickLocalized, type LocalizedText } from '@/lib/localized-text'

export const HOTEL_VALID_CAMPAIGNS_SETTING_KEY = 'catalog.hotel_valid_campaigns'

export type HotelValidCampaignScope = 'all' | 'listings'

export type HotelValidCampaignStoredItem = {
  id: string
  enabled: boolean
  title: LocalizedText
  logoUrl: string
  linkUrl: string
  scope: HotelValidCampaignScope
  listingIds: string[]
  sortOrder: number
}

export type HotelValidCampaignsPayload = {
  sectionTitle: LocalizedText
  items: HotelValidCampaignStoredItem[]
}

const DEFAULT_SECTION_TITLE: LocalizedText = {
  tr: "Otel'de Geçerli Kampanyalar",
  en: 'Valid Hotel Campaigns',
}

function normalizeItem(raw: unknown, index: number): HotelValidCampaignStoredItem | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const id =
    typeof o.id === 'string' && o.id.trim()
      ? o.id.trim()
      : `campaign-${index}-${Date.now()}`
  const title = normalizeLocalizedText(o.title)
  if (!pickLocalized(title, 'tr').trim() && !Object.values(title).some((v) => v.trim())) {
    return null
  }
  const scope: HotelValidCampaignScope = o.scope === 'listings' ? 'listings' : 'all'
  const listingIds = Array.isArray(o.listingIds)
    ? o.listingIds.filter((x): x is string => typeof x === 'string' && x.trim() !== '').map((x) => x.trim())
    : []
  return {
    id,
    enabled: o.enabled !== false,
    title,
    logoUrl: typeof o.logoUrl === 'string' ? o.logoUrl.trim() : '',
    linkUrl: typeof o.linkUrl === 'string' ? o.linkUrl.trim() : '',
    scope,
    listingIds,
    sortOrder: typeof o.sortOrder === 'number' && Number.isFinite(o.sortOrder) ? o.sortOrder : index,
  }
}

export function parseHotelValidCampaignsPayload(raw: unknown): HotelValidCampaignsPayload {
  if (!raw || typeof raw !== 'object') {
    return { sectionTitle: { ...DEFAULT_SECTION_TITLE }, items: [] }
  }
  const o = raw as Record<string, unknown>
  const sectionTitleRaw = normalizeLocalizedText(o.sectionTitle)
  const sectionTitle =
    pickLocalized(sectionTitleRaw, 'tr').trim() ? sectionTitleRaw : { ...DEFAULT_SECTION_TITLE }
  const itemsRaw = Array.isArray(o.items) ? o.items : []
  const items = itemsRaw
    .map((row, i) => normalizeItem(row, i))
    .filter((x): x is HotelValidCampaignStoredItem => x != null)
    .sort((a, b) => a.sortOrder - b.sortOrder)
  return { sectionTitle, items }
}

export function filterHotelValidCampaignsForListing(
  payload: HotelValidCampaignsPayload,
  listingId: string | null | undefined,
): HotelValidCampaignStoredItem[] {
  const lid = listingId?.trim() ?? ''
  return payload.items.filter((item) => {
    if (!item.enabled) return false
    if (item.scope === 'all') return true
    if (!lid) return false
    return item.listingIds.includes(lid)
  })
}

export function splitHotelValidCampaignsForListing(
  payload: HotelValidCampaignsPayload,
  listingId: string | null | undefined,
): { general: HotelValidCampaignStoredItem[]; listingScoped: HotelValidCampaignStoredItem[] } {
  const filtered = filterHotelValidCampaignsForListing(payload, listingId)
  return {
    general: filtered.filter((item) => item.scope === 'all'),
    listingScoped: filtered.filter((item) => item.scope === 'listings'),
  }
}

export function pickHotelValidCampaignTitle(item: HotelValidCampaignStoredItem, locale: string): string {
  return pickLocalized(item.title, locale, '')
}

/** `HotelListingPromotion` ile aynı şema — döngüsel import önlenir. */
export type HotelPromotionCardModel = {
  id: string
  title: string
  title_en: string
  image_url: string
  link_url: string
  sort_order: number
  is_active: boolean
}

export function siteCampaignsToPromotionCards(
  items: HotelValidCampaignStoredItem[],
): HotelPromotionCardModel[] {
  return items.map((item) => ({
    id: `site-${item.id}`,
    title: pickLocalized(item.title, 'tr', ''),
    title_en: pickLocalized(item.title, 'en', pickLocalized(item.title, 'tr', '')),
    image_url: item.logoUrl,
    link_url: item.linkUrl,
    sort_order: item.sortOrder,
    is_active: true,
  }))
}
