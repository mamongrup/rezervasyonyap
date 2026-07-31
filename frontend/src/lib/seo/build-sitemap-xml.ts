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
 * Next 16 + `generateSitemaps()` kök `/sitemap.xml` index üretmiyor (404).
 * Bu modül route handler’larla index + segment XML üretir.
 */

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
export function absoluteSitemapImages(siteBase: string, images: string[] | null | undefined): string[] {
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
  opts?: {
    changeFrequency?: MetadataRoute.Sitemap[number]['changeFrequency']
    priority?: number
    images?: string[]
  },
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

export function normalizeSitemapSegmentParam(raw: string): string {
  const t = raw.trim()
  return t.toLowerCase().endsWith('.xml') ? t.slice(0, -4) : t
}

export function escapeXmlText(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/** Kök `/sitemap.xml` — kategori segmentlerine işaret eden sitemap index. */
export async function buildSitemapIndexXml(): Promise<string | null> {
  const base = (await resolveCanonicalBaseUrl()).replace(/\/$/, '')
  if (!base) return null
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ]
  for (const id of allSitemapSegmentIds()) {
    lines.push('  <sitemap>')
    lines.push(`    <loc>${escapeXmlText(`${base}/sitemap/${id}.xml`)}</loc>`)
    lines.push('  </sitemap>')
  }
  lines.push('</sitemapindex>')
  return `${lines.join('\n')}\n`
}

export async function buildSegmentSitemapEntries(
  segmentRaw: string,
): Promise<MetadataRoute.Sitemap | null> {
  const rawId = normalizeSitemapSegmentParam(segmentRaw)
  if (!isSitemapSegmentId(rawId)) return null

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

export function sitemapEntriesToXml(entries: MetadataRoute.Sitemap): string {
  const hasImages = entries.some((e) => Array.isArray(e.images) && e.images.length > 0)
  const ns = hasImages
    ? 'xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"'
    : 'xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"'
  const parts: string[] = [`<?xml version="1.0" encoding="UTF-8"?>`, `<urlset ${ns}>`]
  for (const e of entries) {
    parts.push('<url>')
    parts.push(`<loc>${escapeXmlText(e.url)}</loc>`)
    if (e.lastModified) {
      const lm =
        e.lastModified instanceof Date ? e.lastModified.toISOString() : String(e.lastModified)
      parts.push(`<lastmod>${escapeXmlText(lm)}</lastmod>`)
    }
    if (e.changeFrequency) {
      parts.push(`<changefreq>${escapeXmlText(e.changeFrequency)}</changefreq>`)
    }
    if (typeof e.priority === 'number') {
      parts.push(`<priority>${e.priority}</priority>`)
    }
    if (Array.isArray(e.images)) {
      for (const img of e.images) {
        if (!img) continue
        parts.push('<image:image>')
        parts.push(`<image:loc>${escapeXmlText(img)}</image:loc>`)
        parts.push('</image:image>')
      }
    }
    parts.push('</url>')
  }
  parts.push('</urlset>')
  return `${parts.join('')}\n`
}

export const SITEMAP_XML_HEADERS = {
  'Content-Type': 'application/xml; charset=utf-8',
  'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
} as const
