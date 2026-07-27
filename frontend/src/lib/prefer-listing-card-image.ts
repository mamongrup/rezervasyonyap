/**
 * Vitrin kartı kapak URL’si — harici CDN proxy + kplus unwrap dahil.
 */
import { resolveListingDisplayImageUrl } from '@/lib/listing-ext-image-proxy'

export function preferListingCardImageUrl(url: string): string {
  return resolveListingDisplayImageUrl(url)
}
