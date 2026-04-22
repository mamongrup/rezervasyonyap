import { createHash } from 'node:crypto'
import { apiOriginForFetch } from '@/lib/api-origin'
import { resolveTranslatorTimeoutMs } from '@/lib/ai-upstream-timeouts'
import { defaultLocale, isAppLocale } from '@/lib/i18n-config'
import { SITE_LOCALE_CATALOG } from '@/lib/i18n-catalog-locales'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

type TranslateBody = {
  text: string
  targetLocale: string
  sourceLocale?: string
  context?: 'title' | 'excerpt' | 'body' | 'seo' | 'short_label'
  /** Bölge / sayfa yolu — içerik polish modunda iç link önerisi için (ör. turkiye/antalya) */
  pageSlug?: string
}

/** Site `SITE_LOCALE_CATALOG` ile aynı; model prompt’unda dil adı olarak kullanılır. */
const LOCALE_NAMES: Record<string, string> = Object.fromEntries(
  SITE_LOCALE_CATALOG.map((c) => [c.code, c.name]),
) as Record<string, string>

/** Sadece bu dil kodları kabul edilir (prompt enjeksiyonu / rastgele string önlemi). */
const ALLOWED_LOCALE_CODES = new Set<string>(SITE_LOCALE_CATALOG.map((c) => c.code))

function localeName(code: string) {
  return LOCALE_NAMES[code] ?? code.toUpperCase()
}

/** Eski istemciler / varyantlar: zh-CN, zh-TW → site kodu `zh`. */
function canonicalLocaleCode(raw: string): string | null {
  const s = raw.trim()
  if (!s) return null
  const lower = s.toLowerCase()
  if (lower === 'zh-cn' || lower === 'zh-tw') return 'zh'
  if (ALLOWED_LOCALE_CODES.has(s)) return s
  if (ALLOWED_LOCALE_CODES.has(lower)) return lower
  if (isAppLocale(lower)) return lower
  return null
}

const VALID_CONTEXTS = new Set(['title', 'excerpt', 'body', 'seo', 'short_label'])

/** Blog yönetimi ile aynı: `blog_http` `admin_gate.require_admin_users_read`. */
const ADMIN_TRANSLATE_PERM = 'admin.users.read'

/** Aşırı yük / maliyet önlemi (tek istek). */
const MAX_TEXT_CHARS = 100_000

/** JSON gövdesi üst sınırı (byte, Content-Length varsa erken red). */
const MAX_BODY_BYTES = 512 * 1024

/** Aynı kullanıcı (IP + token özeti) için pencere başına en fazla istek. */
const RATE_WINDOW_MS = 60_000
const RATE_MAX_PER_WINDOW = 24
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

function maxTokensForContext(ctx: string): number {
  switch (ctx) {
    case 'short_label':
      return 256
    case 'title':
      return 1024
    case 'seo':
      return 2048
    case 'excerpt':
      return 4096
    default:
      return 32_768
  }
}

async function userHasAdminTranslate(token: string): Promise<boolean> {
  const apiBase = apiOriginForFetch()
  if (!apiBase) return false
  try {
    const r = await fetch(`${apiBase}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
    if (!r.ok) return false
    const data = (await r.json()) as { permissions?: string[] }
    return Array.isArray(data.permissions) && data.permissions.includes(ADMIN_TRANSLATE_PERM)
  } catch {
    return false
  }
}

async function resolveDeepseekConfig(
  token: string,
): Promise<{ apiKey: string; model: string; url: string; timeoutMs: number } | null> {
  const apiBase = apiOriginForFetch()
  let settings: Record<string, unknown> | null = null
  if (apiBase) {
    try {
      const r = await fetch(`${apiBase}/api/v1/site/settings?scope=platform&key=ai`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      })
      if (r.ok) {
        const data = (await r.json()) as { settings?: Array<{ value_json?: string }> }
        const row = data.settings?.[0]
        if (row?.value_json) {
          settings = JSON.parse(row.value_json) as Record<string, unknown>
        }
      }
    } catch {
      settings = null
    }
  }

  const timeoutMs = resolveTranslatorTimeoutMs(settings)

  const envKey = process.env.DEEPSEEK_API_KEY?.trim()
  if (envKey) {
    return {
      apiKey: envKey,
      model: process.env.DEEPSEEK_MODEL?.trim() || 'deepseek-chat',
      url:
        process.env.DEEPSEEK_API_URL?.trim() ||
        'https://api.deepseek.com/v1/chat/completions',
      timeoutMs,
    }
  }

  if (!apiBase || !settings) return null
  const j = settings
  const k = typeof j.deepseek_api_key === 'string' ? j.deepseek_api_key.trim() : ''
  if (!k) return null
  return {
    apiKey: k,
    model:
      typeof j.deepseek_model === 'string' && j.deepseek_model.trim()
        ? j.deepseek_model.trim()
        : 'deepseek-chat',
    url:
      typeof j.deepseek_api_url === 'string' && j.deepseek_api_url.trim()
        ? j.deepseek_api_url.trim()
        : 'https://api.deepseek.com/v1/chat/completions',
    timeoutMs,
  }
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const token = cookieStore.get('travel_auth_token')?.value
  if (!token) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  if (!(await userHasAdminTranslate(token))) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const rl = checkRateLimit(rateLimitKey(req, token))
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'rate_limited', retryAfterSec: rl.retryAfterSec },
      {
        status: 429,
        headers: rl.retryAfterSec
          ? { 'Retry-After': String(rl.retryAfterSec) }
          : undefined,
      },
    )
  }

  const len = req.headers.get('content-length')
  if (len) {
    const n = Number.parseInt(len, 10)
    if (Number.isFinite(n) && n > MAX_BODY_BYTES) {
      return NextResponse.json(
        { error: 'body_too_large', maxBytes: MAX_BODY_BYTES },
        { status: 413 },
      )
    }
  }

  const cfg = await resolveDeepseekConfig(token)
  if (!cfg) {
    return NextResponse.json(
      {
        error: 'ai_not_configured',
        message:
          'DEEPSEEK_API_KEY ortam değişkeni tanımlı değil veya Ayarlar → Yapay zeka bölümünde anahtar kayıtlı değil.',
      },
      { status: 503 },
    )
  }

  let body: TranslateBody
  try {
    body = (await req.json()) as TranslateBody
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  const rawContext = body.context
  if (rawContext !== undefined && rawContext !== null) {
    if (typeof rawContext !== 'string' || !VALID_CONTEXTS.has(rawContext)) {
      return NextResponse.json({ error: 'invalid_context' }, { status: 400 })
    }
  }

  const context: 'title' | 'excerpt' | 'body' | 'seo' | 'short_label' =
    rawContext === 'title' ||
    rawContext === 'excerpt' ||
    rawContext === 'seo' ||
    rawContext === 'short_label'
      ? rawContext
      : 'body'

  const { text, targetLocale: rawTarget } = body
  const sourceLocaleRaw = body.sourceLocale ?? defaultLocale

  if (!text?.trim()) {
    return NextResponse.json({ error: 'text_required' }, { status: 400 })
  }
  if (!rawTarget?.trim()) {
    return NextResponse.json({ error: 'targetLocale_required' }, { status: 400 })
  }

  const targetLocale = canonicalLocaleCode(rawTarget)
  const sourceLocale = canonicalLocaleCode(sourceLocaleRaw)

  if (!targetLocale) {
    return NextResponse.json({ error: 'invalid_targetLocale' }, { status: 400 })
  }

  if (!sourceLocale) {
    return NextResponse.json({ error: 'invalid_sourceLocale' }, { status: 400 })
  }

  if (text.length > MAX_TEXT_CHARS) {
    return NextResponse.json(
      { error: 'text_too_long', maxChars: MAX_TEXT_CHARS },
      { status: 413 },
    )
  }

  const sameLanguage = sourceLocale === targetLocale

  const contextHintTranslate =
    context === 'title'
      ? 'This is a blog post title: keep it short and compelling.'
      : context === 'excerpt'
        ? 'This is a blog excerpt: 2–3 fluent sentences.'
        : context === 'seo'
          ? 'This is SEO meta text: concise and keyword-aware.'
          : context === 'short_label'
            ? 'This is a SHORT travel/booking UI text (a label, attribute, feature or house-rule sentence, typically 1-15 words) used in a vacation rental / villa platform. Examples: "Ek Temizlik" → "Extra Cleaning"; "Havuz ısıtma" → "Pool Heating"; "Tüp Kullanımı" → "Gas Bottle Usage"; "Ulaşım Hizmeti" → "Transfer Service"; "Erken Rezervasyon" → "Early Booking"; "İçeride sigara içilmez" → "No smoking indoors"; "Evcil hayvan kabul edilmez" → "Pets not allowed"; "Etkinlik / parti yasak" → "No events or parties". Translate the literal meaning faithfully; keep it concise; use natural sentence-case for short rules and Title Case for short labels where appropriate; do NOT invent extra words; do NOT add quotes, surrounding punctuation, parentheses or commentary; do NOT translate brand names. Output ONLY the translated text, nothing else.'
            : 'This is blog HTML body: preserve tags and structure; translate visible text only.'

  const slug = typeof body.pageSlug === 'string' ? body.pageSlug.trim() : ''
  const linkHint =
    slug !== ''
      ? `The destination page URL path is /${slug}. When adding internal links, use relative paths starting with / (e.g. /${slug}/... or sibling paths).`
      : 'When adding internal links, use plausible relative paths starting with /.'

  const polishSystemPrompt = (() => {
    const langName = localeName(targetLocale)
    switch (context) {
      case 'title':
        return `You are a professional travel SEO copywriter writing in ${langName}. Improve the given region or destination title: fix grammar and spelling, follow capitalization norms for ${langName}, keep it concise (max 70 characters). Return only the improved title — no quotes, labels, or explanation.`
      case 'seo':
        return `You are an SEO specialist writing in ${langName}. Improve this meta title or meta description for a travel destination: natural wording, relevant keywords, respect typical length (title ~70 chars, description ~160 chars when the input looks like a description). Return only the improved text, no prefixes.`
      case 'excerpt':
        return `You are a professional editor writing in ${langName}. Improve this short excerpt: grammar, clarity, SEO-friendly phrasing. Return only the improved text.`
      case 'short_label':
        return `You are a UI copywriter writing in ${langName}. Improve this short label (max 4 words) used in a vacation rental UI: fix capitalization and grammar; keep it concise. Return only the improved label, no quotes or commentary.`
      case 'body':
      default:
        return `You are an SEO editor writing in ${langName}. Improve the HTML: fix grammar and readability; wrap 2–4 important phrases in <strong>...</strong>; add 2–5 relevant internal links with <a href="...">. ${linkHint} Preserve valid HTML structure (p, br, ul, li, headings). Return only the HTML fragment — no markdown fences or commentary.`
    }
  })()

  const systemPrompt = sameLanguage
    ? polishSystemPrompt
    : `You are a professional translator. Translate from ${localeName(sourceLocale)} into ${localeName(targetLocale)}. ${contextHintTranslate} Return only the translation, no explanations or notes.`

  const maxTokens = maxTokensForContext(context)

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), cfg.timeoutMs)
  try {
    const res = await fetch(cfg.url, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify({
        model: cfg.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text.trim() },
        ],
        temperature: 0.3,
        max_tokens: maxTokens,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('[ai-translate] DeepSeek error:', res.status, err)
      return NextResponse.json({ error: 'deepseek_error', status: res.status }, { status: 502 })
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    const translated = data.choices?.[0]?.message?.content?.trim() ?? ''

    return NextResponse.json({ translated })
  } catch (e) {
    const name = e instanceof Error ? e.name : ''
    if (name === 'AbortError') {
      return NextResponse.json({ error: 'upstream_timeout', timeoutMs: cfg.timeoutMs }, { status: 504 })
    }
    console.error('[ai-translate] fetch error:', e)
    return NextResponse.json({ error: 'network_error' }, { status: 502 })
  } finally {
    clearTimeout(timeoutId)
  }
}
