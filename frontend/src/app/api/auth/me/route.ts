import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { apiOriginForFetch } from '@/lib/api-origin'
import { AUTH_COOKIE_NAME } from '@/lib/auth-cookie'

async function authHeader(req: NextRequest): Promise<string> {
  const bearer = req.headers.get('authorization')
  if (bearer) return bearer

  const jar = await cookies()
  const token = jar.get(AUTH_COOKIE_NAME)?.value
  return token ? `Bearer ${token}` : ''
}

export async function GET(req: NextRequest) {
  const base = apiOriginForFetch()
  const authorization = await authHeader(req)

  if (!base) {
    return NextResponse.json({ error: 'api_origin_missing' }, { status: 500 })
  }
  if (!authorization) {
    return NextResponse.json({ error: 'auth_token_missing' }, { status: 401 })
  }

  const upstream = await fetch(`${base}/api/v1/auth/me`, {
    headers: { Authorization: authorization },
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

export async function PATCH(req: NextRequest) {
  const base = apiOriginForFetch()
  const authorization = await authHeader(req)

  if (!base) {
    return NextResponse.json({ error: 'api_origin_missing' }, { status: 500 })
  }
  if (!authorization) {
    return NextResponse.json({ error: 'auth_token_missing' }, { status: 401 })
  }

  const body = await req.text()
  const upstream = await fetch(`${base}/api/v1/auth/me`, {
    method: 'PATCH',
    headers: {
      Authorization: authorization,
      'Content-Type': req.headers.get('content-type') ?? 'application/json',
    },
    body,
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
