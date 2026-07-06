import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { enqueueRotationSocialJobs, isMetaAuthError, processPendingSocialJobs } from '@/lib/social-auto-post'
import {
  clearWorkerStop,
  readWorkerLoopState,
  requestWorkerStop,
  shouldStopWorker,
  workerLoopSnapshot,
  writeWorkerLoopState,
  type WorkerLoopState,
} from '@/lib/social-worker-loop-state'
import { verifyAdminToken } from '@/lib/security'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 800

const BATCH_SLEEP_SECONDS = 45
const RATE_LIMIT_SLEEP_SECONDS = 300
const POLL_COOKIE = 'social_worker_poll'

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

async function sleepWithCountdown(state: WorkerLoopState, seconds: number) {
  state.sleepUntilMs = Date.now() + seconds * 1000
  await writeWorkerLoopState(state)
  while (state.sleepUntilMs > Date.now()) {
    if (await shouldStopWorker()) break
    await sleep(Math.min(1000, state.sleepUntilMs - Date.now()))
  }
  state.sleepUntilMs = 0
  await writeWorkerLoopState(state)
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

  if (provided === expected) return null

  const pollCookie = req.cookies.get(POLL_COOKIE)?.value?.trim()
  if (pollCookie) {
    const state = await readWorkerLoopState()
    if (state.pollToken && pollCookie === state.pollToken) return null
  }

  if (!provided) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const auth = await verifyAdminToken(provided, 'admin.social.write')
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.status === 403 ? 'forbidden' : 'unauthorized' },
      { status: auth.status },
    )
  }
  return null
}

async function runWorkerLoop(
  state: WorkerLoopState,
  options: { rotate: boolean; limit: number; postType?: 'feed' | 'story' | 'reel' },
) {
  await clearWorkerStop()
  state.running = true
  state.stopRequested = false
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
  await writeWorkerLoopState(state)

  try {
    if (options.rotate) {
      const rot = await enqueueRotationSocialJobs({ limit: 0 })
      state.totalEnqueued = rot.enqueued
      await writeWorkerLoopState(state)
    }

    for (;;) {
      if (await shouldStopWorker()) {
        state.phase = 'stopped'
        state.message = 'Worker durduruldu.'
        break
      }

      state.batch += 1
      state.phase = 'running'
      state.message = `${state.batch}. grup işleniyor…`
      await writeWorkerLoopState(state)

      const out = await processPendingSocialJobs({
        limit: options.limit,
        postType: options.postType,
        shouldStop: shouldStopWorker,
      })
      state.totalProcessed += out.processed
      state.totalPosted += out.posted
      state.totalFailed += out.failed
      await writeWorkerLoopState(state)

      const authFail = (out.results ?? []).find((r) => r.error && isMetaAuthError(r.error))
      if (authFail) {
        state.phase = 'error'
        state.message =
          'Meta (Facebook/Instagram) erişim anahtarı geçersiz veya süresi doldu. Yönetim → Sosyal Medya API ayarlarından Page Access Token yenileyin.'
        state.lastError = authFail.error ?? 'meta_access_token_invalid'
        break
      }

      if (await shouldStopWorker()) {
        state.phase = 'stopped'
        state.message = 'Worker durduruldu.'
        break
      }

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
        await writeWorkerLoopState(state)
        await sleepWithCountdown(state, RATE_LIMIT_SLEEP_SECONDS)
      } else {
        state.phase = 'waiting'
        state.message =
          out.failed > 0
            ? 'Bir iş başarısız oldu, sonraki gruba geçmeden bekleniyor…'
            : 'Sonraki gruba geçmeden bekleniyor…'
        await writeWorkerLoopState(state)
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
    state.stopRequested = false
    state.sleepUntilMs = 0
    state.finishedAt = new Date().toISOString()
    state.pollToken = null
    await writeWorkerLoopState(state)
    await clearWorkerStop()
  }
}

export async function POST(req: NextRequest) {
  const authError = await authWorkerOrAdmin(req)
  if (authError) return authError

  const state = await readWorkerLoopState()
  const limitRaw = req.nextUrl.searchParams.get('limit')
  const limit = limitRaw ? Math.min(3, Math.max(1, Number.parseInt(limitRaw, 10) || 1)) : 1
  const rotate = req.nextUrl.searchParams.get('rotate') === '1'
  const postTypeRaw = (req.nextUrl.searchParams.get('post_type') ?? '').trim().toLowerCase()
  const postType =
    postTypeRaw === 'feed' || postTypeRaw === 'story' || postTypeRaw === 'reel'
      ? postTypeRaw
      : undefined

  if (state.running) {
    return NextResponse.json({ ok: true, started: false, ...workerLoopSnapshot(state) }, { status: 200 })
  }

  const pollToken = randomUUID()
  state.pollToken = pollToken
  state.running = true
  state.phase = 'running'
  state.message = 'Arka plan sosyal worker başlatılıyor…'
  state.startedAt = new Date().toISOString()
  await writeWorkerLoopState(state)

  void runWorkerLoop(state, { limit, rotate, postType })

  const res = NextResponse.json(
    { ok: true, started: true, ...workerLoopSnapshot({ ...state, running: true, phase: 'running' }) },
    { status: 202 },
  )
  res.cookies.set(POLL_COOKIE, pollToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24,
  })
  return res
}

export async function GET(req: NextRequest) {
  const authError = await authWorkerOrAdmin(req)
  if (authError) return authError
  const state = await readWorkerLoopState()
  return NextResponse.json({ ok: true, ...workerLoopSnapshot(state) }, { status: 200 })
}

export async function DELETE(req: NextRequest) {
  const authError = await authWorkerOrAdmin(req)
  if (authError) return authError

  await requestWorkerStop()
  const state = await readWorkerLoopState()

  const res = NextResponse.json(
    { ok: true, ...workerLoopSnapshot(state) },
    { status: 200 },
  )
  res.cookies.delete(POLL_COOKIE)
  return res
}
