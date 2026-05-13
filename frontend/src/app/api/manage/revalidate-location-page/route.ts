import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { AUTH_COOKIE_NAME } from '@/lib/auth-cookie'
import { revalidateLocationPagePaths } from '@/lib/revalidate-location-page'

export const dynamic = 'force-dynamic'

/**
 * Oturumu olan kullanıcı — bölge kaydı güncellenince vitrin `[locale]/…/[...slug]`
 * RSC önbelleğini tazelemek için (panel PATCH’ten sonra).
 */
export async function POST(req: NextRequest) {
  const jar = await cookies()
  if (!jar.get(AUTH_COOKIE_NAME)?.value) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 })
  }

  const slug_path =
    body != null &&
    typeof body === 'object' &&
    'slug_path' in body &&
    typeof (body as { slug_path?: unknown }).slug_path === 'string'
      ? (body as { slug_path: string }).slug_path.trim()
      : ''

  if (!slug_path) {
    return NextResponse.json({ ok: false, error: 'slug_path_required' }, { status: 400 })
  }

  try {
    revalidateLocationPagePaths(slug_path)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'revalidate_failed'
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
