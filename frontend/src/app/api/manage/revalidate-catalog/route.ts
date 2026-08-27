import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { AUTH_COOKIE_NAME } from '@/lib/auth-cookie'
import { revalidateBlogCaches, revalidateListingDetailCaches } from '@/lib/revalidate-catalog'
import { verifyAdminToken } from '@/lib/security'

export const dynamic = 'force-dynamic'

/**
 * Panel ilan/blog/kategori kaydı sonrası vitrin ISR + tag önbelleğini tazeler.
 *
 * Body (hepsi opsiyonel, en az biri gerekir):
 * `{ handle?, category_slug?, detail_segment?, blog_slug?, blog?: true }`
 */
export async function POST(req: NextRequest) {
  const jar = await cookies()
  const tokenFromCookie = jar.get(AUTH_COOKIE_NAME)?.value
  const authHeader = req.headers.get('authorization')
  const tokenFromHeader = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : null
  const token = tokenFromHeader || tokenFromCookie
  const auth = await verifyAdminToken(token)
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: auth.status })
  }

  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 })
  }

  const handle = typeof body.handle === 'string' ? body.handle.trim() : ''
  const categorySlug =
    typeof body.category_slug === 'string' ? body.category_slug.trim() : ''
  const detailSegment =
    typeof body.detail_segment === 'string' ? body.detail_segment.trim() : ''
  const blogSlug = typeof body.blog_slug === 'string' ? body.blog_slug.trim() : ''
  const blogAll = body.blog === true

  if (!handle && !categorySlug && !blogSlug && !blogAll) {
    return NextResponse.json(
      { ok: false, error: 'handle_or_category_or_blog_required' },
      { status: 400 },
    )
  }

  try {
    if (handle || categorySlug) {
      revalidateListingDetailCaches({
        handle: handle || undefined,
        categorySlug: categorySlug || undefined,
        detailSegment: detailSegment || undefined,
      })
    }
    if (blogAll || blogSlug) {
      revalidateBlogCaches(blogSlug || undefined)
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'revalidate_failed'
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
