/**
 * /api/manage/sync/[provider]
 *
 * POST — import işini başlat (job oluştur + arka planda script başlat)
 * GET  — son iş durumunu döndür
 *
 * Provider değerleri: wtatil | travelrobot | turna | yolcu360
 */

import { NextRequest, NextResponse } from 'next/server'
import { apiOriginForFetch } from '@/lib/api-origin'
import { requireAdminPermission } from '@/lib/api-require-admin'
import { cookies } from 'next/headers'
import { spawn } from 'node:child_process'
import path from 'node:path'
import fs from 'node:fs'

export const dynamic = 'force-dynamic'

const PROVIDER_SCRIPTS: Record<string, string> = {
  wtatil: 'scripts/sync-wtatil-auto.mjs',
  travelrobot: 'scripts/import-travelrobot-tours.mjs',
  turna: 'scripts/import-turna-flights.mjs',
  yolcu360: 'scripts/import-yolcu360-cars.mjs',
}

async function getToken(): Promise<string | null> {
  const jar = await cookies()
  return jar.get('travel_auth_token')?.value ?? null
}

function resolveScriptPath(scriptRel: string): string | null {
  // Next.js cwd genelde frontend/ altında çalışır; script köküne çık
  const bases = [
    path.resolve(process.cwd(), '..', scriptRel),   // frontend/ → repo kökü
    path.resolve(process.cwd(), scriptRel),           // doğrudan
    path.resolve(process.cwd(), '..', '..', scriptRel), // alt dizinden yukarı
  ]
  for (const p of bases) {
    if (fs.existsSync(p)) return p
  }
  return null
}

async function createJob(provider: string, token: string, apiBase: string): Promise<string | null> {
  try {
    const res = await fetch(`${apiBase}/api/v1/admin/sync/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ provider }),
      cache: 'no-store',
    })
    if (!res.ok) return null
    const data = await res.json() as { id?: string }
    return data.id ?? null
  } catch {
    return null
  }
}

function startScript(scriptPath: string, jobId: string, apiBase: string): void {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    SYNC_JOB_ID: jobId,
    INTERNAL_API_ORIGIN: apiBase,
    NODE_ENV: process.env.NODE_ENV ?? 'production',
  }

  const child = spawn('node', [scriptPath], {
    env,
    detached: true,
    stdio: 'ignore',
  })
  child.unref()
}

/** POST /api/manage/sync/[provider] — import başlat */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const authErr = await requireAdminPermission('admin.users.read')
  if (authErr) return authErr

  const { provider } = await params
  const scriptRel = PROVIDER_SCRIPTS[provider]
  if (!scriptRel) {
    return NextResponse.json({ error: 'unknown_provider' }, { status: 400 })
  }

  const token = await getToken()
  if (!token) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const apiBase = apiOriginForFetch() || 'http://127.0.0.1:8080'

  const jobId = await createJob(provider, token, apiBase)
  if (!jobId) {
    return NextResponse.json({ error: 'job_create_failed' }, { status: 500 })
  }

  const scriptPath = resolveScriptPath(scriptRel)
  if (!scriptPath) {
    return NextResponse.json({
      error: 'script_not_found',
      hint: `Script bulunamadı: ${scriptRel}. Sunucuda scripts/ klasörünü kontrol edin.`,
      job_id: jobId,
    }, { status: 500 })
  }

  startScript(scriptPath, jobId, apiBase)

  return NextResponse.json({ ok: true, job_id: jobId })
}

/** GET /api/manage/sync/[provider] — son iş durumu */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const authErr = await requireAdminPermission('admin.users.read')
  if (authErr) return authErr

  const { provider } = await params
  const token = await getToken()
  if (!token) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const apiBase = apiOriginForFetch() || 'http://127.0.0.1:8080'
  try {
    const res = await fetch(
      `${apiBase}/api/v1/admin/sync/status?provider=${encodeURIComponent(provider)}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      },
    )
    const data = await res.text()
    return new NextResponse(data, {
      status: res.status,
      headers: { 'content-type': 'application/json' },
    })
  } catch {
    return NextResponse.json({ error: 'upstream_unreachable' }, { status: 502 })
  }
}
