import type { MetadataRoute } from 'next'
import { getSeoSitemapEntries, type SitemapEntry } from '@/lib/travel-api'
import { normalizeCatalogVertical } from '@/lib/catalog-listing-vertical'
import { detailPathForVertical } from '@/lib/listing-detail-routes'
import { vitrinHref } from '@/lib/vitrin-href'
import { fetchActiveLocaleCodes } from '@/lib/i18n-server'

export const revalidate = 3600

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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? '').replace(/\/$/, '')
  if (!base) return []

  let entries: SitemapEntry[] = []
  try {
    const r = await getSeoSitemapEntries()
    entries = r.entries
  } catch {
    return []
  }

  const localeCodes = await fetchActiveLocaleCodes()
  const out: MetadataRoute.Sitemap = []
  for (const e of entries) {
    const path = pathForEntry(e)
    const images = e.kind === 'listing' ? absoluteSitemapImages(base, e.images) : []
    for (const loc of localeCodes) {
      out.push({
        url: `${base}${await vitrinHref(loc, path)}`,
        ...(images.length ? { images } : {}),
      })
    }
  }
  return out
}
