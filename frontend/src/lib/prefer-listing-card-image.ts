/**
 * Vitrin kartı kapak URL’si — harici CDN proxy + kplus unwrap dahil.
 */
import { resolveListingDisplayImageUrl } from '@/lib/listing-ext-image-proxy'

export function preferListingCardImageUrl(url: string): string {
  const resolved = resolveListingDisplayImageUrl(url)
  if (!resolved.startsWith('/api/listing-ext-image?')) return resolved
  const separator = resolved.includes('?') ? '&' : '?'
  return `${resolved}${separator}w=640&q=60&format=webp`
}
