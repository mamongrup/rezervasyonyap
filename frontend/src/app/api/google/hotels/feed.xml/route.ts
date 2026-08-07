import { buildGoogleHotelsFeedXml } from '@/lib/google-hotels-feed'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const xml = await buildGoogleHotelsFeedXml()
    return new Response(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    })
  } catch (err) {
    return new Response(`<?xml version="1.0"?><error>Internal Error</error>`, {
      status: 500,
      headers: { 'Content-Type': 'application/xml; charset=utf-8' },
    })
  }
}
