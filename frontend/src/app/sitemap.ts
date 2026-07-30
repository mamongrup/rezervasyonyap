import type { MetadataRoute } from 'next'
import { cache } from 'react'
import { getSeoSitemapEntries, type SitemapEntry } from '@/lib/travel-api'
import { normalizeCatalogVertical } from '@/lib/catalog-listing-vertical'
import { detailPathForVertical } from '@/lib/listing-detail-routes'
import { resolveCanonicalBaseUrl } from '@/lib/resolve-canonical-base-url'
import {
  allSitemapSegmentIds,
  categoryBrowsePathForVertical,
  filterSitemapEntriesForSegment,
  isSitemapSegmentId,
  SITEMAP_SITE_SEGMENT,
  type SitemapSegmentId,
} from '@/lib/seo/sitemap-segments'
import { vitrinHref } from '@/lib/vitrin-href'
import { fetchActiveLocaleCodes } from '@/lib/i18n-server'

/**
 * Host’a göre URL üretildiği için marka domainleri arasında cache karışmasın.
 * `/sitemap.xml` → kategori index; `/sitemap/{hotel|tour|…}.xml` → kategori haritası.
 */
export const dynamic = 'force-dynamic'

const cachedSeoSitemapEntries = cache(async (): Promise<SitemapEntry[]> => {
  try {
    const r = await getSeoSitemapEntries()
    return r.entries
  } catch {
    return []
  }
})

function pathForEntry(e: SitemapEntry): string {
  switch (e.kind) {
    case 'listing': {
      const code = normalizeCatalogVertical(e.category_code ?? undefined)
      const base = detailPathForVertical(code)
      return `${base}/${e.slug}`
    }
    case 'cms_page':
      return `/p/${e.slug}`
    case 'blog_post':
      return `/blog/${e.slug}`
    default:
      return `/${e.slug}`
  }
}

/** Göreli `/uploads/...` veya ham storage key → mutlak HTTPS URL. */
function absoluteSitemapImages(siteBase: string, images: string[] | null | undefined): string[] {
  if (!images?.length) return []
  const out: string[] = []
  const seen = new Set<string>()
  for (const raw of images) {
    const u = (raw ?? '').trim()
    if (!u) continue
    let abs = u
    if (!/^https?:\/\//i.test(u)) {
      const path = u.startsWith('/') ? u : `/${u}`
      abs = `${siteBase}${path}`
    } else if (u.startsWith('http://')) {
      abs = `https://${u.slice('http://'.length)}`
    }
    if (seen.has(abs)) continue
    seen.add(abs)
    out.push(abs)
    if (out.length >= 5) break
  }
  return out
}

async function pushLocalizedUrls(
  out: MetadataRoute.Sitemap,
  siteBase: string,
  localeCodes: string[],
  path: string,
  opts?: { changeFrequency?: MetadataRoute.Sitemap[number]['changeFrequency']; priority?: number; images?: string[] },
): Promise<void> {
  for (const loc of localeCodes) {
    out.push({
      url: `${siteBase}${await vitrinHref(loc, path)}`,
      ...(opts?.changeFrequency ? { changeFrequency: opts.changeFrequency } : {}),
      ...(opts?.priority != null ? { priority: opts.priority } : {}),
      ...(opts?.images?.length ? { images: opts.images } : {}),
    })
  }
}

export async function generateSitemaps() {
  return allSitemapSegmentIds().map((id) => ({ id }))
}

export default async function sitemap(props: {
  id: Promise<string>
}): Promise<MetadataRoute.Sitemap> {
  const rawId = await props.id
  if (!isSitemapSegmentId(rawId)) return []

  const segment: SitemapSegmentId = rawId
  const base = (await resolveCanonicalBaseUrl()).replace(/\/$/, '')
  if (!base) return []

  const localeCodes = await fetchActiveLocaleCodes()
  const out: MetadataRoute.Sitemap = []

  if (segment === SITEMAP_SITE_SEGMENT) {
    for (const loc of localeCodes) {
      out.push({
        url: `${base}${await vitrinHref(loc, '/')}`,
        changeFrequency: 'daily',
        priority: 1,
      })
    }
  } else {
    await pushLocalizedUrls(out, base, localeCodes, categoryBrowsePathForVertical(segment), {
      changeFrequency: 'daily',
      priority: 0.9,
    })
  }

  const entries = filterSitemapEntriesForSegment(await cachedSeoSitemapEntries(), segment)
  for (const e of entries) {
    const path = pathForEntry(e)
    const images = e.kind === 'listing' ? absoluteSitemapImages(base, e.images) : []
    await pushLocalizedUrls(out, base, localeCodes, path, {
      ...(images.length ? { images } : {}),
    })
  }

  return out
}
