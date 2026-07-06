import { NextRequest, NextResponse } from 'next/server'
import { enqueueRotationSocialJobs, processPendingSocialJobs } from '@/lib/social-auto-post'
import { verifyAdminToken } from '@/lib/security'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

const BATCH_SLEEP_SECONDS = 90
const RATE_LIMIT_SLEEP_SECONDS = 300

type WorkerLoopPhase =
  | 'idle'
  | 'running'
  | 'waiting'
  | 'rate_limited'
  | 'done'
  | 'error'

type WorkerLoopState = {
  running: boolean
  phase: WorkerLoopPhase
  batch: number
  totalProcessed: number
  totalPosted: number
  totalFailed: number
  totalEnqueued: number
  message: string | null
  lastError: string | null
  sleepUntilMs: number
  startedAt: string | null
  finishedAt: string | null
}

const WORKER_LOOP_STATE_KEY = '__travel_social_worker_loop_state__'

function getLoopState(): WorkerLoopState {
  const g = globalThis as Record<string, unknown>
  const existing = g[WORKER_LOOP_STATE_KEY] as WorkerLoopState | undefined
  if (existing) return existing
  const created: WorkerLoopState = {
    running: false,
    phase: 'idle',
    batch: 0,
    totalProcessed: 0,
    totalPosted: 0,
    totalFailed: 0,
    totalEnqueued: 0,
    message: null,
    lastError: null,
    sleepUntilMs: 0,
    startedAt: null,
    finishedAt: null,
  }
  g[WORKER_LOOP_STATE_KEY] = created
  return created
}

function snapshot(state: WorkerLoopState) {
  const now = Date.now()
  const countdown = state.sleepUntilMs > now ? Math.ceil((state.sleepUntilMs - now) / 1000) : 0
  return {
    ...state,
    countdown,
  }
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

async function sleepWithCountdown(state: WorkerLoopState, seconds: number) {
  state.sleepUntilMs = Date.now() + seconds * 1000
  while (state.sleepUntilMs > Date.now()) {
    await sleep(Math.min(1000, state.sleepUntilMs - Date.now()))
  }
  state.sleepUntilMs = 0
}

async function authWorkerOrAdmin(req: NextRequest): Promise<NextResponse | null> {
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
  return null
}

async function runWorkerLoop(
  state: WorkerLoopState,
  options: { rotate: boolean; limit: number; postType?: 'feed' | 'story' | 'reel' },
) {
  if (state.running) return

  state.running = true
  state.phase = 'running'
  state.batch = 0
  state.totalProcessed = 0
  state.totalPosted = 0
  state.totalFailed = 0
  state.totalEnqueued = 0
  state.message = 'Arka plan sosyal worker başlatıldı.'
  state.lastError = null
  state.sleepUntilMs = 0
  state.startedAt = new Date().toISOString()
  state.finishedAt = null

  try {
    if (options.rotate) {
      const rot = await enqueueRotationSocialJobs({ limit: 0 })
      state.totalEnqueued = rot.enqueued
    }

    for (;;) {
      state.batch += 1
      state.phase = 'running'
      state.message = `${state.batch}. grup işleniyor…`

      const out = await processPendingSocialJobs({ limit: options.limit, postType: options.postType })
      state.totalProcessed += out.processed
      state.totalPosted += out.posted
      state.totalFailed += out.failed

      if (out.processed === 0) {
        state.phase = 'done'
        state.message = 'Bekleyen iş kalmadı.'
        break
      }

      const failedResult = (out.results ?? []).find((r) => !r.ok)
      const rateLimited =
        out.processed > 0 &&
        out.posted === 0 &&
        out.failed === 0 &&
        Boolean(failedResult)

      if (rateLimited) {
        state.phase = 'rate_limited'
        state.message = `Platform limiti tespit edildi (${failedResult?.error ?? 'rate limit'}). Bekleniyor…`
        await sleepWithCountdown(state, RATE_LIMIT_SLEEP_SECONDS)
      } else {
        state.phase = 'waiting'
        state.message =
          out.failed > 0
            ? 'Bir iş başarısız oldu, sonraki gruba geçmeden bekleniyor…'
            : 'Sonraki gruba geçmeden bekleniyor…'
        await sleepWithCountdown(state, BATCH_SLEEP_SECONDS)
      }
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    state.phase = 'error'
    state.message = msg
    state.lastError = msg
  } finally {
    state.running = false
    state.sleepUntilMs = 0
    state.finishedAt = new Date().toISOString()
  }
}

// POST /api/social/worker-loop?limit=1&rotate=0
// İşi arka plana alır ve hemen döner. UI bu route'un GET'i ile durumu izler.
export async function POST(req: NextRequest) {
  const authError = await authWorkerOrAdmin(req)
  if (authError) return authError

  const state = getLoopState()
  const limitRaw = req.nextUrl.searchParams.get('limit')
  const limit = limitRaw ? Math.min(3, Math.max(1, Number.parseInt(limitRaw, 10) || 1)) : 1
  const rotate = req.nextUrl.searchParams.get('rotate') === '1'
  const postTypeRaw = (req.nextUrl.searchParams.get('post_type') ?? '').trim().toLowerCase()
  const postType =
    postTypeRaw === 'feed' || postTypeRaw === 'story' || postTypeRaw === 'reel'
      ? postTypeRaw
      : undefined

  if (state.running) {
    return NextResponse.json({ ok: true, started: false, ...snapshot(state) }, { status: 200 })
  }

  void runWorkerLoop(state, { limit, rotate, postType })
  return NextResponse.json({ ok: true, started: true, ...snapshot(state) }, { status: 202 })
}

// GET /api/social/worker-loop
// Arka plan worker durumunu döner.
export async function GET(req: NextRequest) {
  const authError = await authWorkerOrAdmin(req)
  if (authError) return authError
  return NextResponse.json({ ok: true, ...snapshot(getLoopState()) }, { status: 200 })
}
