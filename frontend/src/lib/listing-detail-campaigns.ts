import { pickLocalizedName } from '@/lib/travel-api'

export type ListingDetailCampaignItem = {
  id: string
  kind: 'card_installment' | 'listing_discount' | string
  title: string
  name_translations?: string
  rules_json?: string
  starts_at: string | null
  ends_at: string | null
  discount_percent: string | null
}

export function parseListingDetailCampaignsPayload(raw: unknown): ListingDetailCampaignItem[] {
  if (!raw || typeof raw !== 'object') return []
  const campaigns = (raw as { campaigns?: unknown }).campaigns
  if (!Array.isArray(campaigns)) return []
  return campaigns
    .filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === 'object')
    .map((row) => ({
      id: String(row.id ?? ''),
      kind: String(row.kind ?? ''),
      title: String(row.title ?? ''),
      name_translations: typeof row.name_translations === 'string' ? row.name_translations : undefined,
      rules_json: typeof row.rules_json === 'string' ? row.rules_json : undefined,
      starts_at: typeof row.starts_at === 'string' ? row.starts_at : null,
      ends_at: typeof row.ends_at === 'string' ? row.ends_at : null,
      discount_percent:
        row.discount_percent != null && row.discount_percent !== ''
          ? String(row.discount_percent)
          : null,
    }))
    .filter((c) => c.id && c.title.trim())
}

export function installmentCountFromRules(rulesJson?: string): number {
  if (!rulesJson?.trim()) return 12
  try {
    const o = JSON.parse(rulesJson) as { installment_count?: unknown }
    const n = typeof o.installment_count === 'number' ? o.installment_count : 12
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 12
  } catch {
    return 12
  }
}

export function campaignDisplayTitle(item: ListingDetailCampaignItem, locale: string): string {
  return pickLocalizedName(item.title, item.name_translations, locale)
}

export function formatCampaignEndDate(iso: string | null, locale: string): string | null {
  if (!iso?.trim()) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  const lang = locale.split('-')[0] ?? 'tr'
  return d.toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}
