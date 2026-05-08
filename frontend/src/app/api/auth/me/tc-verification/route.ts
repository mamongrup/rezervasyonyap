import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { apiOriginForFetch } from '@/lib/api-origin'
import { AUTH_COOKIE_NAME } from '@/lib/auth-cookie'

/** Eski istemci yolu: POST /api/auth/me/tc-verification — yeni yol: /api/auth/tc-verification */

async function authHeader(req: NextRequest): Promise<string> {
  const bearer = req.headers.get('authorization')
  if (bearer) return bearer

  const jar = await cookies()
  const token = jar.get(AUTH_COOKIE_NAME)?.value
  return token ? `Bearer ${token}` : ''
}

export async function POST(req: NextRequest) {
  const base = apiOriginForFetch()
  const authorization = await authHeader(req)

  if (!base) {
    return NextResponse.json({ error: 'api_origin_missing' }, { status: 500 })
  }
  if (!authorization) {
    return NextResponse.json({ error: 'auth_token_missing' }, { status: 401 })
  }

  const body = await req.text()
  const upstream = await fetch(`${base}/api/v1/auth/me/tc-verification`, {
    method: 'POST',
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
