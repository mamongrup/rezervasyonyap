import {
  buildSitemapIndexXml,
  SITEMAP_XML_HEADERS,
} from '@/lib/seo/build-sitemap-xml'

export const dynamic = 'force-dynamic'

/**
 * Kök sitemap index — Next 16 `generateSitemaps()` bunu üretmiyor (404).
 * GSC / robots.txt burayı bekler; alt haritalar `/sitemap/{id}.xml`.
 */
export async function GET() {
  const xml = await buildSitemapIndexXml()
  if (!xml) {
    return new Response('Sitemap base URL unavailable', { status: 503 })
  }
  return new Response(xml, { status: 200, headers: SITEMAP_XML_HEADERS })
}
