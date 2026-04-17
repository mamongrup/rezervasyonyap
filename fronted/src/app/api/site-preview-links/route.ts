import {
  DEFAULT_HOME_PAGE_LINKS,
  parseHomePageLinksFromBranding,
  parseMobileAccountPathFromBranding,
} from '@/lib/site-branding-seo'
import { getSitePublicConfig } from '@/lib/travel-api'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const pub = await getSitePublicConfig(undefined, { next: { revalidate: 120 } } as RequestInit)
    return NextResponse.json({
      ok: true,
      homePageLinks: parseHomePageLinksFromBranding(pub),
      mobileAccountPath: parseMobileAccountPathFromBranding(pub),
    })
  } catch {
    return NextResponse.json({
      ok: true,
      homePageLinks: DEFAULT_HOME_PAGE_LINKS,
      mobileAccountPath: '/account',
    })
  }
}
