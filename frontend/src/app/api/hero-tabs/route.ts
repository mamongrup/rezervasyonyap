import { fetchPublicNavMenuItems } from '@/lib/travel-api'
import { NextResponse } from 'next/server'

export const revalidate = 0

export async function GET() {
  try {
    const { items } = await fetchPublicNavMenuItems('hero_search', undefined, {
      cache: 'no-store',
    })
    return NextResponse.json({ items })
  } catch {
    return NextResponse.json({ items: [] })
  }
}
