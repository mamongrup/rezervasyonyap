import { NextRequest, NextResponse } from 'next/server'
import { requireAdminCookie } from '@/lib/api-require-admin'
import { apiOriginForFetch } from '@/lib/api-origin'

export const dynamic = 'force-dynamic'

function upstreamBase(): string {
  return apiOriginForFetch()
}

async function proxyToBackend(req: NextRequest, id: string): Promise<NextResponse> {
  const authErr = await requireAdminCookie()
  if (authErr) return authErr

  const b = upstreamBase()
  if (!b) {
    return NextResponse.json(
      { ok: false, error: 'NEXT_PUBLIC_API_URL tanımlı değil; Gleam API adresi .env içinde olmalı.' },
      { status: 500 },
    )
  }

  const safeId = encodeURIComponent(id)
  const target = `${b}/api/v1/marketing/holiday-packages/${safeId}`
  const auth = req.headers.get('authorization')
  const cookie = req.headers.get('cookie') ?? ''
  const headers: Record<string, string> = {}
  if (auth) headers.Authorization = auth
  if (cookie) headers.Cookie = cookie

  const method = req.method
  const hasBody = method !== 'GET' && method !== 'HEAD'
  const res = await fetch(target, {
    method,
    headers: {
      ...headers,
      ...(hasBody ? { 'Content-Type': req.headers.get('content-type') ?? 'application/json' } : {}),
    },
    body: hasBody ? await req.text() : undefined,
    cache: 'no-store',
  })

  const text = await res.text()
  const ct = res.headers.get('content-type') ?? 'application/json; charset=utf-8'
  return new NextResponse(text, {
    status: res.status,
    headers: {
      'Content-Type': ct,
      'Cache-Control': 'no-store',
    },
  })
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  return proxyToBackend(req, id)
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  return proxyToBackend(req, id)
}
