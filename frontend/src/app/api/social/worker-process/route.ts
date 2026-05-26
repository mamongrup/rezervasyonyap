/**
 * POST /api/social/worker-process
 *
 * Bekleyen sosyal paylaşım işlerini işler (Facebook, Instagram, Pinterest).
 * Cron / systemd ile çağrılır.
 *
 * Header: x-travel-social-worker-secret: TRAVEL_SOCIAL_WORKER_SECRET
 * Query: limit=5 (isteğe bağlı, max 20)
 */

import { NextRequest, NextResponse } from 'next/server'
import { processPendingSocialJobs } from '@/lib/social-auto-post'

export async function POST(req: NextRequest) {
  const expected = (process.env.TRAVEL_SOCIAL_WORKER_SECRET ?? '').trim()
  if (!expected) {
    return NextResponse.json({ error: 'worker_secret_not_configured' }, { status: 503 })
  }

  const provided =
    req.headers.get('x-travel-social-worker-secret')?.trim() ??
    req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim() ??
    ''

  if (!provided || provided !== expected) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const limitRaw = req.nextUrl.searchParams.get('limit')
  const limit = limitRaw ? Math.min(20, Math.max(1, Number.parseInt(limitRaw, 10) || 5)) : 5

  try {
    const out = await processPendingSocialJobs({ limit })
    return NextResponse.json({ ok: true, ...out })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  return POST(req)
}
