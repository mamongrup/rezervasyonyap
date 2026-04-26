import { getPublicNavigationOrganizationId } from '@/lib/nav-public-org-id'
import { fetchPublicNavMenuItems } from '@/lib/travel-api'
import { NextResponse } from 'next/server'

export const revalidate = 0

export async function GET() {
  try {
    const { items } = await fetchPublicNavMenuItems(
      'hero_search',
      getPublicNavigationOrganizationId(),
      { cache: 'no-store' },
    )
    return NextResponse.json({ items })
  } catch {
    return NextResponse.json({ error: 'hero_tabs_upstream_failed' }, { status: 502 })
  }
}
