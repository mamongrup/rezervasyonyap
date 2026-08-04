import { preferListingCardImageUrl } from '@/lib/prefer-listing-card-image'

type GalleryItem = string | { src?: string | null } | null | undefined

export function listingCardImageCandidates(
  galleryImgs: GalleryItem[] | undefined,
  featuredImage: string | undefined,
): string[] {
  const raw: string[] = []

  for (const item of galleryImgs ?? []) {
    const value =
      typeof item === 'string'
        ? item
        : item && typeof item === 'object' && typeof item.src === 'string'
          ? item.src
          : ''
    const trimmed = value.trim()
    if (trimmed) raw.push(trimmed)
  }

  const featured = (featuredImage ?? '').trim()
  if (featured) raw.push(featured)

  const out: string[] = []
  const seen = new Set<string>()
  for (const value of raw) {
    const normalized = preferListingCardImageUrl(value)
    if (!normalized || seen.has(normalized)) continue
    seen.add(normalized)
    out.push(normalized)
  }

  return out
}
