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
    for (const loc of localeCodes) {
      out.push({
        url: `${base}${await vitrinHref(loc, path)}`,
      })
    }
  }
  return out
}
