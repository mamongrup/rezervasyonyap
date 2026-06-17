import { getMessages } from '@/utils/getT'
import { toIntlLocale } from '@/lib/intl-locale'

export function isActivityListingCategory(
  categoryCode?: string | null,
  listingVertical?: string | null,
): boolean {
  const cat = categoryCode?.trim().toLowerCase()
  const vertical = listingVertical?.trim().toLowerCase()
  return cat === 'activity' || vertical === 'activity'
}

export function activityPriceFromAffix(locale: string | undefined | null): {
  prefix: string
  suffix: string
} {
  const cm = getMessages(locale).listing.cardMeta
  return {
    prefix: cm.priceFromPrefix ?? '',
    suffix: cm.priceFromSuffix ?? '',
  }
}

export function shouldShowActivityFromPrice(
  categoryCode: string | undefined | null,
  listingVertical: string | undefined | null,
  priceAmount: number | undefined,
  priceLabel: string | undefined,
): boolean {
  if (!isActivityListingCategory(categoryCode, listingVertical)) return false
  if (priceAmount != null && Number.isFinite(priceAmount) && priceAmount > 0) return true
  return Boolean(priceLabel?.trim())
}

/** Arama / keşfet kartları — min seans fiyatı metni */
export function formatActivityListingCardPrice(
  locale: string | undefined | null,
  amount: number,
  currencyCode: string,
): string {
  const { prefix, suffix } = activityPriceFromAffix(locale)
  const formatted = new Intl.NumberFormat(toIntlLocale(locale), {
    style: 'currency',
    currency: (currencyCode || 'TRY').trim().toUpperCase(),
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
  return `${prefix}${formatted}${suffix}`
}

export function formatPublicListingCardPrice(
  item: {
    category_code?: string | null
    listing_vertical?: string | null
    price_from?: string | null
    currency_code?: string | null
  },
  locale: string | undefined | null,
): string | null {
  const raw = item.price_from
  if (raw == null || String(raw).trim() === '') return null
  const amount = parseFloat(String(raw).replace(/\s/g, '').replace(/,/g, '.'))
  if (!Number.isFinite(amount) || amount <= 0) return null
  const currency = (item.currency_code || 'TRY').trim().toUpperCase()
  if (isActivityListingCategory(item.category_code, item.listing_vertical)) {
    return formatActivityListingCardPrice(locale, amount, currency)
  }
  return new Intl.NumberFormat(toIntlLocale(locale), {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount) + (currency ? ` ${currency}` : '')
}
