import { promises as fs } from 'node:fs'
import path from 'node:path'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdminCookie } from '@/lib/api-require-admin'
import { normalizeLocalizedText, type LocalizedText } from '@/lib/sliders-i18n'

/**
 * Slider & banner yapılandırmaları — sayfa anahtarına göre JSON olarak
 * `public/sliders/{pageKey}.json` altında saklanır. Ön yüz, ilgili sayfa
 * yüklenirken bu dosyaya bakar.
 *
 * Metin alanları çoklu dil desteklidir: `{ tr: "...", en: "...", ... }`.
 * Eski string formatı yüklendiğinde otomatik olarak `{tr: value}`'ya
 * migrate edilir.
 */

const DATA_DIR = path.join(process.cwd(), 'public', 'sliders')

export type SliderTextAlign = 'left' | 'center' | 'right'
export type SliderTextTheme = 'light' | 'dark'

export interface SliderItem {
  id: string
  enabled: boolean
  /** Üst etiket (örn. "Yaz Kampanyası") — locale → metin */
  eyebrow?: LocalizedText
  /** Başlık — locale → metin */
  title?: LocalizedText
  /** Açıklama — locale → metin */
  subtitle?: LocalizedText
  /** CTA buton metni — locale → metin */
  ctaText?: LocalizedText
  /** CTA bağlantısı — tüm dillerde aynı (yerelleştirme `prefixLocale` ile yapılır) */
  ctaHref?: string
  /** Masaüstü görsel (1920×1080 önerilir) */
  imageUrl?: string
  /** Mobil için ayrı görsel (opsiyonel; yoksa imageUrl kullanılır) */
  mobileImageUrl?: string
  /** Karartma yüzdesi 0..80 — okunabilirlik için */
  overlay?: number
  /** Yazı rengi teması */
  textTheme?: SliderTextTheme
  /** Yazı hizası */
  align?: SliderTextAlign
}

export interface SlidersConfig {
  /** Slaytlar arası geçiş süresi (ms). 0 → otomatik geçiş kapalı */
  autoplayMs: number
  /** Yükseklik sınıfı: short/normal/tall */
  height: 'short' | 'normal' | 'tall'
  /** Yön/ok düğmelerini göster */
  showArrows: boolean
  /** Alt nokta göstergesi */
  showDots: boolean
  slides: SliderItem[]
  updatedAt: string
}

const DEFAULT_CONFIG: Omit<SlidersConfig, 'updatedAt'> = {
  autoplayMs: 6000,
  height: 'normal',
  showArrows: true,
  showDots: true,
  slides: [],
}

function safePageKey(raw: string | null): string {
  if (!raw) return ''
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 96)
}

function filePath(pageKey: string): string {
  const resolved = path.join(DATA_DIR, `${pageKey}.json`)
  const normalizedRoot = path.normalize(DATA_DIR)
  if (!resolved.startsWith(normalizedRoot)) {
    throw new Error('invalid path')
  }
  return resolved
}

async function ensureDir(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true })
}

function sanitizeSlide(raw: Record<string, unknown>, idx: number): SliderItem {
  const overlayRaw = Number(raw.overlay)
  const overlay = Number.isFinite(overlayRaw)
    ? Math.min(80, Math.max(0, Math.round(overlayRaw)))
    : 35
  const align: SliderTextAlign =
    raw.align === 'left' || raw.align === 'right' ? (raw.align as SliderTextAlign) : 'center'
  const textTheme: SliderTextTheme = raw.textTheme === 'dark' ? 'dark' : 'light'
  return {
    id:
      typeof raw.id === 'string' && raw.id.length > 0
        ? raw.id
        : `slide-${idx}-${Date.now()}`,
    enabled: raw.enabled !== false,
    eyebrow: normalizeLocalizedText(raw.eyebrow),
    title: normalizeLocalizedText(raw.title),
    subtitle: normalizeLocalizedText(raw.subtitle),
    ctaText: normalizeLocalizedText(raw.ctaText),
    ctaHref: typeof raw.ctaHref === 'string' ? raw.ctaHref.slice(0, 500) : '',
    imageUrl: typeof raw.imageUrl === 'string' ? raw.imageUrl.slice(0, 500) : '',
    mobileImageUrl:
      typeof raw.mobileImageUrl === 'string' ? raw.mobileImageUrl.slice(0, 500) : '',
    overlay,
    textTheme,
    align,
  }
}

function sanitizeConfig(body: Record<string, unknown>): Omit<SlidersConfig, 'updatedAt'> {
  const autoplayRaw = Number(body.autoplayMs)
  const autoplayMs = Number.isFinite(autoplayRaw)
    ? Math.min(30000, Math.max(0, Math.round(autoplayRaw)))
    : DEFAULT_CONFIG.autoplayMs
  const height: SlidersConfig['height'] =
    body.height === 'short' || body.height === 'tall'
      ? (body.height as SlidersConfig['height'])
      : 'normal'
  const slides = Array.isArray(body.slides)
    ? (body.slides as Array<Record<string, unknown>>)
        .slice(0, 50)
        .map((s, i) => sanitizeSlide((s ?? {}) as Record<string, unknown>, i))
    : []
  return {
    autoplayMs,
    height,
    showArrows: body.showArrows !== false,
    showDots: body.showDots !== false,
    slides,
  }
}

/** GET /api/sliders?page=homepage */
export async function GET(req: NextRequest) {
  const pageKey = safePageKey(req.nextUrl.searchParams.get('page'))
  if (!pageKey) {
    return NextResponse.json({ ok: false, error: 'page param required' }, { status: 400 })
  }
  try {
    const raw = await fs.readFile(filePath(pageKey), 'utf-8')
    const parsed = JSON.parse(raw) as Record<string, unknown>
    // Disktekiler eski tek dilli format olabilir → normalize ederek döndür.
    const sanitized = sanitizeConfig(parsed)
    const config: SlidersConfig = {
      ...sanitized,
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : '',
    }
    return NextResponse.json({ ok: true, config })
  } catch {
    return NextResponse.json({
      ok: true,
      config: { ...DEFAULT_CONFIG, updatedAt: '' } as SlidersConfig,
    })
  }
}

/** POST /api/sliders?page=homepage */
export async function POST(req: NextRequest) {
  const authErr = await requireAdminCookie()
  if (authErr) return authErr

  const pageKey = safePageKey(req.nextUrl.searchParams.get('page'))
  if (!pageKey) {
    return NextResponse.json({ ok: false, error: 'page param required' }, { status: 400 })
  }

  try {
    const body = (await req.json()) as Record<string, unknown>
    const sanitized = sanitizeConfig(body)
    const config: SlidersConfig = { ...sanitized, updatedAt: new Date().toISOString() }
    await ensureDir()
    await fs.writeFile(filePath(pageKey), JSON.stringify(config, null, 2), 'utf-8')
    return NextResponse.json({ ok: true, config })
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}

/** DELETE /api/sliders?page=homepage — yapılandırmayı sıfırlar */
export async function DELETE(req: NextRequest) {
  const authErr = await requireAdminCookie()
  if (authErr) return authErr

  const pageKey = safePageKey(req.nextUrl.searchParams.get('page'))
  if (!pageKey) {
    return NextResponse.json({ ok: false, error: 'page param required' }, { status: 400 })
  }
  try {
    await fs.unlink(filePath(pageKey))
  } catch {
    // dosya yoksa sessiz geç
  }
  return NextResponse.json({ ok: true })
}
