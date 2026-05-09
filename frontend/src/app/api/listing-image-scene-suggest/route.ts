import { createHash } from 'node:crypto'
import { constants as fsConstants, promises as fs } from 'node:fs'
import path from 'node:path'
import { apiOriginForFetch } from '@/lib/api-origin'
import {
  isListingImageSceneAiCode,
  LISTING_IMAGE_SCENE_AI_CODES,
} from '@/lib/listing-image-scenes'
import { resolveDeepseekConfigForManage } from '@/lib/manage-deepseek-config'
import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'

const ADMIN_PERM = 'admin.users.read'

const RATE_WINDOW_MS = 60_000
const RATE_MAX_PER_WINDOW = 18
const rateBuckets = new Map<string, { n: number; t: number }>()

function rateLimitKey(req: NextRequest, token: string): string {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  const tok = createHash('sha256').update(token).digest('hex').slice(0, 16)
  return `${ip}:${tok}`
}

function checkRateLimit(key: string): { ok: boolean; retryAfterSec?: number } {
  const now = Date.now()
  const b = rateBuckets.get(key)
  if (!b || now - b.t >= RATE_WINDOW_MS) {
    rateBuckets.set(key, { n: 1, t: now })
    if (rateBuckets.size > 10_000) {
      for (const [k, v] of rateBuckets) {
        if (now - v.t >= RATE_WINDOW_MS * 2) rateBuckets.delete(k)
      }
    }
    return { ok: true }
  }
  if (b.n >= RATE_MAX_PER_WINDOW) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((RATE_WINDOW_MS - (now - b.t)) / 1000)),
    }
  }
  b.n += 1
  return { ok: true }
}

async function userHasAdminAi(token: string): Promise<boolean> {
  const apiBase = apiOriginForFetch()
  if (!apiBase) return false
  try {
    const r = await fetch(`${apiBase}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
    if (!r.ok) return false
    const data = (await r.json()) as { permissions?: string[] }
    return Array.isArray(data.permissions) && data.permissions.includes(ADMIN_PERM)
  } catch {
    return false
  }
}

function safeListingImageStoragePath(raw: string): string | null {
  const t = raw.trim().replace(/^\/+/, '').replace(/\\/g, '/')
  if (!t.startsWith('uploads/listings/')) return null
  const normalized = path.normalize(t).replace(/\\/g, '/')
  if (normalized.includes('..') || !normalized.startsWith('uploads/listings/')) return null
  if (!/^uploads\/listings\/[a-zA-Z0-9/_\-]+\.(avif|webp|jpe?g|png)$/i.test(normalized)) {
    return null
  }
  return normalized
}

function extractJsonObject(raw: string): Record<string, unknown> | null {
  const t = raw.trim()
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/m.exec(t)
  const inner = fence?.[1]?.trim() ? fence[1].trim() : t
  try {
    const o = JSON.parse(inner) as unknown
    return typeof o === 'object' && o !== null && !Array.isArray(o)
      ? (o as Record<string, unknown>)
      : null
  } catch {
    const m = /\{[\s\S]*\}/.exec(inner)
    if (!m) return null
    try {
      const o = JSON.parse(m[0]) as unknown
      return typeof o === 'object' && o !== null && !Array.isArray(o)
        ? (o as Record<string, unknown>)
        : null
    } catch {
      return null
    }
  }
}

type VisionMode = 'auto' | 'deepseek' | 'openai'

function listingSceneVisionMode(): VisionMode {
  const p = process.env.LISTING_SCENE_VISION_PROVIDER?.trim().toLowerCase()
  if (p === 'openai') return 'openai'
  if (p === 'deepseek') return 'deepseek'
  return 'auto'
}

function visionTimeoutMs(fallbackFromDeepseek?: number): number {
  const raw =
    process.env.LISTING_SCENE_VISION_TIMEOUT_MS?.trim() ||
    process.env.OPENAI_IMAGE_SCENE_TIMEOUT_MS?.trim() ||
    ''
  const n = Number.parseInt(raw, 10)
  if (Number.isFinite(n) && n >= 5000) return n
  if (fallbackFromDeepseek != null && Number.isFinite(fallbackFromDeepseek)) return fallbackFromDeepseek
  return 45_000
}

/** Çeviri için seçilen metin modeli görüntü kabul etmiyorsa çok modlu deneme için güvenli varsayılan. */
function deepseekSceneModel(baseModel: string): string {
  const override = process.env.DEEPSEEK_IMAGE_SCENE_MODEL?.trim()
  if (override) return override
  const low = baseModel.trim().toLowerCase()
  if (low === 'deepseek-chat' || low === 'deepseek-reasoner') return 'deepseek-v4-flash'
  return baseModel.trim()
}

type VisionUpstream =
  | { provider: 'deepseek'; apiKey: string; model: string; url: string; timeoutMs: number }
  | { provider: 'openai'; apiKey: string; model: string; timeoutMs: number }

async function resolveVisionUpstream(token: string): Promise<VisionUpstream | null> {
  const mode = listingSceneVisionMode()
  const oaiKey = process.env.OPENAI_API_KEY?.trim()
  const oaiModel = process.env.OPENAI_IMAGE_SCENE_MODEL?.trim() || 'gpt-4o-mini'

  const ds = await resolveDeepseekConfigForManage(token)

  if (mode === 'deepseek') {
    if (!ds) return null
    return {
      provider: 'deepseek',
      apiKey: ds.apiKey,
      model: deepseekSceneModel(ds.model),
      url: ds.url,
      timeoutMs: visionTimeoutMs(ds.timeoutMs),
    }
  }

  if (mode === 'openai') {
    if (!oaiKey) return null
    return {
      provider: 'openai',
      apiKey: oaiKey,
      model: oaiModel,
      timeoutMs: visionTimeoutMs(),
    }
  }

  if (ds) {
    return {
      provider: 'deepseek',
      apiKey: ds.apiKey,
      model: deepseekSceneModel(ds.model),
      url: ds.url,
      timeoutMs: visionTimeoutMs(ds.timeoutMs),
    }
  }

  if (oaiKey) {
    return {
      provider: 'openai',
      apiKey: oaiKey,
      model: oaiModel,
      timeoutMs: visionTimeoutMs(),
    }
  }

  return null
}

type Body = { storage_key?: string }

async function runVisionCompletion(opts: {
  upstream: VisionUpstream
  prompt: string
  jpegBase64: string
  signal: AbortSignal
}): Promise<{ raw: string; provider: string }> {
  const { upstream, prompt, jpegBase64, signal } = opts
  const dataUri = `data:image/jpeg;base64,${jpegBase64}`

  const imagePart =
    upstream.provider === 'openai'
      ? ({
          type: 'image_url',
          image_url: { url: dataUri, detail: 'low' as const },
        } as const)
      : ({
          type: 'image_url',
          image_url: { url: dataUri },
        } as const)

  const body: Record<string, unknown> = {
    model: upstream.model,
    temperature: 0.15,
    max_tokens: 180,
    messages: [
      {
        role: 'user',
        content: [{ type: 'text', text: prompt }, imagePart],
      },
    ],
  }

  if (upstream.provider === 'deepseek') {
    body.response_format = { type: 'json_object' }
  }

  const url =
    upstream.provider === 'openai'
      ? 'https://api.openai.com/v1/chat/completions'
      : upstream.url

  const res = await fetch(url, {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${upstream.apiKey}`,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const errText = await res.text()
    console.error('[listing-image-scene-suggest]', upstream.provider, res.status, errText)
    throw new Error(`${upstream.provider}_error:${res.status}`)
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  const raw = data.choices?.[0]?.message?.content?.trim() ?? ''
  return { raw, provider: upstream.provider }
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const token = cookieStore.get('travel_auth_token')?.value
  if (!token) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  if (!(await userHasAdminAi(token))) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const rl = checkRateLimit(rateLimitKey(req, token))
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'rate_limited', retryAfterSec: rl.retryAfterSec },
      {
        status: 429,
        headers: rl.retryAfterSec ? { 'Retry-After': String(rl.retryAfterSec) } : undefined,
      },
    )
  }

  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  const rel = typeof body.storage_key === 'string' ? safeListingImageStoragePath(body.storage_key) : null
  if (!rel) {
    return NextResponse.json({ error: 'invalid_storage_key' }, { status: 400 })
  }

  const abs = path.join(process.cwd(), 'public', rel)
  try {
    await fs.access(abs, fsConstants.R_OK)
  } catch {
    return NextResponse.json({ error: 'image_not_found' }, { status: 404 })
  }

  const upstream = await resolveVisionUpstream(token)
  if (!upstream) {
    return NextResponse.json(
      {
        error: 'vision_not_configured',
        message:
          'Görüntülü sahne önerisi için DeepSeek (DEEPSEEK_API_KEY veya Ayarlar → Yapay zeka) veya OPENAI_API_KEY gerekir. Varsayılan: önce DeepSeek.',
      },
      { status: 503 },
    )
  }

  let jpegBase64: string
  try {
    const input = await fs.readFile(abs)
    const buf = await sharp(input)
      .rotate()
      .resize({ width: 1024, height: 1024, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 82 })
      .toBuffer()
    jpegBase64 = buf.toString('base64')
  } catch (e) {
    console.error('[listing-image-scene-suggest] sharp:', e)
    return NextResponse.json({ error: 'image_process_failed' }, { status: 422 })
  }

  const allowed = LISTING_IMAGE_SCENE_AI_CODES.join('|')
  const prompt = `Bu fotoğraf bir tatil konutu / villa ilanı galerisinden. Tek bir sahne kodu seç.
İzinli kodlar (tam eşleşme): ${allowed}.
Anlam eşlemesi: deniz, manzara, terastan uzak görünüm → sea_view; havuz, jakuzi dış mekan → pool; salon, oturma odası, mutfak, yemek alanı → living; yatak odası → bedroom; banyo, WC, duş → bathroom; sauna → sauna; hamam / Türk hamamı → hammam; spa spor salonu buna uymuyorsa unspecified.
Birden fazla sahne varsa baskın olanı seç. Metin/kaplama yoksa görsel içeriğe bak.
Yanıt YALNIZCA tek bir JSON nesnesi: {"scene_code":"<kod>","note_tr":"kısa Türkçe bir satır (isteğe bağlı)"}
İngilizce kod dışında başka şey yazma.`

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), upstream.timeoutMs)

  try {
    let completion: { raw: string; provider: string }
    try {
      completion = await runVisionCompletion({
        upstream,
        prompt,
        jpegBase64,
        signal: controller.signal,
      })
    } catch (firstErr) {
      const oaiKey = process.env.OPENAI_API_KEY?.trim()
      const fallback =
        upstream.provider === 'deepseek' &&
        listingSceneVisionMode() === 'auto' &&
        oaiKey &&
        process.env.LISTING_SCENE_VISION_FALLBACK_OPENAI?.trim() === '1'

      if (!fallback) throw firstErr

      console.warn('[listing-image-scene-suggest] DeepSeek başarısız, OpenAI yedeği deneniyor')
      const oaiUpstream: VisionUpstream = {
        provider: 'openai',
        apiKey: oaiKey,
        model: process.env.OPENAI_IMAGE_SCENE_MODEL?.trim() || 'gpt-4o-mini',
        timeoutMs: upstream.timeoutMs,
      }
      completion = await runVisionCompletion({
        upstream: oaiUpstream,
        prompt,
        jpegBase64,
        signal: controller.signal,
      })
    }

    const parsed = extractJsonObject(completion.raw)
    const codeRaw = typeof parsed?.scene_code === 'string' ? parsed.scene_code.trim() : ''
    const scene_code =
      codeRaw && isListingImageSceneAiCode(codeRaw) ? codeRaw : ('unspecified' as const)
    const note_tr = typeof parsed?.note_tr === 'string' ? parsed.note_tr.trim() : ''

    return NextResponse.json({
      scene_code,
      note_tr: note_tr || undefined,
      provider: completion.provider,
    })
  } catch (e) {
    const name = e instanceof Error ? e.name : ''
    if (name === 'AbortError') {
      return NextResponse.json({ error: 'upstream_timeout', timeoutMs: upstream.timeoutMs }, { status: 504 })
    }
    const msg = e instanceof Error ? e.message : ''
    if (msg.includes('deepseek_error') || msg.includes('openai_error')) {
      return NextResponse.json({ error: 'upstream_error', detail: msg }, { status: 502 })
    }
    console.error('[listing-image-scene-suggest]', e)
    return NextResponse.json({ error: 'network_error' }, { status: 502 })
  } finally {
    clearTimeout(timer)
  }
}
