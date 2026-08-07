/**
 * Google Hotel Center / Free Booking Links XML Feed Generator.
 * Standart Google Listings & Hotel Feed XML formatı.
 * https://developers.google.com/hotels/hotel-prices/xml-reference/hotel-list-feed
 */

import { resolveCanonicalBaseUrl } from '@/lib/resolve-canonical-base-url'
import { getPublicSiteUrl } from '@/lib/site-branding-seo'
import { searchPublicListings, type PublicListingItem } from '@/lib/travel-api'

export function escapeXml(text?: string | null): string {
  if (!text) return ''
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Otel ve konaklama ilanlarını Google Hotel Center XML formatına dönüştürür.
 */
export function generateGoogleHotelsXml(
  listings: PublicListingItem[],
  siteBase: string,
): string {
  const base = siteBase.replace(/\/$/, '')
  const xmlItems = listings.map((item) => {
    const listingUrl = `${base}/otel/${item.slug}`
    const priceNum = item.price_from ? parseFloat(item.price_from) : undefined
    const validPrice = Number.isFinite(priceNum) && priceNum! > 0 ? priceNum : undefined
    const address = item.location?.trim() || 'Türkiye'

    return `  <listing>
    <id>${escapeXml(item.id)}</id>
    <name>${escapeXml(item.title)}</name>
    <address format="simple">${escapeXml(address)}</address>
    <country>TR</country>
    ${item.thumbnail_url || item.featured_image_url ? `<image>${escapeXml(item.featured_image_url || item.thumbnail_url)}</image>` : ''}
    <landing_page>
      <url>${escapeXml(listingUrl)}</url>
    </landing_page>
    ${validPrice ? `<price currency="TRY">${validPrice}</price>` : ''}
  </listing>`
  })

  return `<?xml version="1.0" encoding="UTF-8"?>
<listings xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
${xmlItems.join('\n')}
</listings>`
}

/**
 * Tüm yayınlanmış konaklama ilanlarını çekip Google Hotel Center XML feed'i oluşturur.
 */
export async function buildGoogleHotelsFeedXml(): Promise<string> {
  const [siteBase, searchRes] = await Promise.all([
    resolveCanonicalBaseUrl().then((b) => b || getPublicSiteUrl()),
    searchPublicListings({ perPage: 200, categoryCode: 'hotel' }).catch(() => null),
  ])

  const listings = searchRes?.listings || []
  return generateGoogleHotelsXml(listings, siteBase)
}
