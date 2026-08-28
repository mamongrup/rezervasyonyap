import { apiOriginForFetch } from '@/lib/api-origin'
import { isListingImageSceneAiCode, LISTING_IMAGE_SCENE_AI_CODES } from '@/lib/listing-image-scenes'
import { resolveDeepseekConfigForManage } from '@/lib/manage-deepseek-config'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'node:crypto'
import { promises as fs, constants as fsConstants } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

export const runtime = 'nodejs'

const ADMIN_PERM = 'admin.users.read'

const RATE_WINDOW_MS = 60_000
/** Büyük galeriler (50–90 görsel) tek, sıralı panel işi olarak tamamlanabilsin. */
const RATE_MAX_PER_WINDOW = 90
const rateBuckets = new Map<string, { n: number; t: number }>()

function rateLimitKey(req: NextRequest, token: string): string {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown'
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
    return typeof o === 'object' && o !== null && !Array.isArray(o) ? (o as Record<string, unknown>) : null
  } catch {
    const m = /\{[\s\S]*\}/.exec(inner)
    if (!m) return null
    try {
      const o = JSON.parse(m[0]) as unknown
      return typeof o === 'object' && o !== null && !Array.isArray(o) ? (o as Record<string, unknown>) : null
    } catch {
      return null
    }
  }
}

type VisionMode = 'auto' | 'gemini' | 'deepseek' | 'openai'

function listingSceneVisionMode(): VisionMode {
  const p = process.env.LISTING_SCENE_VISION_PROVIDER?.trim().toLowerCase()
  if (p === 'gemini') return 'gemini'
  if (p === 'openai') return 'openai'
  if (p === 'deepseek') return 'deepseek'
  return 'auto'
}

function visionTimeoutMs(fallbackFromDeepseek?: number): number {
  const raw =
    process.env.LISTING_SCENE_VISION_TIMEOUT_MS?.trim() || process.env.OPENAI_IMAGE_SCENE_TIMEOUT_MS?.trim() || ''
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
  | { provider: 'gemini'; timeoutMs: number }
  | { provider: 'deepseek'; apiKey: string; model: string; url: string; timeoutMs: number }
  | { provider: 'openai'; apiKey: string; model: string; timeoutMs: number }

async function resolveVisionUpstream(token: string): Promise<VisionUpstream | null> {
  const mode = listingSceneVisionMode()
  const oaiKey = process.env.OPENAI_API_KEY?.trim()
  const oaiModel = process.env.OPENAI_IMAGE_SCENE_MODEL?.trim() || 'gpt-5.6-luna'

  if (mode === 'gemini' || mode === 'auto') {
    return { provider: 'gemini', timeoutMs: visionTimeoutMs() }
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

  if (ds) {
    return {
      provider: 'deepseek',
      apiKey: ds.apiKey,
      model: deepseekSceneModel(ds.model),
      url: ds.url,
      timeoutMs: visionTimeoutMs(ds.timeoutMs),
    }
  }

  return null
}

type Body = { storage_key?: string }

async function runVisionCompletion(opts: {
  upstream: VisionUpstream
  prompt: string
  jpegBase64: string
  token: string
  signal: AbortSignal
}): Promise<{ raw: string; provider: string }> {
  const { upstream, prompt, jpegBase64, token, signal } = opts
  const dataUri = `data:image/jpeg;base64,${jpegBase64}`

  if (upstream.provider === 'gemini') {
    const apiBase = apiOriginForFetch()
    if (!apiBase) throw new Error('gemini_error:api_origin_missing')
    const res = await fetch(`${apiBase}/api/v1/ai/complete`, {
      method: 'POST',
      signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        system: prompt,
        user: 'Bu görselin sahnesini ve kapak uygunluğunu tek bir JSON olarak ver.',
        image_mime: 'image/jpeg',
        image_base64: jpegBase64,
        temperature: 0.1,
        timeout_ms: upstream.timeoutMs,
      }),
    })
    if (!res.ok) {
      const errText = await res.text()
      console.error('[listing-image-scene-suggest] gemini', res.status, errText)
      throw new Error(`gemini_error:${res.status}`)
    }
    const data = (await res.json()) as { text?: string }
    return { raw: data.text?.trim() ?? '', provider: 'gemini' }
  }

  const isOpenAi = upstream.provider === 'openai'
  const body: Record<string, unknown> = isOpenAi
    ? {
        model: upstream.model,
        max_output_tokens: 260,
        text: {
          format: {
            type: 'json_schema',
            name: 'listing_image_analysis',
            strict: true,
            schema: {
              type: 'object',
              properties: {
                scene_code: { type: 'string', enum: LISTING_IMAGE_SCENE_AI_CODES },
                hero_score: { type: 'integer', minimum: 0, maximum: 100 },
                confidence: { type: 'number', minimum: 0, maximum: 1 },
                note_tr: { type: 'string' },
              },
              required: ['scene_code', 'hero_score', 'confidence', 'note_tr'],
              additionalProperties: false,
            },
          },
        },
        input: [
          {
            role: 'user',
            content: [
              { type: 'input_text', text: prompt },
              { type: 'input_image', image_url: dataUri, detail: 'high' },
            ],
          },
        ],
      }
    : {
        model: upstream.model,
        temperature: 0.15,
        max_tokens: 260,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: dataUri } },
            ],
          },
        ],
      }

  const url = isOpenAi ? 'https://api.openai.com/v1/responses' : upstream.url

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
    output_text?: string
    output?: Array<{ content?: Array<{ type?: string; text?: string }> }>
    choices?: Array<{ message?: { content?: string } }>
  }
  const responseText = data.output
    ?.flatMap((item) => item.content ?? [])
    .find((item) => item.type === 'output_text' && typeof item.text === 'string')?.text
  const raw = data.output_text?.trim() ?? responseText?.trim() ?? data.choices?.[0]?.message?.content?.trim() ?? ''
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
      }
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
          'Görüntülü sahne önerisi için sistemde aktif Gemini anahtarı gerekir. OpenAI/DeepSeek yalnızca açıkça seçilirse kullanılır.',
      },
      { status: 503 }
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
  const prompt = `Bu fotoğraf bir tatil konutu, villa, otel veya yat ilanı galerisinden. Görseli emlak/turizm fotoğraf editörü gibi değerlendir.
İzinli kodlar (tam eşleşme): ${allowed}.
Sınıflar: dış cephe/yapının bütünü → exterior; uzak manzara veya deniz → sea_view; yüzme havuzu → pool; teras/balkon/veranda → terrace; bahçe/açık yeşil alan → garden; salon/oturma → living; mutfak → kitchen; yemek masası/alanı → dining; yatak odası → bedroom; banyo/WC/duş/küvet → bathroom; özel spa alanı veya bağımsız jakuzi → spa; sauna → sauna; Türk hamamı → hammam; yakın plan dekorasyon/nesne → detail; hiçbiri → unspecified.
KRİTİK: Banyo içinde bulunan küvet veya jakuzi pool değildir; bathroom seç. Pool yalnızca yüzme havuzu görünüyorsa seçilir. Görselde birden fazla alan varsa en baskın ve en geniş görünen alanı seç.
hero_score alanı 0–100 tam sayı olsun: ilanın kapağı olmaya uygun, geniş açılı, aydınlık, net ve mülkü temsil eden fotoğrafa yüksek; banyo, yakın plan, tekrarlı, karanlık, bulanık veya dar kadraja düşük puan ver. confidence 0–1 arası sayı olsun.
Yanıt YALNIZCA şu JSON biçiminde olsun: {"scene_code":"<kod>","hero_score":0,"confidence":0,"note_tr":"kısa Türkçe gerekçe"}`

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), upstream.timeoutMs)

  try {
    let completion: { raw: string; provider: string }
    try {
      completion = await runVisionCompletion({
        upstream,
        prompt,
        jpegBase64,
        token,
        signal: controller.signal,
      })
    } catch (firstErr) {
      if (listingSceneVisionMode() !== 'auto') throw firstErr
      const oaiKey = process.env.OPENAI_API_KEY?.trim()
      let fallbackUpstream: VisionUpstream | null = null
      if (oaiKey && upstream.provider === 'gemini') {
        fallbackUpstream = {
          provider: 'openai',
          apiKey: oaiKey,
          model: process.env.OPENAI_IMAGE_SCENE_MODEL?.trim() || 'gpt-5.6-luna',
          timeoutMs: upstream.timeoutMs,
        }
      } else if (upstream.provider === 'gemini' || upstream.provider === 'openai') {
        const ds = await resolveDeepseekConfigForManage(token)
        if (ds) {
          fallbackUpstream = {
            provider: 'deepseek',
            apiKey: ds.apiKey,
            model: deepseekSceneModel(ds.model),
            url: ds.url,
            timeoutMs: upstream.timeoutMs,
          }
        }
      }
      if (!fallbackUpstream) throw firstErr

      console.warn(
        `[listing-image-scene-suggest] ${upstream.provider} başarısız, ${fallbackUpstream.provider} yedeği deneniyor`,
      )
      completion = await runVisionCompletion({
        upstream: fallbackUpstream,
        prompt,
        jpegBase64,
        token,
        signal: controller.signal,
      })
    }

    const parsed = extractJsonObject(completion.raw)
    const codeRaw = typeof parsed?.scene_code === 'string' ? parsed.scene_code.trim() : ''
    const scene_code = codeRaw && isListingImageSceneAiCode(codeRaw) ? codeRaw : ('unspecified' as const)
    const note_tr = typeof parsed?.note_tr === 'string' ? parsed.note_tr.trim() : ''
    const heroRaw = typeof parsed?.hero_score === 'number' ? parsed.hero_score : Number(parsed?.hero_score)
    const confidenceRaw = typeof parsed?.confidence === 'number' ? parsed.confidence : Number(parsed?.confidence)
    const hero_score = Number.isFinite(heroRaw) ? Math.max(0, Math.min(100, Math.round(heroRaw))) : 50
    const confidence = Number.isFinite(confidenceRaw) ? Math.max(0, Math.min(1, confidenceRaw)) : undefined

    return NextResponse.json({
      scene_code,
      hero_score,
      confidence,
      note_tr: note_tr || undefined,
      provider: completion.provider,
    })
  } catch (e) {
    const name = e instanceof Error ? e.name : ''
    if (name === 'AbortError') {
      return NextResponse.json({ error: 'upstream_timeout', timeoutMs: upstream.timeoutMs }, { status: 504 })
    }
    const msg = e instanceof Error ? e.message : ''
    if (msg.includes('gemini_error') || msg.includes('deepseek_error') || msg.includes('openai_error')) {
      return NextResponse.json({ error: 'upstream_error', detail: msg }, { status: 502 })
    }
    console.error('[listing-image-scene-suggest]', e)
    return NextResponse.json({ error: 'network_error' }, { status: 502 })
  } finally {
    clearTimeout(timer)
  }
}
