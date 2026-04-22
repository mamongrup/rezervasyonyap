import {
  DEFAULT_HOME_PAGE_LINKS,
  parseHomePageLinksFromBranding,
  parseMobileAccountPathFromBranding,
} from '@/lib/site-branding-seo'
import { getSitePublicConfig } from '@/lib/travel-api'
import { NextResponse } from 'next/server'

/** Küçük JSON yanıtı; RSC/fetch-disk önbelleği birleşik gövde üretebildiğinde istemci `json()` patlamasın diye no-store. */
export const dynamic = 'force-dynamic'

const NO_STORE = { 'Cache-Control': 'no-store, must-revalidate' } as const

export async function GET() {
  try {
    const pub = await getSitePublicConfig(undefined, { cache: 'no-store' })
    return NextResponse.json(
      {
        ok: true,
        homePageLinks: parseHomePageLinksFromBranding(pub),
        mobileAccountPath: parseMobileAccountPathFromBranding(pub),
      },
      { headers: NO_STORE },
    )
  } catch {
    return NextResponse.json(
      {
        ok: true,
        homePageLinks: DEFAULT_HOME_PAGE_LINKS,
        mobileAccountPath: '/account',
      },
      { headers: NO_STORE },
    )
  }
}
