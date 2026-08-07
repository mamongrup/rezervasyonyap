import { NextRequest, NextResponse } from 'next/server'
import { submitToIndexNow } from '@/lib/seo/indexnow'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const urls = Array.isArray(body?.urls) ? body.urls : body?.url ? [body.url] : []

    if (urls.length === 0) {
      return NextResponse.json({ error: 'urls_required' }, { status: 400 })
    }

    const result = await submitToIndexNow(urls)
    return NextResponse.json(result, { status: result.ok ? 200 : 502 })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'internal_error' },
      { status: 500 },
    )
  }
}
