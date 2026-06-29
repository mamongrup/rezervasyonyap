/**
 * Google Merchant senkron — yayınlanmış ilanları toplar ve push için hazırlar.
 */

import type { MerchantListingPayload } from '@/lib/google-merchant-api'
import { absoluteMediaUrl } from '@/lib/social-auto-post'

const INTERNAL = process.env.INTERNAL_API_ORIGIN ?? process.env.NEXT_PUBLIC_API_URL ?? ''

type ManageListingRow = {
  id: string
  slug: string
  title: string
  category_code: string
  status: string
  currency_code?: string
}

type PublicListingRow = {
  id: string
  slug: string
  title: string
  category_code: string
  currency_code?: string | null
  listing_currency_code?: string | null
  price_from?: string | null
  featured_image_url?: string | null
  thumbnail_url?: string | null
}

async function backendGet<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${INTERNAL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  if (!res.ok) {
    const e = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(e.error ?? `backend_${res.status}`)
  }
  return res.json() as Promise<T>
}

async function backendPublicGet<T>(path: string): Promise<T> {
  const res = await fetch(`${INTERNAL}${path}`, { cache: 'no-store' })
  if (!res.ok) {
    const e = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(e.error ?? `backend_${res.status}`)
  }
  return res.json() as Promise<T>
}

export async function fetchPublishedListingsForMerchant(
  token: string,
  opts?: { categoryCode?: string; limit?: number; page?: number },
): Promise<ManageListingRow[]> {
  const limit = Math.min(Math.max(opts?.limit ?? 100, 1), 500)
  const page = Math.max(opts?.page ?? 1, 1)
  const qs = new URLSearchParams({
    per_page: String(limit),
    page: String(page),
    title_locale: 'tr',
  })
  if (opts?.categoryCode?.trim()) qs.set('category_code', opts.categoryCode.trim())

  const res = await backendGet<{
    listings: {
      id: string
      slug: string
      title: string
      category_code: string
      status: string
      currency_code?: string
    }[]
  }>(`/api/v1/catalog/manage-listings?${qs}`, token)

  return (res.listings ?? []).filter((l) => l.status === 'published')
}

export async function enrichListingForMerchant(
  listing: ManageListingRow,
  siteUrl: string,
): Promise<MerchantListingPayload | null> {
  let priceFrom: string | null = null
  let featured: string | null = null
  let thumb: string | null = null
  let description: string | null = null
  let currency = listing.currency_code ?? 'TRY'

  try {
    const search = await backendPublicGet<{ listings?: PublicListingRow[] }>(
      `/api/v1/catalog/public/listings?listing_ids=${encodeURIComponent(listing.id)}&limit=1&locale=tr`,
    )
    const pub = search.listings?.[0]
    if (pub) {
      priceFrom = pub.price_from ?? null
      featured = pub.featured_image_url ?? null
      thumb = pub.thumbnail_url ?? null
      currency = pub.listing_currency_code ?? pub.currency_code ?? currency
    }
  } catch {
    /* public search optional */
  }

  if (!featured && !thumb) {
    try {
      const imgs = await backendPublicGet<{ images: Array<{ storage_key?: string; is_cover?: boolean }> }>(
        `/api/v1/catalog/public/listings/${encodeURIComponent(listing.id)}/images`,
      )
      const cover =
        imgs.images?.find((i) => i.is_cover)?.storage_key?.trim() ||
        imgs.images?.[0]?.storage_key?.trim() ||
        ''
      if (cover) featured = absoluteMediaUrl(siteUrl, cover)
    } catch {
      /* no images */
    }
  }

  try {
    const vitrine = await backendPublicGet<{ description?: string | null }>(
      `/api/v1/catalog/public/listings/${encodeURIComponent(listing.id)}/vitrine?locale=tr`,
    )
    description = vitrine.description ?? null
  } catch {
    description = listing.title
  }

  if (!priceFrom) return null

  return {
    id: listing.id,
    slug: listing.slug,
    title: listing.title,
    description,
    category_code: listing.category_code,
    currency_code: currency,
    price_from: priceFrom,
    featured_image_url: featured,
    thumbnail_url: thumb,
  }
}

export async function recordMerchantPush(
  token: string,
  listingId: string,
  merchantProductId: string,
): Promise<void> {
  const res = await fetch(`${INTERNAL}/api/v1/integrations/google-merchant-products`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      listing_id: listingId,
      merchant_product_id: merchantProductId,
      status: 'active',
    }),
    cache: 'no-store',
  })
  if (!res.ok) {
    const e = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(e.error ?? `gmp_record_${res.status}`)
  }
}

