/**
 * POST /api/social/worker-process
 *
 * Bekleyen sosyal paylaşım işlerini işler (Facebook, Instagram, Pinterest).
 * Cron / systemd ile çağrılır.
 *
 * Header: x-travel-social-worker-secret: TRAVEL_SOCIAL_WORKER_SECRET
 * Query: limit=5 (isteğe bağlı, max 5)
 * Query: rotate=1 — döngü kuyruğu ekler (varsayılan: kapalı; bekleyenleri boşaltırken açmayın)
 */

import { NextRequest, NextResponse } from 'next/server'
import { enqueueRotationSocialJobs, processPendingSocialJobs } from '@/lib/social-auto-post'
import { verifyAdminToken } from '@/lib/security'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function POST(req: NextRequest) {
  const expected = (process.env.TRAVEL_SOCIAL_WORKER_SECRET ?? '').trim()
  if (!expected) {
    return NextResponse.json({ error: 'worker_secret_not_configured' }, { status: 503 })
  }

  const provided =
    req.headers.get('x-travel-social-worker-secret')?.trim() ??
    req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim() ??
    ''

  if (!provided) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  if (provided !== expected) {
    const auth = await verifyAdminToken(provided, 'admin.social.write')
    if (!auth.ok) {
      return NextResponse.json(
        { error: auth.status === 403 ? 'forbidden' : 'unauthorized' },
        { status: auth.status },
      )
    }
  }

  const limitRaw = req.nextUrl.searchParams.get('limit')
  // Meta image upload + carousel publish can take long; keep each HTTP request
  // small and let the caller loop, otherwise nginx/Next returns 504.
  const limit = limitRaw ? Math.min(3, Math.max(1, Number.parseInt(limitRaw, 10) || 3)) : 3
  const rotate = req.nextUrl.searchParams.get('rotate') === '1'
  const postTypeRaw = (req.nextUrl.searchParams.get('post_type') ?? '').trim().toLowerCase()
  const postType =
    postTypeRaw === 'feed' || postTypeRaw === 'story' || postTypeRaw === 'reel'
      ? postTypeRaw
      : undefined

  try {
    let enqueued = 0
    if (rotate) {
      const rot = await enqueueRotationSocialJobs({ limit: 0 })
      enqueued = rot.enqueued
    }
    const out = await processPendingSocialJobs({ limit, postType })
    return NextResponse.json({ ok: true, enqueued, ...out })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  return POST(req)
}
