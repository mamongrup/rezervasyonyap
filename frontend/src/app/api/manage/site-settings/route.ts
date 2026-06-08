import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { apiOriginForFetch } from '@/lib/api-origin'
import { requireAdminPermission } from '@/lib/api-require-admin'

export const dynamic = 'force-dynamic'

async function panelAuthToken(): Promise<string | null> {
  const jar = await cookies()
  return jar.get('travel_auth_token')?.value ?? null
}

/**
 * GET /api/manage/site-settings?key=&scope=platform
 * HttpOnly cookie ile site ayarı okuma.
 */
export async function GET(req: NextRequest) {
  const authErr = await requireAdminPermission('admin.users.read')
  if (authErr) return authErr

  const token = await panelAuthToken()
  if (!token) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const apiBase = apiOriginForFetch()
  if (!apiBase) {
    return NextResponse.json({ error: 'api_origin_missing' }, { status: 500 })
  }

  const qs = req.nextUrl.searchParams.toString()
  const upstream = await fetch(
    `${apiBase}/api/v1/site/settings${qs ? `?${qs}` : ''}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    },
  ).catch(() => null)

  if (!upstream) {
    return NextResponse.json({ error: 'upstream_unreachable' }, { status: 502 })
  }

  const text = await upstream.text()
  return new NextResponse(text, {
    status: upstream.status,
    headers: { 'content-type': upstream.headers.get('content-type') ?? 'application/json' },
  })
}

/**
 * PUT /api/manage/site-settings — HttpOnly cookie ile site ayarı kaydı.
 * Panelde localStorage token boş olsa bile oturum çerezi yeterli olur.
 */
export async function PUT(req: NextRequest) {
  const authErr = await requireAdminPermission('admin.users.read')
  if (authErr) return authErr

  const token = await panelAuthToken()
  if (!token) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const apiBase = apiOriginForFetch()
  if (!apiBase) {
    return NextResponse.json({ error: 'api_origin_missing' }, { status: 500 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const upstream = await fetch(`${apiBase}/api/v1/site/settings`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  }).catch(() => null)

  if (!upstream) {
    return NextResponse.json({ error: 'upstream_unreachable' }, { status: 502 })
  }

  const text = await upstream.text()
  return new NextResponse(text, {
    status: upstream.status,
    headers: { 'content-type': upstream.headers.get('content-type') ?? 'application/json' },
  })
}
