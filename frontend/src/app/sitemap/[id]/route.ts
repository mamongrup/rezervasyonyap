import {
  buildSegmentSitemapEntries,
  sitemapEntriesToXml,
  SITEMAP_XML_HEADERS,
} from '@/lib/seo/build-sitemap-xml'

export const dynamic = 'force-dynamic'

type Params = { id: string }

/**
 * Kategori / site segment sitemap’i.
 * `/sitemap/hotel.xml` ve `/sitemap/hotel` kabul edilir.
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<Params> },
) {
  const { id } = await ctx.params
  const entries = await buildSegmentSitemapEntries(id)
  if (entries == null) {
    return new Response('Not Found', { status: 404 })
  }
  return new Response(sitemapEntriesToXml(entries), {
    status: 200,
    headers: SITEMAP_XML_HEADERS,
  })
}
